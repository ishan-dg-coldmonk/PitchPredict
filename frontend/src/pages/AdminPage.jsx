import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Plus, RefreshCw, Play, Square, Users,
  ChevronDown, ChevronUp, Trophy, UserCheck, X, ArrowLeft,
} from 'lucide-react'
import Navbar from '../components/Navbar'
import LeaderboardTable from '../components/LeaderboardTable'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import API from '../api/axios'
import toast from 'react-hot-toast'

// ── small sub-components ────────────────────────────────────────────────────

function RoomMembersPanel({ roomId, roomName, onClose }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/admin/rooms/${roomId}/members`)
      .then((r) => setMembers(r.data))
      .finally(() => setLoading(false))
  }, [roomId])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#12121e] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
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
              <div key={m.userId} className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3 border border-white/[0.04]">
                <span className="text-xs text-gray-600 w-5 text-center font-mono">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0">
                  {m.profilePic
                    ? <img src={m.profilePic} alt="" className="w-full h-full object-cover" />
                    : m.username?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{m.username}</div>
                  {m.fullName && <div className="text-xs text-gray-500 truncate">{m.fullName}</div>}
                </div>
                <div className="text-[10px] text-gray-600 text-right">
                  Joined<br />
                  {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function RoomLeaderboardPanel({ roomId, roomName, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get(`/admin/rooms/${roomId}/leaderboard`)
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false))
  }, [roomId])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
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
      </div>
    </motion.div>
  )
}

// ── event row with expandable rooms ─────────────────────────────────────────

function EventRow({ event, onReload }) {
  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.UPCOMING
  const [expanded, setExpanded] = useState(false)
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(false)
  const [roomsLoaded, setRoomsLoaded] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [roomForm, setRoomForm] = useState(null)
  const [showingMembers, setShowingMembers] = useState(null)   // { id, name }
  const [showingLeaderboard, setShowingLeaderboard] = useState(null) // { id, name }

  const loadRooms = async () => {
    if (roomsLoaded) return
    setRoomsLoading(true)
    try {
      const r = await API.get(`/admin/events/${event.id}/rooms`)
      setRooms(r.data)
      setRoomsLoaded(true)
    } finally {
      setRoomsLoading(false)
    }
  }

  const toggleExpand = () => {
    if (!expanded) loadRooms()
    setExpanded((v) => !v)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await API.post(`/admin/events/${event.id}/sync-matches`)
      toast.success(`Synced ${res.data.synced} matches`)
      onReload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleActivate = async () => {
    await API.post(`/admin/events/${event.id}/activate`)
    toast.success('Event activated')
    onReload()
  }

  const handleFinish = async () => {
    if (!window.confirm('Mark this event as completed?')) return
    await API.post(`/admin/events/${event.id}/finish`)
    toast.success('Event completed')
    onReload()
  }

  const handleCreateRoom = async () => {
    if (!roomForm?.name || !roomForm?.registrationCode) {
      toast.error('Name and registration code are required')
      return
    }
    try {
      await API.post('/admin/rooms', { eventId: event.id, ...roomForm })
      toast.success('Room created!')
      setRoomForm(null)
      setRoomsLoaded(false)
      loadRooms()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create room')
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5"
      >
        {/* Event header row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-white truncate">{event.title}</h3>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                {event.status}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDate(event.startDate)} – {formatDate(event.endDate)}
              &nbsp;&middot;&nbsp;{event.roomCount || 0} rooms
              &nbsp;&middot;&nbsp;{event.matchCount || 0} matches
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> Sync
            </button>

            <button
              onClick={() => setRoomForm(roomForm ? null : { name: '', description: '', registrationCode: '', maxMembers: '' })}
              className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
            >
              <Users size={14} /> + Room
            </button>

            {event.status === 'UPCOMING' && (
              <button onClick={handleActivate} className="flex items-center gap-1.5 text-xs bg-accent/20 hover:bg-accent/30 text-accent px-3 py-2 rounded-lg transition-colors">
                <Play size={14} /> Activate
              </button>
            )}
            {event.status === 'ACTIVE' && (
              <button onClick={handleFinish} className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-colors">
                <Square size={14} /> Finish
              </button>
            )}

            {/* Expand/collapse rooms */}
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1.5 text-xs bg-primary/15 hover:bg-primary/25 text-primary px-3 py-2 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Rooms
            </button>
          </div>
        </div>

        {/* Create room inline form */}
        <AnimatePresence>
          {roomForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">New Room</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  placeholder="Room Name *"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field"
                />
                <input
                  placeholder="Registration Code *"
                  value={roomForm.registrationCode}
                  onChange={(e) => setRoomForm((f) => ({ ...f, registrationCode: e.target.value }))}
                  className="input-field"
                />
                <input
                  placeholder="Description"
                  value={roomForm.description}
                  onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Max Members (optional)"
                  value={roomForm.maxMembers}
                  onChange={(e) => setRoomForm((f) => ({ ...f, maxMembers: e.target.value }))}
                  className="input-field"
                />
              </div>
              <button onClick={handleCreateRoom} className="btn-accent mt-3 text-sm">
                Create Room
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rooms list */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
            >
              {roomsLoading ? (
                <div className="py-6 flex justify-center">
                  <div className="w-7 h-7 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : rooms.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No rooms created yet</p>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between gap-3 bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">{room.name}</div>
                        {room.description && (
                          <div className="text-xs text-gray-500 truncate mt-0.5">{room.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                          <Users size={11} />
                          {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                          {room.maxMembers && ` / ${room.maxMembers} max`}
                          <span className="text-gray-700">&middot;</span>
                          <span className="font-mono text-gray-600">Code: {room.registrationCode}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setShowingLeaderboard({ id: room.id, name: room.name })}
                          className="flex items-center gap-1.5 text-xs bg-gold/10 hover:bg-gold/20 text-gold px-3 py-1.5 rounded-lg transition-colors border border-gold/20"
                        >
                          <Trophy size={12} /> Leaderboard
                        </button>
                        <button
                          onClick={() => setShowingMembers({ id: room.id, name: room.name })}
                          className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-lg transition-colors border border-primary/20"
                        >
                          <UserCheck size={12} /> Members
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showingMembers && (
          <RoomMembersPanel
            roomId={showingMembers.id}
            roomName={showingMembers.name}
            onClose={() => setShowingMembers(null)}
          />
        )}
        {showingLeaderboard && (
          <RoomLeaderboardPanel
            roomId={showingLeaderboard.id}
            roomName={showingLeaderboard.name}
            onClose={() => setShowingLeaderboard(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Main AdminPage ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [events, setEvents] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', apiCompId: '', startDate: '', endDate: '',
    predictableStages: '', bannerUrl: '',
  })

  const loadEvents = () => API.get('/events').then((r) => setEvents(r.data))
  useEffect(() => { loadEvents() }, [])

  const handleCreateEvent = async (e) => {
    e.preventDefault()
    try {
      await API.post('/admin/events', form)
      toast.success('Event created!')
      setForm({ title: '', description: '', apiCompId: '', startDate: '', endDate: '', predictableStages: '', bannerUrl: '' })
      setShowCreate(false)
      loadEvents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create')
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="text-primary" size={28} />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Event
          </button>
        </div>

        {/* Create event form */}
        <AnimatePresence>
          {showCreate && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreateEvent}
              className="glass-card p-6 mb-8 overflow-hidden"
            >
              <h2 className="text-lg font-bold text-white mb-4">Create Event</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
                <input placeholder="API Competition ID (e.g. 2000)" value={form.apiCompId} onChange={(e) => setForm({ ...form, apiCompId: e.target.value })} className="input-field" />
                <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field md:col-span-2" />
                <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required />
                <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-field" required />
                <input placeholder="Predictable Stages (e.g. GROUP_STAGE,ROUND_OF_16)" value={form.predictableStages} onChange={(e) => setForm({ ...form, predictableStages: e.target.value })} className="input-field" />
                <input placeholder="Banner URL" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-field" />
              </div>
              <button type="submit" className="btn-primary mt-4">Create Event</button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Events list */}
        <div className="space-y-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} onReload={loadEvents} />
          ))}
        </div>
      </div>
    </div>
  )
}
