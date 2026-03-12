"""Validate RacerEnv with Gymnasium's official env_checker (AI-01)."""
from gymnasium.utils.env_checker import check_env
from racer_env import RacerEnv


def test_env_checker(bridge_server):
    """check_env must pass with no errors (AI-01)."""
    env = RacerEnv()
    try:
        check_env(env, skip_render_check=True)
    finally:
        env.close()
