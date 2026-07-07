import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

function ScorerRow({ entry, i }) {
  const tint = i === 0 ? 'text-gold' : i === 1 ? 'text-silver' : i === 2 ? 'text-bronze' : 'text-white'
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04 }}
      className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-2.5"
    >
      <span className={`w-5 text-center text-xs font-bold ${i < 3 ? tint : 'text-gray-500'}`}>{i + 1}</span>
      {entry.teamCrest && <img src={entry.teamCrest} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{entry.playerName}</div>
        <div className="text-[10px] text-gray-500 truncate">
          {entry.teamName}{entry.playedMatches ? ` · ${entry.playedMatches} apps` : ''}
        </div>
      </div>
      <div className={`text-xl font-black tabular-nums ${tint}`}>{entry.goals}</div>
    </motion.div>
  )
}

// Golden Boot winner — shown at the top once the event has ended.
function GoldenBootCard({ winner }) {
  if (!winner) return null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/15 via-[#1a1710] to-[#12121e] p-5 mb-5 text-center"
    >
      <div className="pointer-events-none absolute -top-16 -right-10 w-48 h-48 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative flex items-center justify-center gap-2 mb-3">
        <Sparkles size={14} className="text-gold" />
        <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">🥇 Golden Boot</span>
        <Sparkles size={14} className="text-gold" />
      </div>
      {winner.teamCrest && <img src={winner.teamCrest} className="w-12 h-12 mx-auto object-contain mb-2" alt="" />}
      <div className="relative text-lg font-black text-white">{winner.playerName}</div>
      <div className="relative text-xs text-gray-400">{winner.teamName}</div>
      <div className="relative text-gold font-black text-2xl mt-1">{winner.goals} ⚽</div>
    </motion.div>
  )
}

export default function StatsTab({ scorers, loading, eventEnded }) {
  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const list = scorers ?? []
  if (list.length === 0) {
    return <div className="py-16 text-center text-gray-500 text-sm">Top scorers aren’t available for this event yet.</div>
  }

  return (
    <div>
      {eventEnded && <GoldenBootCard winner={list[0]} />}

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-bold text-white">⚽ Top Scorers</span>
      </div>

      <div className="space-y-2">
        {list.map((e, i) => (
          <ScorerRow key={`${e.playerName}-${i}`} entry={e} i={i} />
        ))}
      </div>

      <p className="text-[11px] text-gray-500 px-1 mt-3">Updated daily (~1:00 PM IST)</p>
    </div>
  )
}
