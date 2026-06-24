import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { formatDateTimeIST } from '../utils/helpers'
import API from '../api/axios'
import toast from 'react-hot-toast'

export default function PredictionModal({ match, roomId, eventId, existing, onClose, onSaved }) {
  // ── Score inputs — always initialised from `existing` when it exists ──────
  //
  // BUG FIX: previously defaulted to 0 when existing was null, which meant
  // a user who hadn't predicted yet saw 0:0 pre-filled, and a user who DID
  // predict but whose `existing` prop wasn't passed correctly also saw 0:0.
  //
  // Now: if `existing` is present, use its values. If not, default to empty
  // string so the placeholder text shows instead of a misleading 0.
  const [homeScore, setHomeScore] = useState(
    existing?.predictedHomeScore ?? ''
  )
  const [awayScore, setAwayScore] = useState(
    existing?.predictedAwayScore ?? ''
  )
  const [saving, setSaving] = useState(false)

  const isFinished = match.status === 'FINISHED'
  const isLive     = match.status === 'LIVE'
  const canPredict = match.predictionOpen && match.status === 'SCHEDULED'

  // Keep inputs in sync if `existing` changes (e.g. parent refetches after submit)
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

  const closedMsg = () => {
    if (isFinished) return { icon: '🏁', title: 'Match has ended',   sub: 'Predictions are no longer accepted' }
    if (isLive)     return { icon: '🔴', title: 'Match is underway', sub: 'Prediction window closed before kick-off' }
    return              { icon: '🔒', title: 'Predictions closed',  sub: 'Window closes 5 min before kick-off' }
  }

  const clampScore = (val) => {
    const n = parseInt(val)
    if (isNaN(n)) return ''
    return Math.max(0, Math.min(20, n))
  }

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

          {/* Teams + score inputs */}
          <div className="flex items-center justify-between mb-5">
            {/* Home */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {match.homeCrest && (
                <img src={match.homeCrest} alt="" className="w-12 h-12 object-contain" />
              )}
              <span className="text-sm font-semibold text-white text-center leading-tight">
                {match.homeTeam}
              </span>
            </div>

            {/* Score inputs */}
            <div className="flex items-center gap-3 px-4">
              <input
                type="number"
                min={0} max={20}
                value={homeScore}
                placeholder="0"
                onChange={(e) => setHomeScore(clampScore(e.target.value))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
              <span className="text-2xl font-bold text-gray-500">:</span>
              <input
                type="number"
                min={0} max={20}
                value={awayScore}
                placeholder="0"
                onChange={(e) => setAwayScore(clampScore(e.target.value))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              />
            </div>

            {/* Away */}
            <div className="flex flex-col items-center gap-2 flex-1">
              {match.awayCrest && (
                <img src={match.awayCrest} alt="" className="w-12 h-12 object-contain" />
              )}
              <span className="text-sm font-semibold text-white text-center leading-tight">
                {match.awayTeam}
              </span>
            </div>
          </div>

          {/* Actual final/live score */}
          {(isFinished || isLive) && match.homeScore !== null && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 mb-4 text-center">
              <div className="text-xs text-gray-400 mb-1">
                {isLive ? 'Current Score' : 'Final Score'}
              </div>
              <div className="text-2xl font-black text-white">
                {match.homeScore} – {match.awayScore}
              </div>
            </div>
          )}

          {/* Existing prediction summary — shown when window is closed */}
          {existing && !canPredict && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3.5 mb-4">
              <div className="text-xs text-accent font-semibold mb-2">Your Prediction</div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-white tabular-nums">
                  {existing.predictedHomeScore} : {existing.predictedAwayScore}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Base <span className="text-white font-bold">{existing.basePoints ?? '—'}</span></span>
                  <span>Result <span className="text-white font-bold">{existing.outcomeBonus ?? '—'}</span></span>
                  <span>GD <span className="text-white font-bold">{existing.gdBonus ?? '—'}</span></span>
                  <span className="text-accent font-black text-sm">
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
