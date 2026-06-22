import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Users, ArrowRight, Loader2 } from 'lucide-react'
import API from '../api/axios'
import toast from 'react-hot-toast'

export default function JoinRoomModal({ room, eventId, onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Please enter the registration code')
      return
    }
    setJoining(true)
    setError('')
    try {
      await API.post('/rooms/join', {
        eventId: Number(eventId),
        registrationCode: code.trim(),
      })
      toast.success(`Joined "${room.name}"!`)
      onJoined?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid code. Please try again.'
      setError(msg)
    } finally {
      setJoining(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleJoin()
    if (e.key === 'Escape') onClose()
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
          initial={{ opacity: 0, scale: 0.93, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 24 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
          className="glass-card p-7 w-full max-w-sm relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>

          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center mb-5 mx-auto">
            <Lock size={24} className="text-primary" />
          </div>

          {/* Room info */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">Enter Room</h2>
            <p className="text-sm text-gray-400">
              <span className="text-white font-semibold">{room.name}</span>
            </p>
            {room.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{room.description}</p>
            )}
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-500">
              <Users size={12} />
              {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
              {room.maxMembers && ` / ${room.maxMembers} max`}
            </div>
          </div>

          {/* Code input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Registration Code
            </label>
            <input
              type="text"
              placeholder="Enter the secret code…"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              autoFocus
              className={`
                input-field text-center text-lg font-bold tracking-[0.15em] uppercase
                ${error ? 'border-red-500/50 focus:border-red-500/70' : ''}
              `}
            />
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs mt-2 text-center"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Action */}
          <button
            onClick={handleJoin}
            disabled={joining || !code.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                Join Room <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-600 mt-3">
            Ask the room admin for the registration code
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
