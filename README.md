# C-ITS — Cooperative Intelligent Transportation System

A Smart City Traffic Command Center that simulates V2V (vehicle-to-vehicle)
cooperation over ordinary Internet infrastructure (WebSockets) instead of
DSRC/C-V2X radio hardware. Every "vehicle" is a browser tab running the same
React app; a FastAPI server brokers position updates between vehicles that
are near each other, and each client independently predicts collisions —
the server never touches collision logic.

This has been built and smoke-tested end-to-end in this environment
(register → login → JWT → authenticated WebSocket → nearby-vehicle
broadcast, and `npm run build` for the frontend). It's provided to you as a
runnable codebase rather than a hosted demo, because it needs things this
chat can't provision for you: a Google Maps API key (billing-gated,
per-domain), a real MongoDB instance, and multiple physical devices/browser
tabs each granting GPS permission to genuinely demo "vehicle-to-vehicle."

## Architecture

```
Vehicle A (browser) --WebSocket--\
Vehicle B (browser) --WebSocket---> FastAPI Broker --> Haversine nearby-filter --> broadcasts each vehicle only what's within 500m
Vehicle C (browser) --WebSocket--/
```

- **Vehicles never talk directly to each other.** The FastAPI server is the
  only broker.
- **The server never predicts collisions.** It stores each vehicle's latest
  state in RAM (never Mongo) and pushes each vehicle a filtered list of
  what's nearby. Every browser tab runs `collisionPrediction.js` on its own
  nearby list.
- **MongoDB is for persistence only** — users, registration, login history,
  collision/event logs. If no MongoDB is reachable, the backend
  transparently falls back to an in-process memory store (logged as a
  warning) so you can still run the whole thing locally with zero setup.
  Swap in a real `MONGO_URI` for anything beyond a demo.
- **Communication layer is isolated** in `websocket_manager.py` /
  `useWebSocket.js` specifically so it can later be swapped for MQTT,
  C-V2X, or DSRC without touching collision-prediction or UI code.

## What's implemented

- Full JWT auth: register (personal/vehicle/driver/emergency-contact
  fields), login, refresh, protected routes, bcrypt hashing, auto token
  refresh on 401 via an Axios interceptor.
- Persistent authenticated WebSocket per vehicle, heartbeat ping/pong with
  RTT measurement, auto-reconnect with backoff.
- Haversine-based 500m nearby-vehicle filtering on the server; only public
  fields (`vehicleId`, type, position, speed, heading, acceleration, brake,
  timestamp) ever leave the server — license numbers, phone, email, etc.
  never do.
- Client-side collision prediction: projects both vehicles forward 1s/2s/3s,
  finds closest approach, derives risk level (Safe / Warning / High Risk /
  Collision Imminent), a heuristic collision probability, and
  time-to-collision.
- Google Maps dashboard: self marker, nearby markers colored by risk,
  predicted "ghost" position marker, animated risk-colored lines,
  comm-radius circle, vehicle detail panel on click.
- Dashboard: connected/nearby/collision/emergency counts, average speed,
  packet counters, WebSocket status, live RTT, live clock, live event feed,
  analytics charts (speed over time, vehicle type distribution, risk
  distribution, packets/sec) via Recharts.
- Admin dashboard: connected vehicles, registered users, server stats
  (role-gated, `role: admin` at registration).
- Development Mode: generates a 30-vehicle simulated fleet client-side
  (accel/brake/turn/congestion/emergency behaviors) so one laptop is fully
  demoable alone. Production Mode shows only real WebSocket-connected
  vehicles and an explicit "No Active Vehicles" empty state.

## What you'll need to supply

1. **MongoDB**, if you want real persistence instead of the in-memory
   fallback — set `MONGO_URI` in `backend/.env` (MongoDB Atlas free tier
   works fine).
2. Multiple physical devices/tabs with GPS permission if you want to see
   genuine multi-vehicle GPS cooperation instead of Development Mode's
   simulated fleet.

Note: the map uses Leaflet + free CARTO/OpenStreetMap tiles — no API key or
billing account required at all.

## Running it

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt
cp .env.example .env        # then edit MONGO_URI / JWT_SECRET_KEY
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env         # then set VITE_GOOGLE_MAPS_API_KEY
npm run dev
```

Open the printed local URL (default `http://localhost:5173`) in one tab,
register a vehicle, log in — Development Mode will immediately populate a
simulated fleet around you. Open the same URL in another tab/device (or set
`VITE_APP_MODE=production` and connect from a second real device) to see
genuine cross-tab V2V updates over the WebSocket.

To view the admin dashboard, register with `"role": "admin"` (the register
form defaults to `driver`; either add a role selector in `Register.jsx` or
register the first admin via the API directly, then log in and visit
`/admin`).

## Known trade-offs / next steps

- JWT logout is stateless (no server-side blocklist yet) — documented in
  `auth.py`. Add a Redis-backed `jti` blocklist for real token revocation.
- The in-memory Mongo fallback is for zero-config local demos only; don't
  ship it as-is to production.
- Development Mode's simulated fleet runs client-side only (it doesn't open
  30 real authenticated WebSocket connections) so a single laptop can demo
  the whole system without spinning up fake accounts.
- Bundle isn't code-split yet (~930KB JS, noted by Vite's build warning) —
  fine for a demo, worth `React.lazy`-splitting the map/analytics
  routes before shipping.
- Traffic heatmap layer, full "Development vs Production" congestion
  simulation edge cases, and some of the more exotic event types (packet
  delay detection, sudden-acceleration detection server-side) are stubbed
  as clear extension points rather than fully built out — the architecture
  is there to add them without restructuring anything.
