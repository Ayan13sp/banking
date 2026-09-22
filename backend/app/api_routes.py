"""
API Routes
==========
REST endpoints for the Algorithmic Market Analyzer.

| Method | Endpoint               | Description                                    |
|--------|------------------------|------------------------------------------------|
| POST   | /api/analyze           | Full pipeline: fetch → features → train → test |
| GET    | /api/market-data/{tkr} | Stored OHLCV + features for charting           |
| GET    | /api/predictions/{tkr} | Latest prediction + confidence                 |
| POST   | /api/backtest          | Run backtest with custom capital                |
| GET    | /api/health            | Service health check                           |
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import get_db
from app.ml_engine import run_full_analysis
from app.models import MarketData, ModelPrediction
from app.schemas import (
    AnalysisResponse,
    AnalyzeRequest,
    BacktestRequest,
    BacktestResult,
    HealthResponse,
    MarketDataPoint,
    PredictionDetail,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Market Analysis"])


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/analyze — Full Pipeline
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_ticker(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """
    Run the complete analysis pipeline for a given ticker:
    data acquisition → feature engineering → ML training → backtesting.

    Returns all data the frontend needs to render the dashboard.
    """
    try:
        result = run_full_analysis(
            ticker=request.ticker,
            years=request.years,
            capital=settings.DEFAULT_STARTING_CAPITAL,
            db=db,
        )
        return AnalysisResponse(**result)
    except Exception as e:
        logger.exception("Analysis failed for %s", request.ticker)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/market-data/{ticker} — Historical Data
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/market-data/{ticker}", response_model=List[MarketDataPoint])
def get_market_data(ticker: str, db: Session = Depends(get_db)):
    """
    Retrieve stored OHLCV + engineered features for a ticker.
    Used by the frontend charting components.
    """
    rows = (
        db.query(MarketData)
        .filter(MarketData.ticker == ticker)
        .order_by(MarketData.date)
        .all()
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for ticker '{ticker}'. Run /api/analyze first.",
        )

    return [
        MarketDataPoint(
            date=r.date,
            open=r.open_price,
            high=r.high_price,
            low=r.low_price,
            close=r.close_price,
            volume=r.volume,
            sma_14=r.sma_14,
            sma_50=r.sma_50,
            ema_14=r.ema_14,
            ema_50=r.ema_50,
            rsi_14=r.rsi_14,
            bb_upper=r.bb_upper,
            bb_lower=r.bb_lower,
            target=r.target,
        )
        for r in rows
    ]


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/predictions/{ticker} — Latest Predictions
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/predictions/{ticker}", response_model=List[PredictionDetail])
def get_predictions(ticker: str, db: Session = Depends(get_db)):
    """
    Retrieve model predictions for a ticker, ordered by date.
    """
    rows = (
        db.query(ModelPrediction)
        .filter(ModelPrediction.ticker == ticker)
        .order_by(ModelPrediction.prediction_date)
        .all()
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No predictions found for '{ticker}'. Run /api/analyze first.",
        )

    return [
        PredictionDetail(
            date=r.prediction_date,
            signal=r.predicted_signal,
            confidence=r.confidence_score,
        )
        for r in rows
    ]


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/sql-analytics/{ticker} — Complex SQL Demo
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/sql-analytics/{ticker}")
def get_sql_analytics(ticker: str, db: Session = Depends(get_db)):
    """
    Demonstrates the complex SQL window functions used in this project
    to compute moving averages and rolling aggregations directly in the database,
    as mentioned in the interview.
    """
    query = text(\"\"\"
        SELECT 
            date,
            close_price,
            AVG(close_price) OVER (
                PARTITION BY ticker 
                ORDER BY date 
                ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
            ) as sql_sma_14,
            AVG(close_price) OVER (
                PARTITION BY ticker 
                ORDER BY date 
                ROWS BETWEEN 49 PRECEDING AND CURRENT ROW
            ) as sql_sma_50
        FROM market_data
        WHERE ticker = :ticker
        ORDER BY date DESC
        LIMIT 100
    \"\"\")
    result = db.execute(query, {"ticker": ticker}).fetchall()
    
    if not result:
        raise HTTPException(status_code=404, detail="No data found for the ticker.")
        
    return [
        {
            "date": row.date,
            "close_price": row.close_price,
            "sql_sma_14": round(row.sql_sma_14, 2) if row.sql_sma_14 else None,
            "sql_sma_50": round(row.sql_sma_50, 2) if row.sql_sma_50 else None
        }
        for row in result
    ]


# ═══════════════════════════════════════════════════════════════════════════
# POST /api/backtest — Custom Backtest
# ═══════════════════════════════════════════════════════════════════════════

@router.post("/backtest", response_model=BacktestResult)
def run_backtest_endpoint(
    request: BacktestRequest,
    db: Session = Depends(get_db),
):
    """
    Run a backtest with a custom starting capital.
    Requires that /api/analyze has been called first for this ticker.
    """
    try:
        result = run_full_analysis(
            ticker=request.ticker,
            years=settings.DEFAULT_LOOKBACK_YEARS,
            capital=request.capital,
            db=db,
        )
        return BacktestResult(**result["backtest"])
    except Exception as e:
        logger.exception("Backtest failed for %s", request.ticker)
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════════════════
# GET /api/health — Health Check
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/health", response_model=HealthResponse)
def health_check():
    """Simple health check for monitoring and load balancer probes."""
    return HealthResponse()
