import { motion } from 'framer-motion'
import { Crown, Medal, Award } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const RANK_CONFIG = {
  1: { icon: Crown, color: 'text-gold', bg: 'bg-gold/10 border-gold/30' },
  2: { icon: Medal, color: 'text-silver', bg: 'bg-silver/10 border-silver/30' },
  3: { icon: Award, color: 'text-bronze', bg: 'bg-bronze/10 border-bronze/30' },
}

export default function LeaderboardTable({ entries }) {
  const { user } = useAuth()

  if (!entries || entries.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-500">No predictions yet. Be the first!</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const config = RANK_CONFIG[entry.rank]
        const RankIcon = config?.icon
        const isMe = user?.id === entry.userId

        return (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`glass-card p-4 flex items-center gap-4 ${
              isMe ? 'border-primary/40 bg-primary/5' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              config ? `${config.bg} border ${config.color}` : 'bg-white/5 text-gray-400'
            }`}>
              {RankIcon ? <RankIcon size={18} /> : entry.rank}
            </div>

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
              {entry.profilePic ? (
                <img src={entry.profilePic} alt="" className="w-full h-full object-cover" />
              ) : (
                entry.username?.[0]?.toUpperCase()
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">
                {entry.username} {isMe && <span className="text-primary text-xs">(You)</span>}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                {entry.matchesPredicted} pred &middot; {entry.exactScores} exact &middot; {entry.correctOutcomes} corr
              </div>
            </div>

            <div className={`text-xl font-black tabular-nums ${
              entry.rank === 1 ? 'text-gold' : entry.rank === 2 ? 'text-silver' : entry.rank === 3 ? 'text-bronze' : 'text-white'
            }`}>
              {entry.totalPoints}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
