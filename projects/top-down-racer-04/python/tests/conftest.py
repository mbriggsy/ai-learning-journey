"""Shared test fixtures for the racer_env test suite."""
import subprocess
import sys
import time
import platform
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent.parent

# Add the python package to sys.path for all tests
sys.path.insert(0, str(PROJECT_ROOT / "python"))


def _kill_process_tree(proc: subprocess.Popen) -> None:
    """Kill a subprocess and all its children (Windows-safe)."""
    if platform.system() == "Windows":
        # taskkill /F /T kills the entire process tree on Windows
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            capture_output=True,
        )
    else:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture(scope="session")
def bridge_server():
    """Start the Node.js bridge server for the entire test session."""
    proc = subprocess.Popen(
        ["npx", "tsx", "src/ai/run-bridge.ts"],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True,  # Required on Windows for npx
    )
    # Wait for server to be ready (look for "listening" in output)
    start = time.time()
    while time.time() - start < 15:
        line = proc.stdout.readline()
        if not line:
            # Process exited early
            raise RuntimeError("Bridge server exited before becoming ready")
        if "listening" in line.lower():
            break
    else:
        _kill_process_tree(proc)
        raise RuntimeError("Bridge server failed to start within 15 seconds")

    yield proc

    _kill_process_tree(proc)
