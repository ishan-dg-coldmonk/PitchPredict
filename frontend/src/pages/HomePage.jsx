import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar'
import HeroCarousel from '../components/HeroCarousel'
import EventCard from '../components/EventCard'
import API from '../api/axios'

const FILTERS = ['All', 'ACTIVE', 'UPCOMING', 'COMPLETED']

export default function HomePage() {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    API.get('/events').then((r) => setEvents(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'All' ? events : events.filter((e) => e.status === filter)

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-20 pb-12 max-w-7xl mx-auto px-4">
        <HeroCarousel events={events} />

        <div className="mt-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold gradient-text mb-8"
          >
            Events
          </motion.h2>

          <div className="glass-card inline-flex p-1 mb-8 gap-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f === 'All' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-gray-500">No events found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
