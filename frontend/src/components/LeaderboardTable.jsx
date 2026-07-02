import { motion } from 'framer-motion'
import { Crown, Medal, Award, Trophy, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const RANK_CONFIG = {
  1: { icon: Crown, color: 'text-gold', bg: 'bg-gold/10 border-gold/30' },
  2: { icon: Medal, color: 'text-silver', bg: 'bg-silver/10 border-silver/30' },
  3: { icon: Award, color: 'text-bronze', bg: 'bg-bronze/10 border-bronze/30' },
}

// Celebratory winner card shown at the top of the leaderboard once an event ends.
function ChampionCard({ winner, roomName, prize, isMe }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 via-[#1a1710] to-[#12121e] p-5 sm:p-6 mb-5"
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-gold/20 blur-3xl" />

      <div className="relative flex items-center justify-center gap-2 mb-4">
        <Sparkles size={14} className="text-gold" />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">Champion</span>
        <Sparkles size={14} className="text-gold" />
      </div>

      <div className="relative flex items-center gap-4">
        {/* crowned avatar */}
        <div className="relative flex-shrink-0">
          <Crown size={20} className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold drop-shadow" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/40 to-amber-600/30 ring-2 ring-gold/50 flex items-center justify-center text-2xl font-black text-white overflow-hidden">
            {winner.profilePic
              ? <img src={winner.profilePic} alt="" className="w-full h-full object-cover" />
              : winner.username?.[0]?.toUpperCase()}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-lg sm:text-xl font-black text-white truncate">
            {winner.username}
            {isMe && <span className="text-gold text-sm ml-1.5">(You!)</span>}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {roomName ? `Winner of ${roomName}` : 'Room winner'}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500">
            <span>{winner.matchesPredicted} predicted</span>
            <span>{winner.exactScores} exact</span>
            <span>{winner.correctOutcomes} correct</span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-3xl sm:text-4xl font-black text-gold tabular-nums leading-none">
            {winner.totalPoints}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-gold/70 font-bold mt-0.5">points</div>
        </div>
      </div>

      {prize && (
        <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-gold/10 border border-gold/20 px-3 py-2">
          <Trophy size={14} className="text-gold flex-shrink-0" />
          <span className="text-xs sm:text-sm font-semibold text-gold">Takes home {prize}</span>
        </div>
      )}

      <div className="relative mt-3 text-center text-[11px] text-gray-500">
        🎉 The event has ended — these results are final.
      </div>
    </motion.div>
  )
}

export default function LeaderboardTable({ entries, eventStatus, roomName, prize }) {
  const { user } = useAuth()

  if (!entries || entries.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-gray-500">No predictions yet. Be the first!</p>
      </div>
    )
  }

  const showChampion = eventStatus === 'COMPLETED'

  return (
    <div className="space-y-2">
      {showChampion && (
        <ChampionCard
          winner={entries[0]}
          roomName={roomName}
          prize={prize}
          isMe={user?.id === entries[0].userId}
        />
      )}

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
