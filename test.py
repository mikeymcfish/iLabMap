"""Compatibility test entry point. Uses isolated pytest fixtures, never the live server."""
import subprocess
import sys

if __name__ == "__main__":
    raise SystemExit(subprocess.call([sys.executable, "-m", "pytest", *sys.argv[1:]]))
