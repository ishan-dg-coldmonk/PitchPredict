import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Users, Check } from 'lucide-react'
import Navbar from '../components/Navbar'
import MatchCard from '../components/MatchCard'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'
import API from '../api/axios'
import toast from 'react-hot-toast'

export default function EventDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [rooms, setRooms] = useState([])
  const [matches, setMatches] = useState([])
  const [tab, setTab] = useState('rooms')
  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
  }, [id])

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoining(true)
    try {
      await API.post('/rooms/join', { eventId: Number(id), registrationCode: joinCode.trim() })
      toast.success('Joined room!')
      setJoinCode('')
      const r = await API.get(`/rooms/event/${id}`)
      setRooms(r.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to join')
    } finally {
      setJoining(false)
    }
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
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-8">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border mb-3 ${colors.bg} ${colors.text} ${colors.border}`}>
            {event.status}
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">{event.title}</h1>
          {event.description && <p className="text-gray-400 mb-4">{event.description}</p>}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(event.startDate)} – {formatDate(event.endDate)}</span>
            <span className="flex items-center gap-1.5"><Users size={14} />{event.roomCount || 0} rooms</span>
          </div>
        </motion.div>

        <div className="glass-card inline-flex p-1 mb-8 gap-1">
          {['rooms', 'matches'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'rooms' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <form onSubmit={handleJoin} className="flex gap-3 mb-8">
              <input
                type="text"
                placeholder="Enter room code to join..."
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="input-field flex-1"
              />
              <button type="submit" disabled={joining} className="btn-primary whitespace-nowrap">
                {joining ? 'Joining...' : 'Join Room'}
              </button>
            </form>

            {rooms.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-gray-500">No rooms yet</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room, i) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/rooms/${room.id}`} className="block glass-card-hover p-5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{room.name}</h3>
                        {room.userJoined && (
                          <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                            <Check size={12} /> Joined
                          </span>
                        )}
                      </div>
                      {room.description && <p className="text-sm text-gray-400 mb-3 line-clamp-2">{room.description}</p>}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Users size={12} /> {room.memberCount} members
                      </div>
                      <span className="text-primary text-sm font-medium mt-3 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                        Enter Room &rarr;
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'matches' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {matches.length === 0 ? (
              <div className="glass-card p-8 text-center"><p className="text-gray-500">No matches synced yet</p></div>
            ) : (
              matches.map((match) => <MatchCard key={match.id} match={match} />)
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
