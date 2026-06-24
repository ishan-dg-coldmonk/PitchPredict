import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Users, Check, Search, LogIn, Trophy } from 'lucide-react'
import Navbar from '../components/Navbar'
import MatchCard from '../components/MatchCard'
import JoinRoomModal from '../components/JoinRoomModal'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [event, setEvent]         = useState(null)
  const [rooms, setRooms]         = useState([])
  const [matches, setMatches]     = useState([])
  const [tab, setTab]             = useState('rooms')
  const [loading, setLoading]     = useState(true)
  const [searchQuery, setSearch]  = useState('')
  const [joinModalRoom, setJoinModalRoom] = useState(null)

  const loadData = () =>
    Promise.all([
      API.get(`/events/${id}`),
      API.get(`/rooms/event/${id}`),
      API.get(`/events/${id}/matches`),
    ])
      .then(([e, r, m]) => {
        setEvent(e.data)
        setRooms(r.data)
        setMatches(m.data)
      })
      .finally(() => setLoading(false))

  useEffect(() => { loadData() }, [id])

  // Filter rooms by name/description
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms
    const q = searchQuery.trim().toLowerCase()
    return rooms.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    )
  }, [rooms, searchQuery])

  const handleEnterRoom = (room) => {
    if (room.userJoined) {
      navigate(`/rooms/${room.id}`)
    } else {
      setJoinModalRoom(room)
    }
  }

  const handleJoined = async () => {
    const r = await API.get(`/rooms/event/${id}`)
    setRooms(r.data)
    if (joinModalRoom) navigate(`/rooms/${joinModalRoom.id}`)
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

  if (!event) return null

  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.UPCOMING

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />

      {/* ── Hero with banner background ─────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        {event.bannerUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center scale-105 blur-sm"
              style={{ backgroundImage: `url(${event.bannerUrl})` }}
            />
            {/* Dark overlay so text stays readable */}
            <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy" />
          </>
        )}
        {!event.bannerUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-navy" />
        )}

        {/* Hero content */}
        <div className="relative pt-28 pb-12 max-w-5xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border mb-4 ${colors.bg} ${colors.text} ${colors.border}`}>
              {event.status}
            </span>

            <h1 className="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">
              {event.title}
            </h1>

            {event.description && (
              <p className="text-gray-300 mb-4 max-w-2xl">{event.description}</p>
            )}

            {/* Prize */}
            {event.prize && (
              <div className="flex items-center gap-2 mb-4">
                <Trophy size={18} className="text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">{event.prize}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(event.startDate)} – {formatDate(event.endDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {event.roomCount || 0} rooms
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Page body ────────────────────────────────────────────────────── */}
      <div className="pb-12 max-w-5xl mx-auto px-4">

        {/* Tabs */}
        <div className="glass-card inline-flex p-1 mb-8 gap-1">
          {['rooms', 'matches'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Rooms tab ──────────────────────────────────────────────────── */}
        {tab === 'rooms' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search rooms by name…"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {filteredRooms.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-gray-500">
                  {searchQuery ? `No rooms found for "${searchQuery}"` : 'No rooms yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-5 flex flex-col gap-3 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">{room.name}</h3>
                      {room.userJoined && (
                        <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full flex-shrink-0">
                          <Check size={12} /> Joined
                        </span>
                      )}
                    </div>

                    {room.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 flex-1">{room.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users size={12} />
                      {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      {room.maxMembers && (
                        <span className="text-gray-600">/ {room.maxMembers} max</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleEnterRoom(room)}
                      className={`
                        mt-auto flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-semibold transition-all duration-200
                        ${room.userJoined
                          ? 'bg-primary/15 hover:bg-primary/25 text-primary border border-primary/25 hover:border-primary/50'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 hover:border-white/20'
                        }
                      `}
                    >
                      <LogIn size={14} />
                      {room.userJoined ? 'Enter Room' : 'Join & Enter'}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Matches tab ────────────────────────────────────────────────── */}
        {tab === 'matches' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {matches.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-gray-500">No matches synced yet</p>
              </div>
            ) : (
              matches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </motion.div>
        )}
      </div>

      {/* Join Room Modal */}
      <AnimatePresence>
        {joinModalRoom && (
          <JoinRoomModal
            key={joinModalRoom.id}
            room={joinModalRoom}
            eventId={id}
            onClose={() => setJoinModalRoom(null)}
            onJoined={handleJoined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
