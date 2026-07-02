# ⚽ PitchPredict

> Real-time football score prediction platform. Predict scorelines, compete with friends in private rooms, and climb a live leaderboard as matches unfold.

---

## 🎯 How It Works

1. A tournament (event) is set up and its fixtures + standings are pulled from a football data provider.
2. Players join a private room and **predict the scoreline** for each match before its cutoff (5 minutes before kick-off).
3. As matches play out, **live scores and status changes stream to everyone in real time** — no page refresh.
4. When a match finishes, **points are calculated automatically** and the room leaderboard updates live.

Knockout matches are handled end to end — regular time, extra time, and penalty shootouts each display correctly, and predicting a knockout tie prompts an extra penalty-shootout prediction.

---

## 🏅 Scoring

Each match is worth up to **17 points**:

| Component | Points | Awarded for |
|---|---|---|
| Base | 0–10 | How close the predicted scoreline is to the actual result |
| Outcome | +4 | Correct win / draw / loss |
| Goal difference | +3 | Exact goal difference |

**Knockout shootouts** add a bonus (up to **+8**): correctly calling which team advances, plus closeness to the shootout score.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion |
| Real-time | STOMP over SockJS (WebSocket) |
| Backend | Spring Boot 3.3, Java 17, Spring Security |
| Database | PostgreSQL (production) · H2 in-memory (local dev) |
| Auth | JWT |
| Deploy | EC2 (backend) · Netlify (frontend) |

---

## 🧭 Architecture

A single-page app backed by a stateless API, with a real-time channel layered on top.

```
        React SPA
      ┌───────────┐
      │  REST     │  initial page loads & actions
      │  WebSocket│  live match + leaderboard updates
      └─────┬─────┘
            │
      Spring Boot API ── PostgreSQL / H2
            │
            ├── Live-score scheduler  ──▶ polls the football data
            │      (during match window)   provider, persists changes,
            │                               and broadcasts them over WebSocket
            │
            └── Daily job ──▶ refreshes standings & re-syncs fixtures (failsafe)
```

- **Reads come from our own database** (matches, standings, leaderboards), so the UI stays fast and keeps working even if the upstream provider is unavailable.
- **Live updates are push-only** — the SPA loads once over REST, then receives every score, status, and leaderboard change over WebSocket.

---

## 🔌 Real-Time Flow

```
football data provider
        ▲ polled during the active match window
        │
  Live-score scheduler
        │  persists status / score changes
        ▼
  WebSocket broadcast ──▶ every connected client patches the affected
                          match card / leaderboard in place (no refresh)
                          │
        match finished ───┴─▶ points recalculated ──▶ leaderboard pushed live
```

---

## 🧠 Key Design Decisions

- **Dynamic prediction window** — eligibility is computed from `kick-off − 5 min` in UTC; the backend is the authority and the frontend mirrors the same rule for instant feedback.
- **Idempotent scoring** — each match is scored exactly once, even if the scheduler fires twice around the finish.
- **No frontend polling** — REST for the initial paint, WebSocket for everything live.
- **Knockout-aware scores** — regulation/extra-time scores and penalty shootouts are stored as their true, separate components, so the displayed scoreline and the points are always correct.
- **Resilient standings** — persisted in our database and refreshed on a schedule, minimizing external API calls and surviving upstream outages.

---

## ⚙️ Getting Started (Local Dev)

### Prerequisites
- Java 17+
- Node.js 20+

### Backend
```bash
cd backend

# a free football-data.org API key is needed to sync matches & standings
export FOOTBALL_DATA_API_KEY=your_key        # PowerShell: $env:FOOTBALL_DATA_API_KEY="your_key"

./mvnw spring-boot:run
```
Starts on `http://localhost:8080` with an in-memory H2 database (dev profile).

> Optional: set `JWT_SECRET` to override the built-in dev signing key.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Starts on `http://localhost:5173`. The dev server proxies both API and WebSocket traffic to `localhost:8080`.
