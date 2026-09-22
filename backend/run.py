"""Startup helper — run from the project root: python3 backend/run.py"""
import sys
import os

# Ensure the backend directory is on the import path.
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

import uvicorn  # noqa: E402

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
