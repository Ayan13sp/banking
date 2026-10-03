"""
Pydantic Schemas (Request / Response)
=====================================
These models define the API contract between the FastAPI backend and the
Next.js frontend.  Pydantic v2 is used for serialisation and validation.
"""

from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# REQUEST SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    """Request body for the /api/analyze endpoint."""
    ticker: str = Field(
        ...,
        example="RELIANCE.NS",
        description="Yahoo Finance ticker symbol",
    )
    years: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Years of historical data to fetch",
    )


class BacktestRequest(BaseModel):
    """Request body for the /api/backtest endpoint."""
    ticker: str = Field(..., example="RELIANCE.NS")
    capital: float = Field(
        default=100_000.0,
        gt=0,
        description="Starting capital in INR",
    )


# ═══════════════════════════════════════════════════════════════════════════
# RESPONSE SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════

class MarketDataPoint(BaseModel):
    """A single day's OHLCV + all 16 engineered features."""
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: float
    sma_14: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_14: Optional[float] = None
    ema_20: Optional[float] = None
    ema_50: Optional[float] = None
    rsi_14: Optional[float] = None
    macd_line: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None
    bb_upper: Optional[float] = None
    bb_lower: Optional[float] = None
    atr_14: Optional[float] = None
    daily_return_vol: Optional[float] = None
    volume_ratio: Optional[float] = None
    volume_change: Optional[float] = None
    target: Optional[int] = None


class PredictionDetail(BaseModel):
    """ML prediction for a single date."""
    date: date
    signal: int = Field(description="1 = Buy, 0 = Sell/Hold")
    confidence: float = Field(description="Model confidence (0.0 – 1.0)")


class FeatureImportance(BaseModel):
    """Importance score for a single feature."""
    feature: str
    importance: float


class ClassificationMetrics(BaseModel):
    """Standard ML classification metrics."""
    accuracy: float
    precision: float
    recall: float


class ModelMetrics(BaseModel):
    """Metrics for a single model in the comparison."""
    accuracy: float
    precision: float
    recall: float


class DailyCumulative(BaseModel):
    """A single day's cumulative return data point for charting."""
    date: str
    ml_cumulative: float
    bh_cumulative: float


class BacktestResult(BaseModel):
    """Results of the backtesting simulation."""
    starting_capital: float
    ml_final_value: float
    bh_final_value: float
    ml_return_pct: float
    bh_return_pct: float
    sharpe_ratio: float
    daily_cumulative: List[DailyCumulative] = Field(
        description="List of daily cumulative return data points for charting",
    )


class AnalysisResponse(BaseModel):
    """
    Complete response from the /api/analyze endpoint.
    Bundles market data, predictions, metrics, and backtest results
    into a single payload for the frontend dashboard.
    """
    ticker: str
    data_points: int
    train_size: int
    test_size: int
    date_range: Dict[str, str]  # {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD"}
    market_data: List[MarketDataPoint]
    predictions: List[PredictionDetail]
    latest_prediction: Optional[PredictionDetail] = None
    metrics: ClassificationMetrics
    feature_importances: List[FeatureImportance]
    backtest: BacktestResult
    best_model: str = Field(
        description="Name of the best-performing model (Random Forest, Logistic Regression, or SVM)"
    )
    all_model_metrics: Dict[str, ModelMetrics] = Field(
        default_factory=dict,
        description="Metrics for each of the 3 compared models"
    )


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str = "algorithmic-market-analyzer"
