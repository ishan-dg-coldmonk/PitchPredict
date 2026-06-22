import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import LiveIndicator from './LiveIndicator'
import { formatDateTime, timeUntil } from '../utils/helpers'

export default function HeroMatchCard({ match, prediction, onPredict, onViewAll }) {
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'
  const hasScore = (isLive || isFinished) && match.homeScore !== null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="hero-match relative overflow-hidden rounded-2xl mb-10 cursor-pointer"
      onClick={onPredict}
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16162a] to-[#0f0f1a]" />
      {isLive && <div className="absolute inset-0 bg-gradient-to-br from-red-950/30 via-transparent to-transparent" />}
      {!isLive && !isFinished && <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/5" />}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/5 rounded-full blur-[60px]" />

      <div className="relative z-10 p-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {match.groupName && (
              <span className="text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 border border-primary/15 px-3 py-1 rounded-full">
                Group {match.groupName}
              </span>
            )}
            {match.stage && (
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                {match.stage.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {isLive ? (
            <LiveIndicator />
          ) : isFinished ? (
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Full Time</span>
          ) : (
            <span className="text-xs font-semibold text-primary/80 bg-primary/8 border border-primary/10 px-3 py-1 rounded-full">
              {timeUntil(match.matchDate)}
            </span>
          )}
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex-1 flex flex-col items-center gap-3">
            {match.homeCrest ? (
              <img src={match.homeCrest} alt="" className="w-16 h-16 object-contain drop-shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold text-white/30">
                {match.homeTeam?.[0]}
              </div>
            )}
            <span className="text-base font-bold text-white text-center leading-tight">
              {match.homeTeam}
            </span>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center gap-2 min-w-[120px]">
            {hasScore ? (
              <div className="flex items-center gap-3">
                <span className="text-5xl font-black text-white tabular-nums leading-none">
                  {match.homeScore}
                </span>
                <span className="text-2xl font-bold text-white/15">:</span>
                <span className="text-5xl font-black text-white tabular-nums leading-none">
                  {match.awayScore}
                </span>
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-400 tabular-nums">
                  {formatDateTime(match.matchDate)}
                </span>
                <span className="text-3xl font-black text-white/10">VS</span>
              </>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 flex flex-col items-center gap-3">
            {match.awayCrest ? (
              <img src={match.awayCrest} alt="" className="w-16 h-16 object-contain drop-shadow-lg" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl font-bold text-white/30">
                {match.awayTeam?.[0]}
              </div>
            )}
            <span className="text-base font-bold text-white text-center leading-tight">
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {prediction ? (
            <>
              <span className="text-sm font-bold tabular-nums bg-accent/10 text-accent border border-accent/20 px-4 py-1.5 rounded-full">
                Your pick: {prediction.predictedHomeScore}:{prediction.predictedAwayScore}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onViewAll?.() }}
                className="text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors"
              >
                View All
              </button>
            </>
          ) : match.predictionOpen && match.status === 'SCHEDULED' ? (
            <button className="flex items-center gap-2 text-sm font-bold text-white bg-primary hover:bg-primary-light px-6 py-2.5 rounded-full shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 active:scale-95">
              <Zap size={14} /> Make Your Prediction
            </button>
          ) : null}
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="text-center mt-4">
            <span className="text-[11px] text-gray-600">{match.venue}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
