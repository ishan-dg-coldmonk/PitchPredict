import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { formatDateTime } from '../utils/helpers'
import API from '../api/axios'
import toast from 'react-hot-toast'

export default function PredictionModal({ match, roomId, eventId, existing, onClose, onSaved }) {
  const [homeScore, setHomeScore] = useState(existing?.predictedHomeScore ?? 0)
  const [awayScore, setAwayScore] = useState(existing?.predictedAwayScore ?? 0)
  const [saving, setSaving] = useState(false)

  const canPredict = match.predictionOpen && match.status === 'SCHEDULED'

  useEffect(() => {
    if (existing) {
      setHomeScore(existing.predictedHomeScore)
      setAwayScore(existing.predictedAwayScore)
    }
  }, [existing])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await API.post('/predictions', {
        matchId: match.id,
        eventId,
        roomId,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
      })
      toast.success('Prediction saved!')
      onSaved?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save prediction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {match.groupName && <span>Group {match.groupName}</span>}
                {match.stage && <span>{match.stage.replace(/_/g, ' ')}</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">{formatDateTime(match.matchDate)}</div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col items-center gap-2 flex-1">
              {match.homeCrest && <img src={match.homeCrest} alt="" className="w-12 h-12 object-contain" />}
              <span className="text-sm font-semibold text-white text-center">{match.homeTeam}</span>
            </div>

            <div className="flex items-center gap-3 px-4">
              <input
                type="number"
                min={0}
                max={20}
                value={homeScore}
                onChange={(e) => setHomeScore(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
              />
              <span className="text-2xl font-bold text-gray-500">:</span>
              <input
                type="number"
                min={0}
                max={20}
                value={awayScore}
                onChange={(e) => setAwayScore(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                disabled={!canPredict}
                className="w-16 h-16 bg-white/5 border border-white/10 rounded-xl text-center text-3xl font-black text-white focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col items-center gap-2 flex-1">
              {match.awayCrest && <img src={match.awayCrest} alt="" className="w-12 h-12 object-contain" />}
              <span className="text-sm font-semibold text-white text-center">{match.awayTeam}</span>
            </div>
          </div>

          {existing && (
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-4">
              <div className="text-xs text-accent mb-1 font-semibold">Your Prediction</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white font-bold">{existing.predictedHomeScore} : {existing.predictedAwayScore}</span>
                <div className="flex gap-2 text-xs text-gray-400">
                  <span>Base: <span className="text-white">{existing.basePoints}</span></span>
                  <span>Result: <span className="text-white">{existing.outcomeBonus}</span></span>
                  <span>GD: <span className="text-white">{existing.gdBonus}</span></span>
                  <span className="text-accent font-bold">= {existing.points} pts</span>
                </div>
              </div>
            </div>
          )}

          {canPredict ? (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : existing ? 'Update Prediction' : 'Submit Prediction'}
            </button>
          ) : (
            <div className="text-center text-sm text-gray-500 bg-white/5 rounded-xl p-3">
              {match.status !== 'SCHEDULED' ? 'Match already started' : 'Prediction window is closed'}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
