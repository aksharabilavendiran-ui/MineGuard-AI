# MineGuard AI architecture

```mermaid
flowchart LR
  Nodes[Wireless mesh nodes] --> Simulator[Sensor simulator]
  Simulator --> API[Express + Socket.IO API]
  API --> Store[TimescaleDB / demo store]
  API --> ML[FastAPI Isolation Forest]
  API --> UI[React GIS dashboard]
  API --> Alerts[In-app + SMS/email adapters]
```

The prototype keeps an in-memory store as a zero-setup fallback. The Compose stack provisions TimescaleDB for the next persistence increment and exposes the same data contract to the UI.
