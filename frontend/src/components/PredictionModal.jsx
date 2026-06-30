import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { formatDateTimeIST } from '../utils/helpers'
import API from '../api/axios'
import toast from 'react-hot-toast'

const CLOSE_BEFORE_KICKOFF_MS = 5 * 60 * 1000   // 5 minutes in ms

/**
 * Prediction eligibility is now computed entirely from the match kickoff time.
 * No `predictionOpen` DB flag is consulted — the server is the authority on
 * submission, and the frontend just mirrors the same rule for display.
 *
 * Rule: window is open when:
 *   status === 'SCHEDULED'  AND  now < kickoffTime - 5min
 */
function usePredictionWindow(match) {
  const [now, setNow] = useState(() => Date.now())

  // Tick every second so the countdown stays accurate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const kickoff  = useMemo(() => new Date(match.matchDate).getTime(), [match.matchDate])
  const deadline = kickoff - CLOSE_BEFORE_KICKOFF_MS
  const canPredict = match.status === 'SCHEDULED' && now < deadline
  const msUntilClose = Math.max(0, deadline - now)
  const minutesLeft  = Math.floor(msUntilClose / 60000)
  const secondsLeft  = Math.floor((msUntilClose % 60000) / 1000)

  return { canPredict, minutesLeft, secondsLeft, msUntilClose }
}

export default function PredictionModal({ match, roomId, eventId, existing, onClose, onSaved }) {
  const [homeScore, setHomeScore] = useState(existing?.predictedHomeScore ?? '')
  const [awayScore, setAwayScore] = useState(existing?.predictedAwayScore ?? '')
  const [saving, setSaving]       = useState(false)

  const { canPredict, minutesLeft, secondsLeft, msUntilClose } = usePredictionWindow(match)

  const isFinished = match.status === 'FINISHED'
  const isLive     = match.status === 'LIVE'

  // Sync inputs whenever existing prediction changes
  useEffect(() => {
    if (existing) {
      setHomeScore(existing.predictedHomeScore)
      setAwayScore(existing.predictedAwayScore)
    } else {
      setHomeScore('')
      setAwayScore('')
    }
  }, [existing])

  const handleSubmit = async () => {
    const home = parseInt(homeScore)
    const away = parseInt(awayScore)
    if (isNaN(home) || isNaN(away)) {
      toast.error('Please enter a score for both teams')
      return
    }
    setSaving(true)
    try {
      await API.post('/predictions', {
        matchId: match.id,
        eventId,
        roomId,
        predictedHomeScore: home,
        predictedAwayScore: away,
      })
      toast.success(existing ? 'Prediction updated!' : 'Prediction saved!')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save prediction')
    } finally {
      setSaving(false)
    }
  }

  const clampScore = (val) => {
    const n = parseInt(val)
    if (isNaN(n)) return ''
    return Math.max(0, Math.min(20, n))
  }

  const closedMsg = () => {
    if (isFinished) return { icon: '🏁', title: 'Match has ended',   sub: 'Predictions are no longer accepted' }
    if (isLive)     return { icon: '🔴', title: 'Match is underway', sub: 'Prediction window closed before kick-off' }
    return              { icon: '🔒', title: 'Predictions closed',  sub: 'Window closes 5 min before kick-off' }
  }

  // Show a countdown warning when fewer than 10 min remain
  const showCountdown = canPredict && msUntilClose < 10 * 60 * 1000

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                {match.groupName && <span>Group {match.groupName}</span>}
                {match.stage && <span>{match.stage.replace(/_/g, ' ')}</span>}
              </div>
              <div className="text-xs text-gray-400">{formatDateTimeIST(match.matchDate)} IST</div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          {/* Closing-soon countdown banner */}
          {showCountdown && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2 mb-4">
              <Clock size={13} className="text-orange-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-orange-400">
                Window closes in {minutesLeft}m {String(secondsLeft).padStart(2, '0')}s
              </span>
            </div>
          )}

          {/* Teams + score inputs */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-col items-center gap-2 flex-1">
              {match.homeCrest && <img src={match.homeCrest} alt="" className="w-12 h-12 object-contain" />}
              <span className="text-sm font-semibold text-white text-center leading-tight">{match.homeTeam}</span>
            </div>

            <div className="flex items-center gap-3 px-4">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={homeScore}
                onChange={(e) => setHomeScore(clampScore(e.target.value))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
              <span className="text-2xl font-bold text-gray-500">:</span>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                value={awayScore}
                onChange={(e) => setAwayScore(clampScore(e.target.value))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              {match.awayCrest && <img src={match.awayCrest} alt="" className="w-12 h-12 object-contain" />}
              <span className="text-sm font-semibold text-white text-center leading-tight">{match.awayTeam}</span>
            </div>
          </div>

          {/* Actual score if live/finished */}
          {(isFinished || isLive) && match.homeScore !== null && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-center">
              <div className="text-xs text-gray-400 mb-1">{isLive ? 'Current Score' : 'Final Score'}</div>
              <div className="text-2xl font-black text-white">{match.homeScore} – {match.awayScore}</div>
            </div>
          )}

          {/* Existing prediction summary when window is closed */}
          {existing && !canPredict && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3.5 mb-4">
              <div className="text-xs text-accent font-semibold mb-2">Your Prediction</div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-xl font-black text-white tabular-nums">
                  {existing.predictedHomeScore} : {existing.predictedAwayScore}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span>B <span className="text-white font-bold">{existing.basePoints ?? '—'}</span></span>
                  <span>R <span className="text-white font-bold">{existing.outcomeBonus ?? '—'}</span></span>
                  <span>GD <span className="text-white font-bold">{existing.gdBonus ?? '—'}</span></span>
                  <span className="text-accent font-black">
                    {existing.points != null ? `${existing.points} pts` : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {canPredict ? (
            <button
              onClick={handleSubmit}
              disabled={saving || homeScore === '' || awayScore === ''}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : existing ? 'Update Prediction' : 'Submit Prediction'
              }
            </button>
          ) : (() => {
            const { icon, title, sub } = closedMsg()
            return (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                </div>
              </div>
            )
          })()}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
