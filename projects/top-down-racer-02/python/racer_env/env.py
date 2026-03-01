import json
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from .bridge_client import BridgeClient


def _load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    """Load AI config from JSON file. Returns dict matching AiConfig schema."""
    if config_path is None:
        config_path = Path(__file__).parent.parent / "ai-config.json"
    config_path = Path(config_path)
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")
    with config_path.open() as f:
        return json.load(f)


class RacerEnv(gym.Env):
    """Gymnasium environment for the top-down racer, communicating via WebSocket bridge."""

    metadata = {"render_modes": []}

    def __init__(
        self,
        bridge_url: str = "ws://localhost:9876",
        config_path: str | Path | None = None,
        track_id: str = "track-01",
        render_mode: str | None = None,
    ) -> None:
        super().__init__()
        self.render_mode = render_mode

        # Action space: [steer, throttle, brake]
        self.action_space = spaces.Box(
            low=np.array([-1.0, 0.0, 0.0], dtype=np.float32),
            high=np.array([1.0, 1.0, 1.0], dtype=np.float32),
            dtype=np.float32,
        )

        # 14-value observation vector with per-component bounds
        # Rays [0-8]: [0,1], Speed [9]: [0,1], Yaw [10]: [-1,1],
        # Steer [11]: [-1,1], Progress [12]: [0,1], Centerline [13]: [0,1]
        obs_low = np.array(
            [0.0] * 9 + [0.0, -1.0, -1.0, 0.0, 0.0], dtype=np.float32
        )
        obs_high = np.ones(14, dtype=np.float32)
        self.observation_space = spaces.Box(
            low=obs_low, high=obs_high, dtype=np.float32
        )

        self._bridge: BridgeClient | None = BridgeClient(bridge_url)
        self._config = _load_config(config_path)
        self._track_id = track_id

    def reset(
        self,
        *,
        seed: int | None = None,
        options: dict[str, Any] | None = None,
    ) -> tuple[np.ndarray, dict[str, Any]]:
        super().reset(seed=seed)
        if self._bridge is None:
            raise RuntimeError("Environment is closed")
        result = self._bridge.send_reset(
            config=self._config, track_id=self._track_id
        )
        obs = np.array(result["observation"], dtype=np.float32)
        info: dict[str, Any] = result.get("info", {})
        return obs, info

    def step(
        self, action: np.ndarray
    ) -> tuple[np.ndarray, float, bool, bool, dict[str, Any]]:
        if self._bridge is None:
            raise RuntimeError("Environment is closed")
        action_list: list[float] = action.tolist()
        result = self._bridge.send_step(action_list)
        obs = np.array(result["observation"], dtype=np.float32)
        reward = float(result["reward"])
        terminated = bool(result["terminated"])
        truncated = bool(result["truncated"])
        info: dict[str, Any] = result.get("info", {})
        return obs, reward, terminated, truncated, info

    def close(self) -> None:
        if self._bridge is not None:
            self._bridge.send_close()
            self._bridge = None
