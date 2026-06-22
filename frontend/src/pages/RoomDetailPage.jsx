import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Eye, X, Zap, CalendarDays } from 'lucide-react'
import Navbar from '../components/Navbar'
import MatchCard from '../components/MatchCard'
import FeaturedMatchCard from '../components/FeaturedMatchCard'
import LeaderboardTable from '../components/LeaderboardTable'
import PredictionModal from '../components/PredictionModal'
import LiveIndicator from '../components/LiveIndicator'
import { useAuth } from '../context/AuthContext'
import { getESTDayKey, getDayLabelEST, formatDateLabelIST } from '../utils/helpers'
import API from '../api/axios'

const snapIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  }),
}

const crossfade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

/** Group matches by their EST calendar day, return ordered array of [dayKey, matches[]] */
function groupByESTDay(matches) {
  const map = new Map()
  for (const m of matches) {
    const key = getESTDayKey(m.matchDate)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
}

/** Get today's EST day key */
function todayESTKey() {
  const nowEST = new Date().toLocaleString('en-CA', { timeZone: 'America/New_York' })
  return nowEST.split(',')[0].trim()
}

/** Pick the featured match: first LIVE, else first SCHEDULED within 24h, else most recently started */
function pickFeaturedMatch(matches) {
  const now = new Date()

  const live = matches.filter((m) => m.status === 'LIVE')
  if (live.length > 0) return live[0]

  const upcoming24h = matches
    .filter((m) => m.status === 'SCHEDULED')
    .filter((m) => {
      const diff = new Date(m.matchDate) - now
      return diff > 0 && diff <= 24 * 3600 * 1000
    })
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
  if (upcoming24h.length > 0) return upcoming24h[0]

  // Fallback: next upcoming regardless of window
  const anyUpcoming = matches
    .filter((m) => m.status === 'SCHEDULED' && new Date(m.matchDate) > now)
    .sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate))
  if (anyUpcoming.length > 0) return anyUpcoming[0]

  return null
}

/** Get matches that are scheduled today (in EST) */
function getTodayMatches(matches) {
  const key = todayESTKey()
  return matches.filter((m) => getESTDayKey(m.matchDate) === key && m.status === 'SCHEDULED')
}

export default function RoomDetailPage() {
  const { roomId } = useParams()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [matches, setMatches] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [predictions, setPredictions] = useState({})
  const [tab, setTab] = useState('matches')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [viewAllMatch, setViewAllMatch] = useState(null)
  const [allPredictions, setAllPredictions] = useState([])
  const [loading, setLoading] = useState(true)

  const featuredMatch = useMemo(() => pickFeaturedMatch(matches), [matches])
  const todayMatches = useMemo(() => getTodayMatches(matches), [matches])
  const groupedMatches = useMemo(() => groupByESTDay(matches), [matches])

  const liveCount = useMemo(() => matches.filter((m) => m.status === 'LIVE').length, [matches])
  const finishedCount = useMemo(() => matches.filter((m) => m.status === 'FINISHED').length, [matches])
  const upcomingCount = useMemo(() => matches.filter((m) => m.status === 'SCHEDULED').length, [matches])

  const loadData = useCallback(async () => {
    try {
      const [roomRes, lbRes] = await Promise.all([
        API.get(`/rooms/${roomId}`),
        API.get(`/rooms/${roomId}/leaderboard`),
      ])
      setRoom(roomRes.data)
      setLeaderboard(lbRes.data)

      if (roomRes.data.eventId) {
        const [matchRes, predRes] = await Promise.all([
          API.get(`/events/${roomRes.data.eventId}/matches`),
          API.get(`/predictions/room/${roomId}/event/${roomRes.data.eventId}`),
        ])
        setMatches(matchRes.data)
        const predMap = {}
        predRes.data.forEach((p) => { predMap[p.matchId] = p })
        setPredictions(predMap)
      }
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => { loadData() }, [loadData])

  const handleViewAll = async (match) => {
    const res = await API.get(`/predictions/room/${roomId}/match/${match.id}`)
    setAllPredictions(res.data)
    setViewAllMatch(match)
  }

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

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <Navbar />
      <div className="pt-20 pb-16 max-w-4xl mx-auto px-5">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div {...crossfade} className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">Event Room</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-4">{room.name}</h1>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-gray-400">
              <Users size={14} className="text-gray-500" /> {room.memberCount} members
            </span>

            {liveCount > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/15 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-blink" />
                {liveCount} Live
              </span>
            )}

            <span className="text-xs text-gray-500">
              {finishedCount} played &middot; {upcomingCount} upcoming
            </span>

            {featuredMatch && (featuredMatch.status === 'LIVE' || featuredMatch.status === 'SCHEDULED') && (
              <button
                onClick={() => { setTab('matches'); setSelectedMatch(featuredMatch) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-light px-4 py-1.5 rounded-full shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 active:scale-95 ml-auto"
              >
                <Zap size={12} /> Predict Now
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Tabs ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-8 bg-white/[0.03] p-1 rounded-xl w-fit">
          {['matches', 'leaderboard'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-sm font-semibold capitalize px-5 py-2 rounded-lg transition-all duration-200 ${
                tab === t
                  ? 'text-white bg-primary/20 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── Matches tab ──────────────────────────────────────────────────── */}
          {tab === 'matches' && (
            <motion.div key="matches" {...crossfade}>
              {matches.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-500 text-sm">No matches scheduled yet</p>
                </div>
              ) : (
                <>
                  {/* Featured match card */}
                  {featuredMatch && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-3">
                        {featuredMatch.status === 'LIVE' ? (
                          <LiveIndicator />
                        ) : (
                          <Zap size={14} className="text-primary" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-gray-400">
                          {featuredMatch.status === 'LIVE' ? 'Live Match' : 'Next Up'}
                        </span>
                      </div>
                      <FeaturedMatchCard
                        match={featuredMatch}
                        onClick={() => setSelectedMatch(featuredMatch)}
                      />
                      {predictions[featuredMatch.id] && (
                        <div className="mt-2 flex items-center gap-2 px-1">
                          <span className="text-xs text-gray-500">Your pick:</span>
                          <span className="text-xs font-bold text-accent">
                            {predictions[featuredMatch.id].predictedHomeScore} : {predictions[featuredMatch.id].predictedAwayScore}
                          </span>
                          <span className="text-xs text-gray-500">·</span>
                          <span className="text-xs font-bold text-accent">{predictions[featuredMatch.id].points} pts</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Today's matches strip */}
                  {todayMatches.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <CalendarDays size={14} className="text-accent" />
                        <span className="text-xs font-bold uppercase tracking-[0.15em] text-accent/80">
                          Today's Matches
                        </span>
                        <span className="text-[10px] text-gray-600 ml-1">(times in IST)</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {todayMatches.map((match) => {
                          const pred = predictions[match.id]
                          const isFeatured = featuredMatch?.id === match.id
                          return (
                            <motion.div
                              key={match.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setSelectedMatch(match)}
                              className={`
                                flex-shrink-0 cursor-pointer rounded-2xl border p-4 min-w-[200px] max-w-[220px]
                                transition-all duration-200
                                ${isFeatured
                                  ? 'border-primary/40 bg-primary/10'
                                  : 'border-white/8 bg-white/[0.03] hover:border-primary/25 hover:bg-white/[0.05]'
                                }
                              `}
                            >
                              {/* Time */}
                              <div className="text-[10px] text-gray-500 mb-2 font-semibold uppercase tracking-wider">
                                {new Date(match.matchDate).toLocaleTimeString('en-IN', {
                                  timeZone: 'Asia/Kolkata',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                })} IST
                              </div>

                              {/* Teams */}
                              <div className="flex items-center gap-2 mb-1">
                                {match.homeCrest && (
                                  <img src={match.homeCrest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-white truncate">{match.homeTeam}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {match.awayCrest && (
                                  <img src={match.awayCrest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-white truncate">{match.awayTeam}</span>
                              </div>

                              {/* Prediction badge */}
                              {pred ? (
                                <div className="mt-2 text-[10px] font-bold text-accent bg-accent/10 rounded px-1.5 py-0.5 inline-block">
                                  {pred.predictedHomeScore}:{pred.predictedAwayScore}
                                </div>
                              ) : match.predictionOpen ? (
                                <div className="mt-2 text-[10px] font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5 inline-block">
                                  Predict
                                </div>
                              ) : null}
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* All matches grouped by EST day */}
                  <div className="space-y-8">
                    {groupedMatches.map(([dayKey, dayMatches]) => {
                      const label = getDayLabelEST(dayMatches[0].matchDate)
                      const isToday = dayKey === todayESTKey()
                      return (
                        <div key={dayKey}>
                          {/* Day header */}
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`flex-1 h-px ${isToday ? 'bg-gradient-to-r from-accent/40 to-transparent' : 'bg-gradient-to-r from-white/10 to-transparent'}`} />
                            <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${isToday ? 'text-accent/70' : 'text-gray-500'}`}>
                              {label}
                            </span>
                            <div className={`flex-1 h-px ${isToday ? 'bg-gradient-to-l from-accent/40 to-transparent' : 'bg-gradient-to-l from-white/10 to-transparent'}`} />
                          </div>

                          <div className="space-y-3">
                            {dayMatches.map((match, i) => {
                              const pred = predictions[match.id]
                              const isFeaturedMatch = featuredMatch?.id === match.id
                              return (
                                <motion.div
                                  key={match.id}
                                  custom={i}
                                  initial="hidden"
                                  animate="visible"
                                  variants={snapIn}
                                  className={isFeaturedMatch ? 'ring-1 ring-primary/30 rounded-xl' : ''}
                                >
                                  <MatchCard
                                    match={match}
                                    onClick={() => setSelectedMatch(match)}
                                  >
                                    {/* View all predictions button */}
                                    {(!match.predictionOpen || pred) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleViewAll(match) }}
                                        className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded transition-colors duration-150"
                                      >
                                        <Eye size={10} /> All
                                      </button>
                                    )}

                                    {/* Closed prediction status */}
                                    {!match.predictionOpen && match.status === 'SCHEDULED' && !pred && (
                                      <span className="text-[10px] font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                        Closed
                                      </span>
                                    )}

                                    {/* Finished label */}
                                    {match.status === 'FINISHED' && !pred && (
                                      <span className="text-[10px] font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                                        Match has ended
                                      </span>
                                    )}

                                    {/* Live label without prediction */}
                                    {match.status === 'LIVE' && !pred && (
                                      <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                                        Match has ended
                                      </span>
                                    )}

                                    {/* User's prediction */}
                                    {pred && (
                                      <span className="text-[11px] font-bold tabular-nums bg-accent/10 text-accent border border-accent/20 px-2.5 py-0.5 rounded">
                                        {pred.predictedHomeScore}:{pred.predictedAwayScore} &middot; {pred.points}pts
                                      </span>
                                    )}
                                  </MatchCard>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── Leaderboard tab ─────────────────────────────────────────────── */}
          {tab === 'leaderboard' && (
            <motion.div key="leaderboard" {...crossfade}>
              <LeaderboardTable entries={leaderboard} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Prediction modal ─────────────────────────────────────────────── */}
        {selectedMatch && (
          <PredictionModal
            match={selectedMatch}
            roomId={Number(roomId)}
            eventId={room.eventId}
            existing={predictions[selectedMatch.id]}
            onClose={() => setSelectedMatch(null)}
            onSaved={loadData}
          />
        )}

        {/* ── View all predictions modal ──────────────────────────────────── */}
        <AnimatePresence>
          {viewAllMatch && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setViewAllMatch(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                className="bg-[#12121e] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-bold text-white">Room Predictions</h3>
                  <button onClick={() => setViewAllMatch(null)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>

                <div className="text-sm text-gray-400 mb-1">
                  {viewAllMatch.homeTeam} vs {viewAllMatch.awayTeam}
                </div>
                {viewAllMatch.status === 'FINISHED' && viewAllMatch.homeScore !== null && (
                  <div className="text-sm text-white font-bold mb-5">
                    Final: {viewAllMatch.homeScore} – {viewAllMatch.awayScore}
                  </div>
                )}
                {viewAllMatch.status === 'LIVE' && viewAllMatch.homeScore !== null && (
                  <div className="flex items-center gap-2 text-sm text-red-400 font-bold mb-5">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-blink" />
                    Live: {viewAllMatch.homeScore} – {viewAllMatch.awayScore}
                  </div>
                )}

                {allPredictions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No predictions for this match</p>
                ) : (
                  <div className="space-y-2.5">
                    {allPredictions.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3.5 border border-white/[0.04]">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                          {p.profilePic ? (
                            <img src={p.profilePic} alt="" className="w-full h-full object-cover" />
                          ) : (
                            p.username?.[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{p.username}</div>
                        </div>
                        <div className="text-xl font-black text-white tabular-nums">
                          {p.predictedHomeScore} : {p.predictedAwayScore}
                        </div>
                        <div className="text-right min-w-[60px]">
                          <div className="text-accent font-bold text-sm">{p.points} pts</div>
                          <div className="text-[10px] text-gray-500">b:{p.basePoints} r:{p.outcomeBonus} g:{p.gdBonus}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
