from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.ensemble import IsolationForest

app = FastAPI(title="MineGuard AI prediction service")


class PredictRequest(BaseModel):
    readings: list[dict[str, Any]] = []


@app.get("/health")
def health() -> dict[str, str]:
    return {"service": "mineguard-ml", "status": "ok"}


@app.post("/predict")
def predict(payload: PredictRequest) -> dict[str, Any]:
    """Score the latest readings while keeping the model easy to replace with an LSTM later."""
    if not payload.readings:
        return {"risk": "NORMAL", "score": 0.0, "confidence": 0.5, "trend": "stable"}
    features = [[float(item.get(key, 0)) for key in ("tilt", "vibration", "displacement", "crackStrain")] for item in payload.readings]
    model = IsolationForest(contamination="auto", random_state=42)
    model.fit(features if len(features) > 1 else features + [[value * 0.98 for value in features[0]]])
    latest = features[-1]
    raw = float(-model.decision_function([latest])[0])
    score = max(0.0, min(0.99, 0.5 + raw))
    risk = "CRITICAL" if score > 0.8 else "WARNING" if score > 0.6 else "WATCH" if score > 0.4 else "NORMAL"
    trend = "accelerating" if len(features) > 1 and latest[2] > features[0][2] * 1.15 else "stable"
    return {"risk": risk, "score": round(score, 2), "confidence": round(min(0.98, 0.7 + score * 0.25), 2), "trend": trend}