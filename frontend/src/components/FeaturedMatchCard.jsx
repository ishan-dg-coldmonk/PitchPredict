import { motion } from 'framer-motion'
import { MapPin, Clock } from 'lucide-react'
import LiveIndicator from './LiveIndicator'
import { formatDateTimeIST, timeUntil } from '../utils/helpers'

export default function FeaturedMatchCard({ match, onClick }) {
  if (!match) return null

  const isLive     = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'
  const hasScore   = (isLive || isFinished) && match.homeScore !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      className={`
        relative w-full cursor-pointer rounded-2xl overflow-hidden border
        transition-all duration-300 group
        ${isLive
          ? 'border-red-500/30 bg-gradient-to-br from-red-950/40 via-[#12121e] to-[#0f0f1a] shadow-xl shadow-red-900/20 hover:border-red-500/50'
          : 'border-primary/20 bg-gradient-to-br from-primary/10 via-[#12121e] to-[#0f0f1a] shadow-xl shadow-primary/10 hover:border-primary/40'
        }
      `}
    >
      {/* Ambient glow */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none bg-radial-glow ${isLive ? 'from-red-600/30' : 'from-primary/20'}`} />

      {/* Top strip */}
      <div className="relative flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          {match.stage && (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {match.stage.replace(/_/g, ' ')}
            </span>
          )}
          {match.groupName && (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Group {match.groupName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLive && <LiveIndicator />}
          {isFinished && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/8 px-2.5 py-1 rounded-full">
              FT
            </span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="relative flex items-center justify-between px-6 py-6 gap-4">
        {/* Home */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {match.homeCrest ? (
            <img src={match.homeCrest} alt={match.homeTeam} className="w-14 sm:w-20 h-14 sm:h-20 object-contain drop-shadow-2xl" />
          ) : (
            <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-lg sm:text-2xl font-black text-white/60">
              {match.homeTeam?.[0]}
            </div>
          )}
          <span className="text-sm sm:text-base font-bold text-white text-center leading-tight px-2">
            {match.homeTeam}
          </span>
          {match.homeFlag && <span className="text-xl sm:text-2xl">{match.homeFlag}</span>}
        </div>

        {/* Centre */}
        <div className="flex flex-col items-center justify-center min-w-[100px] sm:min-w-[130px]">
          {hasScore ? (
            <>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-3xl sm:text-5xl font-black tabular-nums leading-none text-white">{match.homeScore}</span>
                <span className="text-lg sm:text-2xl font-bold text-white/20">:</span>
                <span className="text-3xl sm:text-5xl font-black tabular-nums leading-none text-white">{match.awayScore}</span>
              </div>
              {isLive && (
                <div className="mt-2 flex items-center gap-1.5 text-red-400 text-xs font-bold">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-live-blink" />
                  LIVE
                </div>
              )}
              {isFinished && (
                <div className="mt-2 text-[11px] text-gray-500 font-semibold uppercase tracking-widest">Full Time</div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="text-3xl font-black text-white/10 tracking-widest">VS</div>
              <div className="flex items-center gap-1.5 text-primary/80 text-sm font-semibold">
                <Clock size={13} />
                {timeUntil(match.matchDate)}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                {formatDateTimeIST(match.matchDate)} IST
              </div>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex flex-col items-center gap-3">
          {match.awayCrest ? (
            <img src={match.awayCrest} alt={match.awayTeam} className="w-14 sm:w-20 h-14 sm:h-20 object-contain drop-shadow-2xl" />
          ) : (
            <div className="w-14 sm:w-20 h-14 sm:h-20 rounded-full bg-white/10 flex items-center justify-center text-lg sm:text-2xl font-black text-white/60">
              {match.awayTeam?.[0]}
            </div>
          )}
          <span className="text-sm sm:text-base font-bold text-white text-center leading-tight px-2">
            {match.awayTeam}
          </span>
          {match.awayFlag && <span className="text-xl sm:text-2xl">{match.awayFlag}</span>}
        </div>
      </div>

      {/* Venue */}
      {match.venue && (
        <div className="relative flex items-center gap-2 px-6 py-3 border-t border-white/[0.06]">
          <MapPin size={11} className="text-gray-600 flex-shrink-0" />
          <span className="text-[11px] text-gray-500 truncate">{match.venue}</span>
        </div>
      )}

      {/* Hover shimmer */}
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl" />
    </motion.div>
  )
}
