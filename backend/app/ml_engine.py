"""
ML Engine — Core Quantitative Logic
====================================
Refactored from the standalone market_analyzer.py into a service layer
that the FastAPI routes call.  All functions return structured data
instead of printing to stdout.

Pipeline:
    1. fetch_and_store()  – downloads OHLCV via yfinance, engineers features,
                            bulk-upserts into the MarketData table.
    2. train_and_predict() – loads data from DB, trains Random Forest,
                             returns predictions + metrics + importances.
    3. run_backtest()      – simulates ML strategy vs Buy-and-Hold.
"""

import logging
import warnings
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import RandomizedSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sqlalchemy.orm import Session

from app.config import settings
from app.models import MarketData, ModelPrediction

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

# Features used by the Random Forest model.
FEATURE_COLS = [
    "sma_14", "sma_50", "sma_200",
    "ema_14", "ema_20", "ema_50",
    "rsi_14",
    "macd_line", "macd_signal", "macd_hist",
    "bb_upper", "bb_lower", "atr_14", "daily_return_vol",
    "volume_ratio", "volume_change",
]


# ═══════════════════════════════════════════════════════════════════════════
# STATISTICAL INDICATOR FUNCTIONS (unchanged from market_analyzer.py)
# ═══════════════════════════════════════════════════════════════════════════

def compute_sma(series: pd.Series, window: int) -> pd.Series:
    """Simple Moving Average — unweighted mean of the last `window` prices."""
    return series.rolling(window=window).mean()


def compute_ema(series: pd.Series, span: int) -> pd.Series:
    """
    Exponential Moving Average — gives exponentially decreasing weights
    to older observations, more responsive to recent changes than SMA.
    """
    return series.ewm(span=span, adjust=False).mean()


def compute_rsi(series: pd.Series, window: int = 14) -> pd.Series:
    """
    Relative Strength Index (RSI) — momentum oscillator (0–100).

    RSI = 100 - (100 / (1 + RS))
    RS  = avg_gain / avg_loss  over `window` periods (Wilder method).

    RSI > 70 → overbought (sell signal)
    RSI < 30 → oversold   (buy signal)
    """
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def compute_bollinger_bands(
    series: pd.Series, window: int = 20, num_std: int = 2
) -> Tuple[pd.Series, pd.Series]:
    """
    Bollinger Bands — volatility indicator.
        Upper = SMA(window) + num_std × σ(window)
        Lower = SMA(window) - num_std × σ(window)
    """
    sma = series.rolling(window=window).mean()
    std = series.rolling(window=window).std()
    return sma + num_std * std, sma - num_std * std


def compute_macd(series: pd.Series) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """MACD, Signal, and Histogram."""
    ema_12 = series.ewm(span=12, adjust=False).mean()
    ema_26 = series.ewm(span=26, adjust=False).mean()
    macd_line = ema_12 - ema_26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    macd_hist = macd_line - signal_line
    return macd_line, signal_line, macd_hist

def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    """Average True Range (Volatility)."""
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return tr.rolling(window=window).mean()

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add all 15+ statistical indicators and the binary target variable."""
    close = df["close_price"]

    df["sma_14"] = compute_sma(close, 14)
    df["sma_50"] = compute_sma(close, 50)
    df["sma_200"] = compute_sma(close, 200)
    
    df["ema_14"] = compute_ema(close, 14)
    df["ema_20"] = compute_ema(close, 20)
    df["ema_50"] = compute_ema(close, 50)
    
    df["rsi_14"] = compute_rsi(close, 14)
    df["macd_line"], df["macd_signal"], df["macd_hist"] = compute_macd(close)
    
    df["bb_upper"], df["bb_lower"] = compute_bollinger_bands(close, 20, 2)
    df["atr_14"] = compute_atr(df["high_price"], df["low_price"], close, 14)
    df["daily_return_vol"] = close.pct_change().rolling(20).std()
    
    vol_sma_20 = compute_sma(df["volume"], 20)
    df["volume_ratio"] = df["volume"] / vol_sma_20
    df["volume_change"] = df["volume"].pct_change()

    # Target: 1 (Buy) if tomorrow's close > today's, else 0 (Sell/Hold).
    df["target"] = (close.shift(-1) > close).astype(int)

    df.dropna(inplace=True)
    return df


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 — DATA ACQUISITION & STORAGE
# ═══════════════════════════════════════════════════════════════════════════

def fetch_and_store(
    ticker: str,
    years: int,
    db: Session,
) -> pd.DataFrame:
    """
    Download OHLCV data from Yahoo Finance, engineer features, and
    upsert all rows into the MarketData table.

    Returns the cleaned DataFrame (with features) for downstream use.
    """
    end_date = datetime.today()
    start_date = end_date - timedelta(days=years * 365)

    logger.info("Downloading %dY data for %s", years, ticker)
    raw = yf.download(ticker, start=start_date, end=end_date, progress=False)

    # Flatten multi-level columns if present.
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)

    # Standardise column names to match our ORM fields.
    raw = raw[["Open", "High", "Low", "Close", "Volume"]].copy()
    raw.columns = ["open_price", "high_price", "low_price", "close_price", "volume"]
    raw.index = pd.to_datetime(raw.index)
    raw.sort_index(inplace=True)

    # Handle missing data.
    raw.ffill(inplace=True)
    raw.bfill(inplace=True)
    raw.dropna(inplace=True)

    # Engineer statistical features.
    df = engineer_features(raw)

    # ── Bulk upsert into database ─────────────────────────────────────────
    # Delete existing rows for this ticker, then insert fresh data.
    # This is simpler and safer than per-row upsert for a batch pipeline.
    db.query(MarketData).filter(MarketData.ticker == ticker).delete()

    records = []
    for idx, row in df.iterrows():
        records.append(
            MarketData(
                ticker=ticker,
                date=idx.date(),
                open_price=float(row["open_price"]),
                high_price=float(row["high_price"]),
                low_price=float(row["low_price"]),
                close_price=float(row["close_price"]),
                volume=float(row["volume"]),
                sma_14=float(row["sma_14"]),
                sma_50=float(row["sma_50"]),
                sma_200=float(row["sma_200"]),
                ema_14=float(row["ema_14"]),
                ema_20=float(row["ema_20"]),
                ema_50=float(row["ema_50"]),
                rsi_14=float(row["rsi_14"]),
                macd_line=float(row["macd_line"]),
                macd_signal=float(row["macd_signal"]),
                macd_hist=float(row["macd_hist"]),
                bb_upper=float(row["bb_upper"]),
                bb_lower=float(row["bb_lower"]),
                atr_14=float(row["atr_14"]),
                daily_return_vol=float(row["daily_return_vol"]),
                volume_ratio=float(row["volume_ratio"]),
                volume_change=float(row["volume_change"]),
                target=int(row["target"]),
            )
        )
    db.bulk_save_objects(records)
    db.commit()

    logger.info("Stored %d rows for %s in database", len(records), ticker)
    return df


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 — MODEL TRAINING & PREDICTION
# ═══════════════════════════════════════════════════════════════════════════

def train_and_predict(
    df: pd.DataFrame,
    ticker: str,
    db: Session,
) -> Dict[str, Any]:
    """
    Train a Random Forest on the first 80% of data (time-series split),
    predict on the last 20%, and return structured results.

    Returns a dict with keys:
        train_size, test_size, metrics, feature_importances,
        predictions, test_df
    """
    # ── Time-series split (80/20) ─────────────────────────────────────────
    split_idx = int(len(df) * 0.80)
    train = df.iloc[:split_idx].copy()
    test = df.iloc[split_idx:].copy()

    X_train = train[FEATURE_COLS]
    y_train = train["target"]
    X_test = test[FEATURE_COLS]
    y_test = test["target"]

    # ── Iterative Tuning of 3 Models ─────────────────────────────────────────
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    rf_params = {'n_estimators': [100, 200, 300], 'max_depth': [5, 10, 15]}
    rf = RandomizedSearchCV(RandomForestClassifier(random_state=42), rf_params, n_iter=3, cv=3, n_jobs=-1, random_state=42)
    rf.fit(X_train, y_train)
    rf_best = rf.best_estimator_

    lr = LogisticRegression(max_iter=1000, random_state=42)
    lr.fit(X_train_scaled, y_train)

    svm = SVC(kernel='rbf', probability=True, random_state=42)
    svm.fit(X_train_scaled, y_train)
    
    models = {
        'Random Forest': (rf_best, X_train, X_test),
        'Logistic Regression': (lr, X_train_scaled, X_test_scaled),
        'SVM': (svm, X_train_scaled, X_test_scaled)
    }

    best_acc = 0
    best_model = None
    
    for name, (model, xtr, xte) in models.items():
        y_pred = model.predict(xte)
        acc = accuracy_score(y_test, y_pred)
        if acc > best_acc:
            best_acc = acc
            best_model = model

    # Always use Random Forest for downstream pipeline consistency (feature importances)
    if not hasattr(best_model, "feature_importances_"):
        best_model = rf_best
        
    y_pred = best_model.predict(X_test)
    y_proba = best_model.predict_proba(X_test)

    # ── Classification metrics ────────────────────────────────────────────
    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
    }

    # ── Feature importances ───────────────────────────────────────────────
    importances = [
        {"feature": feat, "importance": float(imp)}
        for feat, imp in sorted(
            zip(FEATURE_COLS, best_model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    ]

    # ── Build prediction records ──────────────────────────────────────────
    predictions = []
    for i, (idx, row) in enumerate(test.iterrows()):
        signal = int(y_pred[i])
        # Confidence = probability of the predicted class.
        confidence = float(y_proba[i][signal])

        predictions.append({
            "date": idx.date(),
            "signal": signal,
            "confidence": confidence,
        })

        # Store in model_predictions table.
        db.add(
            ModelPrediction(
                ticker=ticker,
                prediction_date=idx.date(),
                predicted_signal=signal,
                confidence_score=confidence,
                actual_outcome=int(row["target"]),
            )
        )

    db.commit()
    logger.info(
        "Model tuned (RF, LR, SVM). Final selected: accuracy=%.4f, precision=%.4f, recall=%.4f",
        metrics["accuracy"], metrics["precision"], metrics["recall"],
    )

    return {
        "train_size": len(train),
        "test_size": len(test),
        "metrics": metrics,
        "feature_importances": importances,
        "predictions": predictions,
        "test_df": test,
        "y_pred": y_pred,
    }


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 — BACKTESTING
# ═══════════════════════════════════════════════════════════════════════════

def run_backtest(
    test_df: pd.DataFrame,
    y_pred: np.ndarray,
    capital: float,
) -> Dict[str, Any]:
    """
    Simulate the ML strategy vs Buy-and-Hold on the test period.

    ML Strategy:
        On 'Buy' days (prediction=1), capture intraday return = (Close-Open)/Open.
        On 'Sell/Hold' days, stay in cash (return = 0).

    Sharpe Ratio (annualised):
        Sharpe = (mean(excess_return) / std(strategy_return)) × √252
        excess_return = strategy_return - daily_risk_free_rate
    """
    test = test_df.copy()
    test["prediction"] = y_pred

    # Daily return captured by the strategy.
    test["daily_return"] = (
        (test["close_price"] - test["open_price"]) / test["open_price"]
    )
    test["strategy_return"] = test["daily_return"] * test["prediction"]

    # ── Cumulative returns ────────────────────────────────────────────────
    ml_cumulative = (1 + test["strategy_return"]).cumprod()
    ml_final_value = float(capital * ml_cumulative.iloc[-1])

    bh_return = float(test["close_price"].iloc[-1] / test["open_price"].iloc[0])
    bh_final_value = float(capital * bh_return)

    # Buy-and-Hold cumulative series for charting.
    bh_cumulative = test["close_price"] / float(test["open_price"].iloc[0])

    # ── Sharpe Ratio ──────────────────────────────────────────────────────
    daily_rf = (
        (1 + settings.RISK_FREE_RATE)
        ** (1 / settings.TRADING_DAYS_PER_YEAR)
        - 1
    )
    excess = test["strategy_return"] - daily_rf
    std = test["strategy_return"].std()
    sharpe = float(
        (excess.mean() / std) * np.sqrt(settings.TRADING_DAYS_PER_YEAR)
        if std > 0
        else 0.0
    )

    # ── Build daily cumulative series for frontend charting ───────────────
    daily_cumulative = []
    for idx, ml_val, bh_val in zip(
        test.index, ml_cumulative, bh_cumulative
    ):
        daily_cumulative.append({
            "date": idx.strftime("%Y-%m-%d"),
            "ml_cumulative": round(float(ml_val), 6),
            "bh_cumulative": round(float(bh_val), 6),
        })

    ml_return_pct = round((ml_final_value / capital - 1) * 100, 2)
    bh_return_pct = round((bh_final_value / capital - 1) * 100, 2)

    logger.info(
        "Backtest complete: ML=₹%.2f (%+.2f%%), B&H=₹%.2f (%+.2f%%), Sharpe=%.4f",
        ml_final_value, ml_return_pct, bh_final_value, bh_return_pct, sharpe,
    )

    return {
        "starting_capital": capital,
        "ml_final_value": round(ml_final_value, 2),
        "bh_final_value": round(bh_final_value, 2),
        "ml_return_pct": ml_return_pct,
        "bh_return_pct": bh_return_pct,
        "sharpe_ratio": round(sharpe, 4),
        "daily_cumulative": daily_cumulative,
    }


# ═══════════════════════════════════════════════════════════════════════════
# ORCHESTRATOR — runs the full pipeline
# ═══════════════════════════════════════════════════════════════════════════

def run_full_analysis(
    ticker: str,
    years: int,
    capital: float,
    db: Session,
) -> Dict[str, Any]:
    """
    Execute the complete pipeline: fetch → features → train → backtest.

    This is the main entry point called by the /api/analyze endpoint.
    Returns a fully structured dict ready for AnalysisResponse serialisation.
    """
    # Phase 1+2: Fetch data, engineer features, store in DB.
    df = fetch_and_store(ticker, years, db)

    # Clear old predictions for this ticker.
    db.query(ModelPrediction).filter(ModelPrediction.ticker == ticker).delete()
    db.commit()

    # Phase 3: Train model, generate predictions.
    ml_results = train_and_predict(df, ticker, db)

    # Phase 4: Backtest the strategy.
    backtest_results = run_backtest(
        ml_results["test_df"],
        ml_results["y_pred"],
        capital,
    )

    # ── Assemble market_data for the frontend ─────────────────────────────
    market_data = []
    for idx, row in df.iterrows():
        market_data.append({
            "date": idx.date(),
            "open": round(float(row["open_price"]), 2),
            "high": round(float(row["high_price"]), 2),
            "low": round(float(row["low_price"]), 2),
            "close": round(float(row["close_price"]), 2),
            "volume": float(row["volume"]),
            "sma_14": round(float(row["sma_14"]), 2),
            "sma_50": round(float(row["sma_50"]), 2),
            "sma_200": round(float(row["sma_200"]), 2),
            "ema_14": round(float(row["ema_14"]), 2),
            "ema_20": round(float(row["ema_20"]), 2),
            "ema_50": round(float(row["ema_50"]), 2),
            "rsi_14": round(float(row["rsi_14"]), 2),
            "macd_line": round(float(row["macd_line"]), 2),
            "macd_signal": round(float(row["macd_signal"]), 2),
            "macd_hist": round(float(row["macd_hist"]), 2),
            "bb_upper": round(float(row["bb_upper"]), 2),
            "bb_lower": round(float(row["bb_lower"]), 2),
            "atr_14": round(float(row["atr_14"]), 2),
            "daily_return_vol": round(float(row["daily_return_vol"]), 4),
            "volume_ratio": round(float(row["volume_ratio"]), 2),
            "volume_change": round(float(row["volume_change"]), 2),
            "target": int(row["target"]),
        })

    # Date range metadata.
    date_range = {
        "start": df.index[0].strftime("%Y-%m-%d"),
        "end": df.index[-1].strftime("%Y-%m-%d"),
    }

    # Latest prediction (most recent test date).
    latest = ml_results["predictions"][-1] if ml_results["predictions"] else None

    return {
        "ticker": ticker,
        "data_points": len(df),
        "train_size": ml_results["train_size"],
        "test_size": ml_results["test_size"],
        "date_range": date_range,
        "market_data": market_data,
        "predictions": ml_results["predictions"],
        "latest_prediction": latest,
        "metrics": ml_results["metrics"],
        "feature_importances": ml_results["feature_importances"],
        "backtest": backtest_results,
    }
