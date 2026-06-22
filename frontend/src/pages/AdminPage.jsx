import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Plus, RefreshCw, Play, Square, Users } from 'lucide-react'
import Navbar from '../components/Navbar'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'
import API from '../api/axios'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const [events, setEvents] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [roomForm, setRoomForm] = useState({})
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

  const handleSync = async (eventId) => {
    setSyncing((s) => ({ ...s, [eventId]: true }))
    try {
      const res = await API.post(`/admin/events/${eventId}/sync-matches`)
      toast.success(`Synced ${res.data.synced} matches`)
      loadEvents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sync failed')
    } finally {
      setSyncing((s) => ({ ...s, [eventId]: false }))
    }
  }

  const handleActivate = async (id) => {
    await API.post(`/admin/events/${id}/activate`)
    toast.success('Event activated')
    loadEvents()
  }

  const handleFinish = async (id) => {
    if (!window.confirm('Mark this event as completed?')) return
    await API.post(`/admin/events/${id}/finish`)
    toast.success('Event completed')
    loadEvents()
  }

  const handleCreateRoom = async (eventId) => {
    const rf = roomForm[eventId]
    if (!rf?.name || !rf?.registrationCode) {
      toast.error('Name and registration code are required')
      return
    }
    try {
      await API.post('/admin/rooms', { eventId, ...rf })
      toast.success('Room created!')
      setRoomForm((prev) => ({ ...prev, [eventId]: null }))
      loadEvents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create room')
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
                <input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" required />
                <input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-field" required />
                <input placeholder="Predictable Stages (e.g. GROUP_STAGE,ROUND_OF_16)" value={form.predictableStages} onChange={(e) => setForm({ ...form, predictableStages: e.target.value })} className="input-field" />
                <input placeholder="Banner URL" value={form.bannerUrl} onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })} className="input-field" />
              </div>
              <button type="submit" className="btn-primary mt-4">Create Event</button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {events.map((event) => {
            const colors = STATUS_COLORS[event.status] || STATUS_COLORS.UPCOMING
            const rf = roomForm[event.id]
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">{event.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {event.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(event.startDate)} – {formatDate(event.endDate)} &middot; {event.roomCount || 0} rooms &middot; {event.matchCount || 0} matches
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleSync(event.id)}
                      disabled={syncing[event.id]}
                      className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <RefreshCw size={14} className={syncing[event.id] ? 'animate-spin' : ''} /> Sync
                    </button>
                    <button
                      onClick={() => setRoomForm((prev) => ({ ...prev, [event.id]: prev[event.id] ? null : { name: '', description: '', registrationCode: '', maxMembers: '' } }))}
                      className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors"
                    >
                      <Users size={14} /> + Room
                    </button>
                    {event.status === 'UPCOMING' && (
                      <button onClick={() => handleActivate(event.id)} className="flex items-center gap-1.5 text-xs bg-accent/20 hover:bg-accent/30 text-accent px-3 py-2 rounded-lg transition-colors">
                        <Play size={14} /> Activate
                      </button>
                    )}
                    {event.status === 'ACTIVE' && (
                      <button onClick={() => handleFinish(event.id)} className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg transition-colors">
                        <Square size={14} /> Finish
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {rf && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input placeholder="Room Name *" value={rf.name} onChange={(e) => setRoomForm((prev) => ({ ...prev, [event.id]: { ...prev[event.id], name: e.target.value } }))} className="input-field" />
                        <input placeholder="Registration Code *" value={rf.registrationCode} onChange={(e) => setRoomForm((prev) => ({ ...prev, [event.id]: { ...prev[event.id], registrationCode: e.target.value } }))} className="input-field" />
                        <input placeholder="Description" value={rf.description} onChange={(e) => setRoomForm((prev) => ({ ...prev, [event.id]: { ...prev[event.id], description: e.target.value } }))} className="input-field" />
                        <input type="number" placeholder="Max Members (optional)" value={rf.maxMembers} onChange={(e) => setRoomForm((prev) => ({ ...prev, [event.id]: { ...prev[event.id], maxMembers: e.target.value } }))} className="input-field" />
                      </div>
                      <button onClick={() => handleCreateRoom(event.id)} className="btn-accent mt-3 text-sm">Create Room</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
