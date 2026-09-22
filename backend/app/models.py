"""
SQLAlchemy ORM Models
=====================
Two tables designed to satisfy relational database requirements:

1. MarketData   – stores OHLCV + engineered features + target labels
2. ModelPrediction – stores ML predictions with confidence scores
"""

from sqlalchemy import (
    Column,
    Date,
    Float,
    Integer,
    String,
    UniqueConstraint,
)

from app.database import Base


class MarketData(Base):
    """
    Stores daily OHLCV data and engineered statistical features for each ticker.

    The unique constraint on (ticker, date) prevents duplicate rows when
    re-fetching data for the same stock.
    """

    __tablename__ = "market_data"
    __table_args__ = (
        UniqueConstraint("ticker", "date", name="uq_ticker_date"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)

    # ── Raw OHLCV ─────────────────────────────────────────────────────────
    open_price = Column(Float, nullable=False)
    high_price = Column(Float, nullable=False)
    low_price = Column(Float, nullable=False)
    close_price = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)

    # ── Engineered Features (Phase 2) ─────────────────────────────────────
    sma_14 = Column(Float, nullable=True)
    sma_50 = Column(Float, nullable=True)
    sma_200 = Column(Float, nullable=True)
    ema_14 = Column(Float, nullable=True)
    ema_20 = Column(Float, nullable=True)
    ema_50 = Column(Float, nullable=True)
    rsi_14 = Column(Float, nullable=True)
    macd_line = Column(Float, nullable=True)
    macd_signal = Column(Float, nullable=True)
    macd_hist = Column(Float, nullable=True)
    bb_upper = Column(Float, nullable=True)
    bb_lower = Column(Float, nullable=True)
    atr_14 = Column(Float, nullable=True)
    daily_return_vol = Column(Float, nullable=True)
    volume_ratio = Column(Float, nullable=True)
    volume_change = Column(Float, nullable=True)

    # ── ML Target ─────────────────────────────────────────────────────────
    target = Column(Integer, nullable=True)  # 1 = Buy, 0 = Sell/Hold

    def __repr__(self):
        return f"<MarketData({self.ticker}, {self.date}, close={self.close_price})>"


class ModelPrediction(Base):
    """
    Stores predictions made by the Random Forest model.

    confidence_score holds the probability output from predict_proba(),
    giving recruiters a clear view of how certain the model is about each signal.
    actual_outcome is filled in after the trading day to evaluate accuracy.
    """

    __tablename__ = "model_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticker = Column(String, index=True, nullable=False)
    prediction_date = Column(Date, nullable=False)
    predicted_signal = Column(Integer, nullable=False)  # 0 or 1
    confidence_score = Column(Float, nullable=False)     # 0.0 – 1.0
    actual_outcome = Column(Integer, nullable=True)      # Filled next day

    def __repr__(self):
        return (
            f"<ModelPrediction({self.ticker}, {self.prediction_date}, "
            f"signal={self.predicted_signal}, conf={self.confidence_score:.2f})>"
        )
