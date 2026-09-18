# MineGuard AI

MineGuard AI is a SIH prototype for real-time mine subsidence monitoring over underground coal panels. It simulates a wireless surface mesh, streams readings through Socket.IO, scores deformation risk, and presents an operator dashboard for alerts and response.

## Project structure

- `frontend`: React + Vite + TypeScript dashboard with a schematic GIS surface map.
- `backend`: Express REST API, Socket.IO events, JWT demo login, in-memory fallback store, and simulator loop.
- `ml-service`: FastAPI anomaly scoring service using Isolation Forest.
- `simulator`: standalone Node service heartbeat for an external sensor-feed integration point.
- `docs`: architecture diagram and database bootstrap schema.

## Run locally

### Fast demo without Docker

```sh
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Open `http://localhost:5173`. The backend runs at `http://localhost:4000` and generates 24 mesh nodes every three seconds. Use **Trigger anomaly test** to create a developing cluster event.

### Full Compose stack

Copy `.env.example` to `.env`, then run:

```sh
docker compose up --build
```

This provisions TimescaleDB, the FastAPI service, backend, simulator, and frontend. Docker is required for this path.

## Demo access

Operator: `virtualthrone@sih.in`  
Password: `virtualthrone123`

## API surface

- `GET /health`
- `GET /api/nodes`
- `GET /api/nodes/:id/readings?limit=40`
- `GET /api/alerts`
- `POST /api/alerts/:id/acknowledge`
- `POST /api/simulator/anomaly` with `{ "enabled": true }`
- `POST /api/auth/login`
- `POST /api/predict`

Socket.IO events include `snapshot`, `reading`, and `system:status`.

## Team

AHINA ROBERT · AKSHARA · DANI JOSHUA · HARIHARAN · POORANI

© Virtual Throne
