"""
Application Configuration
=========================
Centralised settings using pydantic-settings.

- DATABASE_URL defaults to SQLite for local development.
- Switch to PostgreSQL by setting the DATABASE_URL env var:
    export DATABASE_URL=postgresql://user:pass@host:5432/market_analyzer
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    All configuration is loaded from environment variables (or .env file).
    Defaults are provided for frictionless local development.
    """

    # ── Database ──────────────────────────────────────────────────────────
    # SQLite for local dev; PostgreSQL in Docker / Render.
    DATABASE_URL: str = "sqlite:///./market_analyzer.db"

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",    # Next.js dev server
        "http://127.0.0.1:3000",
    ]

    # Additional CORS origins from env (comma-separated).
    # Set EXTRA_CORS_ORIGINS=https://your-app.onrender.com for deployment.
    EXTRA_CORS_ORIGINS: str = ""

    # ── Financial Constants ───────────────────────────────────────────────
    RISK_FREE_RATE: float = 0.065           # Indian T-bill ~6.5 %
    TRADING_DAYS_PER_YEAR: int = 252
    DEFAULT_STARTING_CAPITAL: float = 100_000.0  # INR
    DEFAULT_LOOKBACK_YEARS: int = 5

    @property
    def all_cors_origins(self) -> List[str]:
        """Combine static and dynamic CORS origins."""
        origins = list(self.CORS_ORIGINS)
        if self.EXTRA_CORS_ORIGINS:
            origins.extend(
                o.strip() for o in self.EXTRA_CORS_ORIGINS.split(",") if o.strip()
            )
        return origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
