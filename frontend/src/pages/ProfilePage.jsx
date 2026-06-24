import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Mail, Shield, Trophy, TrendingUp,
  Users, UserCheck, X, LogIn, Camera, Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import LeaderboardTable from '../components/LeaderboardTable'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import toast from 'react-hot-toast'

// ── Room Members modal ───────────────────────────────────────────────────────
function RoomMembersModal({ roomId, roomName, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/rooms/${roomId}/members`)
      .then((r) => setMembers(r.data))
      .finally(() => setLoading(false))
  }, [roomId])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-[#12121e] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Members</h3>
            <p className="text-xs text-gray-500 mt-0.5">{roomName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No members yet</p>
        ) : (
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={m.userId}
                className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3 border border-white/[0.04]">
                <span className="text-xs text-gray-600 w-5 text-center font-mono">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {m.profilePic
                    ? <img src={m.profilePic} alt="" className="w-full h-full object-cover" />
                    : m.username?.[0]?.toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{m.username}</div>
                  {m.fullName && <div className="text-xs text-gray-500 truncate">{m.fullName}</div>}
                </div>
                <div className="text-[10px] text-gray-600 text-right">
                  Joined<br />
                  {m.joinedAt
                    ? new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Room Leaderboard modal ───────────────────────────────────────────────────
function RoomLeaderboardModal({ roomId, roomName, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/rooms/${roomId}/leaderboard`)
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [roomId])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="bg-[#12121e] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Leaderboard</h3>
            <p className="text-xs text-gray-500 mt-0.5">{roomName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No predictions yet</p>
        ) : (
          <LeaderboardTable entries={entries} />
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main ProfilePage ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const navigate                = useNavigate()
  const fileRef                 = useRef()

  const [rooms, setRooms]                           = useState([])
  const [showingMembers, setShowingMembers]         = useState(null)
  const [showingLeaderboard, setShowingLeaderboard] = useState(null)
  const [uploadingPic, setUploadingPic]             = useState(false)

  useEffect(() => {
    API.get('/rooms/my').then((r) => setRooms(r.data))
  }, [])

  if (!user) return null

  // ── Profile pic upload ───────────────────────────────────────────────────
  const handlePicChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3 MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result // data:image/...;base64,...
      setUploadingPic(true)
      try {
        await updateProfile({ profilePic: base64 })
        toast.success('Profile picture updated!')
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to update picture')
      } finally {
        setUploadingPic(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const stats = [
    { icon: Trophy,     label: 'Rooms Joined', value: rooms.length },
    { icon: TrendingUp, label: 'Active',        value: rooms.filter((r) => r.userJoined).length },
  ]

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-20 pb-12 max-w-3xl mx-auto px-4">

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">

            {/* Avatar with edit button */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                {uploadingPic ? (
                  <Loader2 size={32} className="text-primary animate-spin" />
                ) : user.profilePic ? (
                  <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>

              {/* Camera overlay button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPic}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary hover:bg-primary-light rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={14} className="text-white" />
              </button>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePicChange}
                className="hidden"
              />
            </div>

            {/* User info */}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white">{user.fullName || user.username}</h1>
              <p className="text-gray-400 mt-0.5">@{user.username}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 justify-center sm:justify-start flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail size={14} /> {user.email}
                </span>
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  user.role === 'ADMIN'
                    ? 'bg-primary/20 text-primary-light'
                    : 'bg-white/10 text-gray-400'
                }`}>
                  <Shield size={12} /> {user.role}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Tap the camera icon to change your profile picture
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Stats ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 text-center"
            >
              <s.icon size={24} className="text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── My Rooms ─────────────────────────────────────────────────── */}
        <h2 className="text-xl font-bold text-white mb-4">My Rooms</h2>

        {rooms.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-gray-500">No rooms joined yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-4 border border-white/10"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Room info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{room.name}</h3>
                    {room.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{room.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Users size={12} />
                      {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      {room.maxMembers && (
                        <span className="text-gray-600">/ {room.maxMembers} max</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => setShowingLeaderboard({ id: room.id, name: room.name })}
                      className="flex items-center gap-1.5 text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-lg transition-colors border border-yellow-500/20"
                    >
                      <Trophy size={12} /> Leaderboard
                    </button>
                    <button
                      onClick={() => setShowingMembers({ id: room.id, name: room.name })}
                      className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors border border-primary/20"
                    >
                      <UserCheck size={12} /> Members
                    </button>
                    <button
                      onClick={() => navigate(`/rooms/${room.id}`)}
                      className="flex items-center gap-1.5 text-xs bg-white/8 hover:bg-white/15 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                    >
                      <LogIn size={12} /> Enter
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showingMembers && (
          <RoomMembersModal
            roomId={showingMembers.id}
            roomName={showingMembers.name}
            onClose={() => setShowingMembers(null)}
          />
        )}
        {showingLeaderboard && (
          <RoomLeaderboardModal
            roomId={showingLeaderboard.id}
            roomName={showingLeaderboard.name}
            onClose={() => setShowingLeaderboard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
