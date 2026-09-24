import subprocess
import sys
from pathlib import Path


def run_migrations() -> None:
    backend_dir = Path(__file__).resolve().parent.parent
    cmd = [sys.executable, "-m", "alembic", "upgrade", "head"]
    result = subprocess.run(cmd, cwd=backend_dir)
    sys.exit(result.returncode)


if __name__ == "__main__":
    run_migrations()
