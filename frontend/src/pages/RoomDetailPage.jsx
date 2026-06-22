import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Eye, X, Zap } from 'lucide-react'
import Navbar from '../components/Navbar'
import MatchCard from '../components/MatchCard'
import LeaderboardTable from '../components/LeaderboardTable'
import PredictionModal from '../components/PredictionModal'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'

const snapIn = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
}

const crossfade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
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
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false)
  const matchRefs = useRef({})

  const firstActiveIndex = useMemo(() => {
    const idx = matches.findIndex(m => m.status === 'LIVE' || m.status === 'SCHEDULED' || m.status === 'SUSPENDED')
    return idx >= 0 ? idx : -1
  }, [matches])

  const scrollToActive = useCallback(() => {
    if (firstActiveIndex < 0) return
    const matchId = matches[firstActiveIndex]?.id
    const el = matchRefs.current[matchId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [firstActiveIndex, matches])

  useEffect(() => {
    if (!loading && matches.length > 0 && !hasAutoScrolled && tab === 'matches') {
      const timer = setTimeout(() => {
        scrollToActive()
        setHasAutoScrolled(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, matches, hasAutoScrolled, tab, scrollToActive])

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
      <div className="min-h-screen bg-navy">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!room) return null

  const finishedCount = matches.filter(m => m.status === 'FINISHED').length
  const liveCount = matches.filter(m => m.status === 'LIVE').length
  const upcomingCount = matches.filter(m => m.status === 'SCHEDULED').length

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      <Navbar />
      <div className="pt-20 pb-16 max-w-4xl mx-auto px-5">

        {/* Header */}
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

            {firstActiveIndex >= 0 && (
              <button
                onClick={() => { setTab('matches'); setTimeout(scrollToActive, 150) }}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-light px-4 py-1.5 rounded-full shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 active:scale-95 ml-auto"
              >
                <Zap size={12} /> Predict Now
              </button>
            )}
          </div>
        </motion.div>

        {/* Tabs */}
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
          {tab === 'matches' && (
            <motion.div key="matches" {...crossfade}>
              {matches.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-gray-500 text-sm">No matches scheduled yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {matches.map((match, i) => {
                    const pred = predictions[match.id]
                    const isFirstActive = i === firstActiveIndex
                    return (
                      <motion.div
                        key={match.id}
                        custom={i}
                        initial="hidden"
                        animate="visible"
                        variants={snapIn}
                        ref={(el) => { matchRefs.current[match.id] = el }}
                      >
                        {isFirstActive && (
                          <div className="flex items-center gap-3 px-2 pt-4 pb-3">
                            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary/60">
                              {liveCount > 0 ? 'Live & Upcoming' : 'Upcoming'}
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-l from-primary/30 to-transparent" />
                          </div>
                        )}
                        <MatchCard
                          match={match}
                          onClick={() => setSelectedMatch(match)}
                        >
                          {(!match.predictionOpen || pred) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewAll(match) }}
                              className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-0.5 rounded transition-colors duration-150"
                            >
                              <Eye size={10} /> All
                            </button>
                          )}
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
              )}
            </motion.div>
          )}

          {tab === 'leaderboard' && (
            <motion.div key="leaderboard" {...crossfade}>
              <LeaderboardTable entries={leaderboard} />
            </motion.div>
          )}
        </AnimatePresence>

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
                    Final: {viewAllMatch.homeScore} - {viewAllMatch.awayScore}
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
