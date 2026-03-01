import json
import socket
from typing import Any

import websocket


class BridgeClient:
    """Synchronous WebSocket RPC client for the Node.js bridge server."""

    def __init__(self, url: str = "ws://localhost:9876") -> None:
        self._url = url
        self._ws: websocket.WebSocket | None = None
        self._connect()

    def _connect(self) -> None:
        try:
            self._ws = websocket.create_connection(
                self._url,
                timeout=10,
                sockopt=((socket.IPPROTO_TCP, socket.TCP_NODELAY, 1),),
                skip_utf8_validation=True,
                enable_multithread=False,
            )
        except (OSError, websocket.WebSocketException) as e:
            raise ConnectionError(
                f"Cannot connect to bridge server at {self._url} -- is it running? ({e})"
            ) from e

    def _send_recv(self, message: dict[str, Any]) -> dict[str, Any]:
        if self._ws is None:
            raise RuntimeError("BridgeClient is not connected")
        self._ws.send(json.dumps(message))
        try:
            response = self._ws.recv()
        except websocket.WebSocketTimeoutException:
            raise RuntimeError(
                "Bridge server did not respond within 30 seconds"
            )
        result: dict[str, Any] = json.loads(response)
        if result.get("type") == "error":
            raise RuntimeError(f"Bridge error: {result.get('message')}")
        return result

    def send_reset(
        self,
        config: dict[str, Any] | None = None,
        track_id: str | None = None,
    ) -> dict[str, Any]:
        msg: dict[str, Any] = {"type": "reset"}
        if config is not None:
            msg["config"] = config
        if track_id is not None:
            msg["trackId"] = track_id
        return self._send_recv(msg)

    def send_step(self, action: list[float]) -> dict[str, Any]:
        return self._send_recv({"type": "step", "action": action})

    def send_close(self) -> None:
        try:
            if self._ws is not None:
                self._send_recv({"type": "close"})
        except Exception:
            pass
        finally:
            if self._ws is not None:
                self._ws.close()
                self._ws = None

    def __enter__(self) -> "BridgeClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.send_close()
