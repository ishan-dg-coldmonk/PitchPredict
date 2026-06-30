import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Eye, X, CalendarDays, CheckCircle2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import MatchCard from '../components/MatchCard'
import FeaturedMatchCard from '../components/FeaturedMatchCard'
import LeaderboardTable from '../components/LeaderboardTable'
import StandingsTable from '../components/StandingsTable'
import PredictionModal from '../components/PredictionModal'
import LiveIndicator from '../components/LiveIndicator'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../context/WebSocketContext'
import { getESTDayKey, getDayLabelEST, formatTimeIST, todayESTKey, effectiveStatus } from '../utils/helpers'
import API from '../api/axios'

// ── animation helpers ────────────────────────────────────────────────────────
const snapIn = {
  hidden: { opacity: 0, y: 14 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.035, duration: 0.32, ease: [0.16, 1, 0.3, 1] },
  }),
}
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.1 } },
}

function pickFeatured(matches, nowMs) {
  // Live (incl. optimistically-live just-kicked-off matches) takes priority.
  const live = matches.filter((m) => effectiveStatus(m, nowMs) === 'LIVE')
  if (live.length) {
    return [...live].sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))[0]
  }
  const any = matches
    .filter((m) => m.status === 'SCHEDULED' && new Date(m.matchDate).getTime() > nowMs)
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
  return any[0] ?? null
}

function groupByESTDay(matches) {
  const map = new Map()
  for (const m of matches) {
    const k = getESTDayKey(m.matchDate)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(m)
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
}

// ── All-Predictions modal ────────────────────────────────────────────────────
function AllPredictionsModal({ match, roomId, onClose }) {
  const [preds, setPreds]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/predictions/room/${roomId}/match/${match.id}`)
      .then((r) => setPreds(r.data))
      .finally(() => setLoading(false))
  }, [match.id, roomId])

  const isLive     = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-[#12121e] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Room Predictions</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-gray-400 mb-1">{match.homeTeam} vs {match.awayTeam}</div>

        {(isFinished || isLive) && match.homeScore !== null && (
          <div className={`text-sm font-bold mb-4 flex items-center gap-2 ${isLive ? 'text-red-400' : 'text-white'}`}>
            {isLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-blink" />}
            {isLive ? 'Live: ' : 'Final: '}
            {match.homeScore} – {match.awayScore}
          </div>
        )}

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : preds.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No predictions for this match yet</p>
        ) : (
          <div className="space-y-2.5">
            {preds.map((p) => (
              <div key={p.id}
                className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {p.profilePic
                    ? <img src={p.profilePic} alt="" className="w-full h-full object-cover" />
                    : p.username?.[0]?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{p.username}</div>
                </div>
                <div className="text-xl font-black text-white tabular-nums">
                  {p.predictedHomeScore} : {p.predictedAwayScore}
                </div>
                <div className="text-right min-w-[50px] sm:min-w-[60px]">
                  <div className="text-accent font-bold text-xs sm:text-sm">{p.points ?? 0} pts</div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 whitespace-nowrap">
                    B:{p.basePoints ?? 0} R:{p.outcomeBonus ?? 0} G:{p.gdBonus ?? 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RoomDetailPage() {
  const { roomId }            = useParams()
  const { user }              = useAuth()
  const { subscribe }         = useWebSocket()

  const [room, setRoom]               = useState(null)
  const [event, setEvent]             = useState(null)
  const [matches, setMatches]         = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [standings, setStandings]         = useState(null)   // null = not yet loaded
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [predictions, setPredictions] = useState({})
  const [mainTab, setMainTab]         = useState('matches')
  const [matchTab, setMatchTab]       = useState('upcoming')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [viewAllMatch, setViewAllMatch]   = useState(null)
  const [loading, setLoading]             = useState(true)

  const initialLoadDone = useRef(false)
  // Keep eventId in a ref so WebSocket effect can read it without re-subscribing
  const eventIdRef = useRef(null)

  // Wall-clock tick (every 20s) so kick-off-based derived values (featured pick,
  // live count, "today" strip) re-evaluate when a match crosses kick-off even
  // before the WebSocket flips its status.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(id)
  }, [])

  // ── derived ──────────────────────────────────────────────────────────────
  const featuredMatch   = useMemo(() => pickFeatured(matches, now), [matches, now])
  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.status !== 'FINISHED' && m.status !== 'CANCELLED' && m.status !== 'POSTPONED'),
    [matches]
  )
  const finishedMatches = useMemo(
    () => [...matches.filter((m) => m.status === 'FINISHED')]
            .sort((a, b) => new Date(b.matchDate) - new Date(a.matchDate)),
    [matches]
  )
  const todayMatches = useMemo(() => {
    const key = todayESTKey()
    return upcomingMatches.filter(
      (m) => getESTDayKey(m.matchDate) === key && effectiveStatus(m, now) === 'SCHEDULED'
    )
  }, [upcomingMatches, now])

  const groupedUpcoming = useMemo(() => groupByESTDay(upcomingMatches), [upcomingMatches])
  const groupedFinished = useMemo(() => groupByESTDay(finishedMatches), [finishedMatches])
  const liveCount       = useMemo(() => matches.filter((m) => effectiveStatus(m, now) === 'LIVE').length, [matches, now])
  const finishedCount   = finishedMatches.length
  const upcomingCount   = upcomingMatches.filter((m) => effectiveStatus(m, now) === 'SCHEDULED').length

  // ── Initial REST load ─────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [roomRes, lbRes] = await Promise.all([
        API.get(`/rooms/${roomId}`),
        API.get(`/rooms/${roomId}/leaderboard`),
      ])
      setRoom(roomRes.data)
      setLeaderboard(lbRes.data)

      if (roomRes.data.eventId) {
        eventIdRef.current = roomRes.data.eventId

        const [matchRes, predRes, eventRes] = await Promise.all([
          API.get(`/events/${roomRes.data.eventId}/matches`),
          API.get(`/predictions/room/${roomId}/event/${roomRes.data.eventId}`),
          API.get(`/events/${roomRes.data.eventId}`),
        ])
        setMatches(matchRes.data)
        setEvent(eventRes.data)
        const map = {}
        predRes.data.forEach((p) => { map[p.matchId] = p })
        setPredictions(map)
      }
    } catch (err) {
      console.error('Failed to load room data:', err)
    } finally {
      if (!initialLoadDone.current) {
        setLoading(false)
        initialLoadDone.current = true
      }
    }
  }, [roomId])

  useEffect(() => { loadData() }, [loadData])

  // ── WebSocket subscriptions ───────────────────────────────────────────────
  //
  // Subscribe once after initial load. We subscribe to:
  //   /topic/matches/{eventId}      → match status/score changes
  //   /topic/leaderboard/{roomId}   → leaderboard recalculations
  //
  // Each WebSocket event carries a `type` and `payload`.
  // For match events: update the single match in-place in the array.
  // For leaderboard events: replace the leaderboard state entirely.
  // No full REST refetch needed — the payload IS the updated data.

  useEffect(() => {
    if (!initialLoadDone.current) return
    if (!eventIdRef.current) return

    const eventId = eventIdRef.current

    // ── Match updates ───────────────────────────────────────────────────────
    const unsubMatches = subscribe(
      `/topic/matches/${eventId}`,
      (event) => {
        // event = { type: 'MATCH_UPDATED' | 'MATCH_LIVE' | 'MATCH_FINISHED', payload: MatchDTO }
        const updatedMatch = event.payload

        setMatches((prev) =>
          prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m))
        )

        // If the currently-open prediction modal is for this match, update it
        setSelectedMatch((prev) =>
          prev?.id === updatedMatch.id ? updatedMatch : prev
        )

        // If the currently-open view-all modal is for this match, update it
        setViewAllMatch((prev) =>
          prev?.id === updatedMatch.id ? updatedMatch : prev
        )
      }
    )

    // ── Leaderboard updates ─────────────────────────────────────────────────
    const unsubLeaderboard = subscribe(
      `/topic/leaderboard/${roomId}`,
      (event) => {
        // event = { type: 'LEADERBOARD_UPDATED', payload: LeaderboardEntry[] }
        setLeaderboard(event.payload)
      }
    )

    return () => {
      unsubMatches()
      unsubLeaderboard()
    }
  }, [loading, subscribe, roomId]) // re-run only after initial load completes

  // ── Standings: lazy-load the first time the tab is opened ──────────────────
  // Backend caches for ~3 min, so re-opening the tab won't spam the football API.
  useEffect(() => {
    if (mainTab !== 'standings') return
    if (standings !== null || standingsLoading) return
    if (!event?.id) return

    setStandingsLoading(true)
    API.get(`/events/${event.id}/standings`)
      .then((r) => setStandings(r.data))
      .catch((err) => {
        console.error('Failed to load standings:', err)
        setStandings([]) // empty → component shows the "not available" message
      })
      .finally(() => setStandingsLoading(false))
  }, [mainTab, event?.id, standings, standingsLoading])

  // ── Prediction view eligibility ───────────────────────────────────────────
  const canViewPredictions = (match) => {
    if (match.status === 'FINISHED') return true
    if (match.status === 'LIVE')     return true
    // predictionOpen is dynamically computed in MatchService.toDTO()
    return !match.predictionOpen && !!predictions[match.id]
  }

  // ── Match card renderer ───────────────────────────────────────────────────
  const renderMatchCard = (match, i) => {
    const pred        = predictions[match.id]
    const isFeatured  = featuredMatch?.id === match.id
    const showViewAll = canViewPredictions(match)
    const isFinished  = match.status === 'FINISHED'
    const isLive      = match.status === 'LIVE'

    return (
      <motion.div
        key={match.id}
        custom={i}
        initial="hidden"
        animate="visible"
        variants={snapIn}
        className={isFeatured ? 'ring-1 ring-primary/30 rounded-xl' : ''}
      >
        <MatchCard match={match} onClick={() => setSelectedMatch(match)}>
          {showViewAll && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewAllMatch(match) }}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded transition-colors duration-150"
            >
              <Eye size={10} /> Predictions
            </button>
          )}

          {pred && (
            <span className="text-[11px] font-bold tabular-nums bg-accent/10 text-accent border border-accent/20 px-2.5 py-0.5 rounded">
              {pred.predictedHomeScore}:{pred.predictedAwayScore}
              {pred.points != null && <> · {pred.points}pts</>}
            </span>
          )}

          {!pred && isFinished && (
            <span className="text-[10px] font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded">Ended</span>
          )}
          {!pred && isLive && (
            <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">In Play</span>
          )}
          {!pred && !isFinished && !isLive && !match.predictionOpen && (
            <span className="text-[10px] font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded">Closed</span>
          )}
        </MatchCard>
      </motion.div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12]">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }
  if (!room) return null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <Navbar />
      <div className="pt-20 pb-16 max-w-4xl mx-auto px-3 sm:px-5">

        {/* Header */}
        <motion.div {...fade} className="mb-6 sm:mb-10 pt-2 sm:pt-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-1">Event Room</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3 sm:mb-4 leading-tight">
            {room.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <Users size={14} className="text-gray-500" /> {room.memberCount} members
            </span>
            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/15 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-blink" />
                {liveCount} Live
              </span>
            )}
            {/* No polling indicator — WebSocket handles updates silently */}
            <span className="text-xs text-gray-500">
              {finishedCount} played · {upcomingCount} upcoming
            </span>
          </div>
        </motion.div>

        {/* Main tabs */}
        <div className="flex flex-wrap gap-1 mb-6 sm:mb-8 bg-white/[0.03] p-1 rounded-xl w-fit">
          {['matches', 'leaderboard', 'standings'].map((t) => (
            <button
              key={t}
              onClick={() => setMainTab(t)}
              className={`text-sm font-semibold capitalize px-4 sm:px-5 py-2 rounded-lg transition-all duration-200 ${
                mainTab === t
                  ? 'text-white bg-primary/20 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ════════ MATCHES TAB ════════ */}
          {mainTab === 'matches' && (
            <motion.div key="matches" {...fade}>
              {matches.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-sm">No matches scheduled yet</div>
              ) : (
                <>
                  {/* Featured */}
                  {featuredMatch && (
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        {effectiveStatus(featuredMatch, now) === 'LIVE'
                          ? <LiveIndicator />
                          : <span className="w-2 h-2 rounded-full bg-primary/60" />
                        }
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                          {effectiveStatus(featuredMatch, now) === 'LIVE' ? 'Live Now' : 'Next Up'}
                        </span>
                      </div>
                      <FeaturedMatchCard
                        match={featuredMatch}
                        onClick={() => setSelectedMatch(featuredMatch)}
                      />
                      {predictions[featuredMatch.id] && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                          <span className="text-xs text-gray-500">Your pick:</span>
                          <span className="text-xs font-bold text-accent">
                            {predictions[featuredMatch.id].predictedHomeScore}
                            {' : '}
                            {predictions[featuredMatch.id].predictedAwayScore}
                          </span>
                          {predictions[featuredMatch.id].points != null && (
                            <>
                              <span className="text-xs text-gray-500">·</span>
                              <span className="text-xs font-bold text-accent">
                                {predictions[featuredMatch.id].points} pts
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Today's strip */}
                  {todayMatches.length > 0 && (
                    <div className="mb-6 sm:mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarDays size={14} className="text-accent" />
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-accent/80">
                          Today's Matches
                        </span>
                        <span className="text-[10px] text-gray-600 ml-1">(IST)</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-4 mt-1 scrollbar-hide">
                        {todayMatches.map((match) => {
                          const pred       = predictions[match.id]
                          const isFeatured = featuredMatch?.id === match.id
                          return (
                            <motion.div
                              key={match.id}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedMatch(match)}
                              className={`
                                flex-shrink-0 cursor-pointer rounded-2xl border p-3 sm:p-4
                                min-w-[165px] sm:min-w-[190px] max-w-[200px] sm:max-w-[210px]
                                transition-all duration-200
                                ${isFeatured
                                  ? 'border-primary/40 bg-primary/10'
                                  : 'border-white/8 bg-white/[0.03] hover:border-primary/25'
                                }
                              `}
                            >
                              <div className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                                {formatTimeIST(match.matchDate)} IST
                              </div>
                              <div className="flex items-center gap-1.5 mb-1">
                                {match.homeCrest && <img src={match.homeCrest} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" />}
                                <span className="text-xs font-semibold text-white truncate">{match.homeTeam}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {match.awayCrest && <img src={match.awayCrest} alt="" className="w-4 h-4 sm:w-5 sm:h-5 object-contain flex-shrink-0" />}
                                <span className="text-xs font-semibold text-white truncate">{match.awayTeam}</span>
                              </div>
                              {pred ? (
                                <div className="mt-2 text-[10px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5 inline-block">
                                  {pred.predictedHomeScore}:{pred.predictedAwayScore}
                                </div>
                              ) : match.predictionOpen ? (
                                <div className="mt-2 text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 inline-block">
                                  Open
                                </div>
                              ) : null}
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sub-tabs */}
                  <div className="flex items-center flex-wrap gap-1 mb-4 sm:mb-6 bg-white/[0.025] p-1 rounded-xl w-fit">
                    <button
                      onClick={() => setMatchTab('upcoming')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg transition-all ${
                        matchTab === 'upcoming' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {liveCount > 0 && <LiveIndicator />}
                      <span className="hidden sm:inline">Upcoming & </span>Live
                      {upcomingMatches.length > 0 && (
                        <span className="text-[10px] bg-white/10 text-gray-400 rounded-full px-1.5 py-0.5">
                          {upcomingMatches.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setMatchTab('finished')}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 sm:px-4 py-2 rounded-lg transition-all ${
                        matchTab === 'finished' ? 'text-white bg-white/10' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      Finished
                      {finishedCount > 0 && (
                        <span className="text-[10px] bg-white/10 text-gray-400 rounded-full px-1.5 py-0.5">
                          {finishedCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {matchTab === 'upcoming' && (
                      <motion.div key="upcoming" {...fade} className="space-y-6 sm:space-y-8">
                        {upcomingMatches.length === 0 ? (
                          <div className="py-10 text-center text-gray-500 text-sm">No upcoming matches</div>
                        ) : (
                          groupedUpcoming.map(([dayKey, dayMatches]) => {
                            const label   = getDayLabelEST(dayMatches[0].matchDate)
                            const isToday = dayKey === todayESTKey()
                            return (
                              <div key={dayKey}>
                                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                  <div className={`flex-1 h-px bg-gradient-to-r ${isToday ? 'from-accent/40' : 'from-white/10'} to-transparent`} />
                                  <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isToday ? 'text-accent/70' : 'text-gray-500'}`}>
                                    {label}
                                  </span>
                                  <div className={`flex-1 h-px bg-gradient-to-l ${isToday ? 'from-accent/40' : 'from-white/10'} to-transparent`} />
                                </div>
                                <div className="space-y-2 sm:space-y-3">
                                  {dayMatches.map((m, i) => renderMatchCard(m, i))}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </motion.div>
                    )}

                    {matchTab === 'finished' && (
                      <motion.div key="finished" {...fade} className="space-y-6 sm:space-y-8">
                        {finishedMatches.length === 0 ? (
                          <div className="py-10 text-center text-gray-500 text-sm">No finished matches yet</div>
                        ) : (
                          groupedFinished.map(([dayKey, dayMatches]) => (
                            <div key={dayKey}>
                              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-500">
                                  {getDayLabelEST(dayMatches[0].matchDate)}
                                </span>
                                <div className="flex-1 h-px bg-gradient-to-l from-white/10 to-transparent" />
                              </div>
                              <div className="space-y-2 sm:space-y-3">
                                {dayMatches.map((m, i) => renderMatchCard(m, i))}
                              </div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </motion.div>
          )}

          {/* ════════ LEADERBOARD TAB ════════ */}
          {mainTab === 'leaderboard' && (
            <motion.div key="leaderboard" {...fade}>
              <LeaderboardTable
                entries={leaderboard}
                eventStatus={event?.status}
                eventTitle={event?.title}
                roomName={room?.name}
                prize={event?.prize}
              />
            </motion.div>
          )}

          {/* ════════ STANDINGS TAB ════════ */}
          {mainTab === 'standings' && (
            <motion.div key="standings" {...fade}>
              {standingsLoading && standings === null ? (
                <div className="py-16 flex justify-center">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <StandingsTable groups={standings} />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Prediction modal */}
      <AnimatePresence>
        {selectedMatch && (
          <PredictionModal
            key={selectedMatch.id}
            match={selectedMatch}
            roomId={Number(roomId)}
            eventId={room.eventId}
            existing={predictions[selectedMatch.id]}
            onClose={() => setSelectedMatch(null)}
            onSaved={loadData}
          />
        )}
      </AnimatePresence>

      {/* All predictions modal */}
      <AnimatePresence>
        {viewAllMatch && (
          <AllPredictionsModal
            key={viewAllMatch.id}
            match={viewAllMatch}
            roomId={roomId}
            onClose={() => setViewAllMatch(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
