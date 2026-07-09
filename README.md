# ⚽ PitchPredict

> Real-time football score prediction platform. Predict scorelines, compete with friends in private rooms, chat live, and climb a real-time leaderboard as matches unfold.

---

## 🎯 How It Works

1. A tournament is set up and its fixtures + standings are pulled from a football data provider.
2. Players join a private room and **predict the scoreline** for each match before its cutoff (5 minutes before kick-off) — with an optional **AI pundit** suggesting a scoreline based on form and rankings.
3. As matches play out, **live scores and status changes stream to everyone in real time**.
4. When a match finishes, **points are calculated automatically** and the room leaderboard updates live.
5. Members can **chat in real time** inside each room.

Knockout matches are handled end to end — regular time, extra time, and penalty shootouts each display correctly, and predicting a knockout tie prompts an extra penalty-shootout prediction.

---

## ✨ Features

- **Score predictions** with a dynamic per-match cutoff and knockout-aware penalty predictions.
- **Real-time everything** — scores, statuses, leaderboard, and chat all pushed over WebSocket.
- **Room chat** — a live, per-room chat with badges and notification features.
- **AI pundit** — an on-demand, cached suggested scoreline drawing on FIFA rankings and recent form.
- **Standings & top scorers** — served from our own database, refreshed on a schedule.
- **Flexible sign-in** — username/password or one-tap **Google Sign-In**.

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
| Frontend | React 19, Vite, Tailwind CSS |
| Real-time | STOMP over SockJS (WebSocket) |
| Backend | Spring Boot 3.3, Java 17, Spring Security |
| Database | PostgreSQL (production) • H2 in-memory (local dev) |
| Auth | JWT (REST + WebSocket) • Google OAuth |
| Data & AI | football-data.org (fixtures, standings, scorers) • OpenRouter (AI pundit) |
| Deploy | Render (backend) • Netlify (frontend) • NeonDB (database) |

---

## 🧭 Architecture

A single-page app backed by a stateless API, with a real-time channel layered on top.

```
        React SPA
      ┌───────────┐
      │  REST     │  initial page loads, history & actions
      │  WebSocket│  live match, leaderboard & chat updates
      └─────┬─────┘
            │
      Spring Boot API ── PostgreSQL / H2
            │
            ├── Auth ──▶ password or Google OAuth → issues JWT
            │
            ├── Live-score scheduler  ──▶ polls the football data
            │      (during match window)   provider, persists changes,
            │                               and broadcasts them over WebSocket
            │
            ├── Daily job ──▶ refreshes standings, scorers & re-syncs fixtures (failsafe)
            │
            └── AI pundit ──▶ generates & caches a suggested scoreline on demand
```

- **Reads come from our own database** (matches, standings, scorers, leaderboards, chat history), so the UI stays fast and keeps working even if the upstream provider is unavailable.
- **Live updates are push-only** — the SPA loads once over REST, then receives every score, status, leaderboard, and chat change over WebSocket.

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

**Chat** rides the same WebSocket. A member sends a message, the server authenticates
the sender, persists it, and broadcasts it to everyone subscribed to that room's
chat topic — history is loaded once over REST, then new messages arrive live:

```
member ──send──▶ server (auth + validate + save) ──broadcast──▶ every member in the room
                                                                 │
                              off the chat tab? ─────────────────┴─▶ unread badge + toast
```

---

## 🧠 Key Design Decisions

- **Dynamic prediction window** — eligibility is computed from `kick-off − 5 min` in UTC; the backend is the authority and the frontend mirrors the same rule for instant feedback.
- **Idempotent scoring** — each match is scored exactly once, even if the scheduler fires twice around the finish.
- **No frontend polling** — REST for the initial paint, WebSocket for everything live.
- **Knockout-aware scores** — regulation/extra-time scores and penalty shootouts are stored as their true, separate components, so the displayed scoreline and the points are always correct.
- **Resilient standings & scorers** — persisted in our database and refreshed on a schedule, minimizing external API calls and surviving upstream outages.
- **Authenticated WebSocket chat** — the socket verifies a JWT on connect and gates each room's chat to its members, so identity can't be spoofed and non-members can't read a room's chat.
- **Lightweight chat payloads** — messages never carry avatars; clients resolve them once from the member list, and uploaded avatars are downscaled to small thumbnails, keeping the live channel fast for a full room.
- **AI pundit on demand** — the suggested scoreline is generated only when asked and cached per match, so the leaderboard stays fast and external AI calls stay minimal.

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

> Optional:
> - `OPENROUTER_API_KEY` — enables the AI pundit's suggested scoreline (without it, requesting one just reports the pundit is unavailable).
> - `GOOGLE_CLIENT_ID` — enables Google OAuth (must match the frontend's `VITE_GOOGLE_CLIENT_ID`).
> - `JWT_SECRET` — overrides the built-in dev signing key.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Starts on `http://localhost:5173`. The dev server proxies both API and WebSocket traffic to `localhost:8080`.

> Optional: set `VITE_GOOGLE_CLIENT_ID` (in `frontend/.env`) to show the Google Sign-In button. Leave it unset and the app falls back to username/password only.
