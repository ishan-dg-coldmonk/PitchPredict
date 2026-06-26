# ⚽ PitchPredict

> Real-time football score prediction platform. Predict match scores, compete in rooms, and climb the leaderboard.

---

## 🚀 How It Works

1. **Admin creates an event** (e.g. "Copa America 2024") and syncs matches from `football-data.org`
2. **Users join rooms** under an event using a registration code
3. **Predict scores** before the 5-minute cutoff before each match kicks off
4. **Live updates** — a background scheduler polls the football API every 60s. Score changes and match status (`LIVE → FINISHED`) are pushed to all connected users via WebSocket in real time
5. **Points are calculated** automatically when a match ends:

   | Bonus | Points | Condition |
   |---|---|---|
   | Base | up to 10 | Closer to actual score = more points |
   | Outcome | +4 | Correct win / draw / loss |
   | Goal Difference | +3 | Exact goal difference match |

6. **Leaderboard updates** instantly across all room members

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Framer Motion, STOMP over SockJS |
| Backend | Spring Boot 3.3, Java 17, Spring Security, Spring WebSocket |
| Database | PostgreSQL (NeonDB) / H2 in-memory (dev) |
| External API | football-data.org v4 |
| Auth | JWT (jjwt) |
| Deploy | EC2 (backend), Netlify (frontend) |

---

## 📁 Project Structure

```
pitchpredict/
├── backend/                          # Spring Boot
│   └── src/main/java/com/pitchpredict/
│       ├── config/                   # CORS, Security, WebSocket, DataInitializer
│       ├── controller/               # REST endpoints
│       ├── dto/                      # Request/response objects
│       ├── entity/                   # JPA entities (Match, Prediction, Room, User, Event)
│       ├── enums/                    # MatchStatus, EventStatus, Role
│       ├── exception/                # ApiException + GlobalExceptionHandler
│       ├── repository/               # Spring Data JPA repositories
│       ├── scheduler/                # MatchScoreUpdater (polls API every 60s)
│       ├── security/                 # JWT filter + provider
│       └── service/                  # Business logic
│   └── src/main/resources/
│       ├── application.yml           # Base config (dev profile active)
│       ├── application-dev.yml       # H2 in-memory DB
│       └── application-prod.yml      # PostgreSQL config via env vars
│
└── frontend/                         # React + Vite
    └── src/
        ├── api/axios.js              # Axios instance with JWT interceptor
        ├── components/               # MatchCard, PredictionModal, LeaderboardTable, etc.
        ├── context/                  # AuthContext, WebSocketContext
        ├── pages/                    # Landing, Login, Home, EventDetail, RoomDetail, Admin
        └── utils/                    # helpers.js (date/time formatting), constants.js
    ├── netlify.toml                  # SPA redirect (no proxy — calls EC2 directly)
    └── vite.config.js                # Dev proxy to localhost:8080
```

---

## ⚙️ Getting Started (Local Dev)

### Prerequisites

- Java 21+
- Node.js 20+

### Backend

```bash
cd backend
./mvnw spring-boot:run
```

Starts on `http://localhost:8080` with an H2 in-memory database.

A default admin user is auto-created on first run:

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

> **H2 Console:** `http://localhost:8080/h2-console`  
> JDBC URL: `jdbc:h2:mem:pitchpredict` · User: `sa`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts on `http://localhost:5173`. The Vite dev server proxies `/api` and WebSocket connections to `localhost:8080`.

---

## 📡 API Reference

### Auth — `/api/auth`

| Method | Path | Description |
|---|---|---|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Login, returns JWT |
| `GET` | `/me` | Current user info |
| `PATCH` | `/profile` | Update profile picture / display name |

### Events — `/api/events`

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | List all events |
| `GET` | `/{id}` | Get event details |
| `GET` | `/{id}/matches` | Get matches for an event |

### Rooms — `/api/rooms`

| Method | Path | Description |
|---|---|---|
| `GET` | `/event/{eventId}` | List rooms for an event |
| `GET` | `/{roomId}` | Room details |
| `POST` | `/join` | Join a room with a registration code |
| `GET` | `/my` | Current user's rooms |
| `GET` | `/{roomId}/leaderboard` | Room leaderboard |
| `GET` | `/{roomId}/members` | Room member list |

### Predictions — `/api/predictions`

| Method | Path | Description |
|---|---|---|
| `POST` | `/` | Submit or update a prediction |
| `GET` | `/room/{roomId}/event/{eventId}` | User's predictions for an event |
| `GET` | `/room/{roomId}/match/{matchId}` | All predictions for a match |

### Admin — `/api/admin`

| Method | Path | Description |
|---|---|---|
| `POST` | `/events` | Create event |
| `PUT` | `/events/{id}` | Update event |
| `POST` | `/events/{id}/sync-matches` | Sync matches from football API |
| `POST` | `/events/{id}/sync-goals` | Sync goal scorers |
| `POST` | `/events/{id}/activate` | Activate event |
| `POST` | `/events/{id}/finish` | Complete event |
| `POST` | `/matches` | Create match manually |
| `POST` | `/matches/{id}/set-score` | Set final score (marks `FINISHED`) |
| `POST` | `/rooms` | Create a room |

---

## 🔌 WebSocket Events

Connected via **STOMP over SockJS** at `/ws`.

| Topic | Event Types | Payload |
|---|---|---|
| `/topic/matches/{eventId}` | `MATCH_LIVE`, `MATCH_UPDATED`, `MATCH_FINISHED` | `MatchDTO` |
| `/topic/leaderboard/{roomId}` | `LEADERBOARD_UPDATED` | `LeaderboardEntry[]` |

### Real-Time Data Flow

```
football-data.org API
      ↑ pollSingleMatch() every 60s
      │
MatchScoreUpdater (scheduler)
      │
      ├─ status → LIVE      → broadcastMatchLive()      → /topic/matches/{id}
      ├─ score change        → broadcastMatchUpdated()   → /topic/matches/{id}
      └─ status → FINISHED   → broadcastMatchFinished()  → /topic/matches/{id}
                                └─ calculatePointsForMatch()
                                      └─ broadcastLeaderboardUpdated() → /topic/leaderboard/{roomId}
```

---

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions covering:

- **NeonDB** — PostgreSQL database setup
- **EC2** — Spring Boot JAR with Nginx reverse proxy
- **Netlify** — React app with `VITE_API_BASE_URL` pointing to EC2

---

## 🧠 Key Design Decisions

| Decision | Detail |
|---|---|
| **Prediction window** | Computed dynamically from `matchDate - 5min`. No DB flag. Frontend mirrors the same rule client-side for instant UI feedback; backend is the final authority. |
| **Points idempotency** | `pointsCalculated` boolean on the `Match` entity prevents double-scoring if the scheduler fires twice for the same match. |
| **No frontend polling** | All live updates arrive via WebSocket. Only the initial page load uses REST. |
| **UTC everywhere** | Match times stored in UTC, sent with `Z` suffix. All timezone conversion for display happens client-side. |