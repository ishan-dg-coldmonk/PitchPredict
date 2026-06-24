import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Users, Trophy } from 'lucide-react'
import { STATUS_COLORS } from '../utils/constants'
import { formatDate } from '../utils/helpers'

export default function EventCard({ event, index }) {
  const colors = STATUS_COLORS[event.status] || STATUS_COLORS.UPCOMING

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/events/${event.id}`} className="block group">
        <div className="glass-card-hover overflow-hidden">
          {/* Banner */}
          <div className="h-40 relative overflow-hidden">
            {event.bannerUrl ? (
              <img src={event.bannerUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/50 to-transparent" />
            <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
              {event.status}
            </span>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{event.title}</h3>

            {/* Prize badge */}
            {event.prize && (
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy size={13} className="text-yellow-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-yellow-400">{event.prize}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {formatDate(event.startDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {event.roomCount || 0} rooms
              </span>
            </div>

            <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
              Enter Contest <span>&rarr;</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
