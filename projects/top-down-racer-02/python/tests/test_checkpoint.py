"""Checkpoint save/load integration test for AI-10.

Validates the full PPO save->load->predict pipeline and VecNormalize
round-trip. Uses minimal training (128 steps) to verify mechanics,
not convergence.
"""
import tempfile
from pathlib import Path

import numpy as np
import pytest

from racer_env import RacerEnv


def _make_env(log_dir: Path):
    """Factory function for creating a monitored RacerEnv.

    Returns a callable (not the env itself) for DummyVecEnv.
    Uses a factory to avoid the late-binding lambda closure footgun
    (per Plan 02 convention).
    """
    def _init():
        from stable_baselines3.common.monitor import Monitor
        env = RacerEnv()
        env = Monitor(env, str(log_dir))
        return env
    return _init


def _make_bare_env():
    """Factory for a bare RacerEnv (no Monitor, for inference)."""
    def _init():
        return RacerEnv()
    return _init


@pytest.mark.timeout(60)
def test_ppo_save_load_predict(bridge_server):
    """Train PPO briefly, save checkpoint, load it, and verify predict returns valid actions.

    Also verifies VecNormalize running statistics (obs_rms.mean, obs_rms.var)
    survive the save/load round-trip. Without correct normalization stats, a
    loaded model produces garbage actions because observations are on a
    different scale than what the model was trained on.
    """
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        log_dir = tmp / "logs"
        log_dir.mkdir()

        # Create env and train
        vec_env = DummyVecEnv([_make_env(log_dir)])
        vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

        model = PPO("MlpPolicy", vec_env, verbose=0, n_steps=64, batch_size=32)
        model.learn(total_timesteps=128)

        # Capture normalization stats before save (for round-trip verification)
        obs_rms_mean = vec_env.obs_rms.mean.copy()
        obs_rms_var = vec_env.obs_rms.var.copy()

        # Save model + VecNormalize stats
        model_path = tmp / "test_model"
        vecnorm_path = tmp / "test_vecnorm.pkl"
        model.save(str(model_path))
        vec_env.save(str(vecnorm_path))

        assert (tmp / "test_model.zip").exists(), "Model .zip not saved"
        assert vecnorm_path.exists(), "VecNormalize .pkl not saved"

        vec_env.close()

        # Load into a fresh env
        new_vec_env = DummyVecEnv([_make_bare_env()])
        new_vec_env = VecNormalize.load(str(vecnorm_path), new_vec_env)
        new_vec_env.training = False
        new_vec_env.norm_reward = False

        try:
            # Verify VecNormalize stats survived the round-trip
            assert np.allclose(new_vec_env.obs_rms.mean, obs_rms_mean), (
                "Observation running mean changed after save/load"
            )
            assert np.allclose(new_vec_env.obs_rms.var, obs_rms_var), (
                "Observation running variance changed after save/load"
            )

            # SECURITY: SB3 model files use pickle internally.
            # Never load models from untrusted sources.
            loaded_model = PPO.load(str(model_path), env=new_vec_env)

            # Run inference and verify actions are valid
            obs = new_vec_env.reset()
            for _ in range(2):
                action, _states = loaded_model.predict(obs, deterministic=True)
                assert action.shape == (1, 3), f"Unexpected action shape: {action.shape}"
                assert np.all(np.isfinite(action)), "Action contains NaN or Inf (model corruption)"
                obs, _, _, _ = new_vec_env.step(action)
        finally:
            new_vec_env.close()


@pytest.mark.timeout(60)
def test_ppo_resume_training(bridge_server):
    """Save a checkpoint, load it, and resume training with reset_num_timesteps=False.

    Verifies the timestep counter continues from where it left off, which is
    critical for TensorBoard x-axis continuity and CheckpointCallback naming.
    """
    from stable_baselines3 import PPO
    from stable_baselines3.common.vec_env import DummyVecEnv, VecNormalize

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        log_dir = tmp / "logs"
        log_dir.mkdir()

        vec_env = DummyVecEnv([_make_env(log_dir)])
        vec_env = VecNormalize(vec_env, norm_obs=True, norm_reward=True, clip_obs=10.0)

        # Initial training
        model = PPO("MlpPolicy", vec_env, verbose=0, n_steps=64, batch_size=32)
        model.learn(total_timesteps=128)
        initial_timesteps = model.num_timesteps

        # Save
        model_path = tmp / "checkpoint"
        vecnorm_path = tmp / "vecnorm.pkl"
        model.save(str(model_path))
        vec_env.save(str(vecnorm_path))
        vec_env.close()

        # Load and resume
        new_vec_env = DummyVecEnv([_make_env(log_dir)])
        new_vec_env = VecNormalize.load(str(vecnorm_path), new_vec_env)
        new_vec_env.training = True
        new_vec_env.norm_reward = True

        try:
            resumed_model = PPO.load(str(model_path), env=new_vec_env)
            resumed_model.learn(total_timesteps=128, reset_num_timesteps=False)

            # Timestep counter should have continued, not reset
            assert resumed_model.num_timesteps > initial_timesteps, (
                f"Timestep counter should have continued from {initial_timesteps}, "
                f"but got {resumed_model.num_timesteps}"
            )
        finally:
            new_vec_env.close()
