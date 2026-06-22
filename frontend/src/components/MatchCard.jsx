import { MapPin, Clock } from 'lucide-react'
import LiveIndicator from './LiveIndicator'
import { formatDateTime, timeUntil } from '../utils/helpers'

export default function MatchCard({ match, onClick, children }) {
  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'
  const isPostponed = match.status === 'POSTPONED'
  const isCancelled = match.status === 'CANCELLED'
  const hasScore = (isLive || isFinished) && match.homeScore !== null

  return (
    <div
      onClick={onClick}
      className={`match-card cursor-pointer group ${isLive ? 'is-live' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5">
        <div className="flex items-center gap-2">
          {match.groupName && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 bg-primary/8 px-2 py-0.5 rounded">
              Group {match.groupName}
            </span>
          )}
          {match.stage && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {match.stage.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {children}
          {isLive ? (
            <LiveIndicator />
          ) : isFinished ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/8 px-2.5 py-0.5 rounded">
              FT
            </span>
          ) : isPostponed ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-2.5 py-0.5 rounded">
              PPD
            </span>
          ) : isCancelled ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded">
              CANC
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums text-primary/70 tracking-wide">
              <Clock size={10} className="opacity-60" />
              {timeUntil(match.matchDate)}
            </span>
          )}
        </div>
      </div>

      {/* Main body */}
      <div className="flex items-center px-5 py-4 gap-3">
        {/* Home team */}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {match.homeCrest && (
            <img
              src={match.homeCrest}
              alt=""
              className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-sm"
            />
          )}
          <span className="font-semibold text-[15px] text-white leading-tight truncate">
            {match.homeTeam}
          </span>
        </div>

        {/* Score / Time */}
        <div className="flex flex-col items-center justify-center min-w-[110px] px-2">
          {hasScore ? (
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-black tabular-nums leading-none ${isLive ? 'text-white' : 'text-white/90'}`}>
                {match.homeScore}
              </span>
              <span className="text-lg font-bold text-white/20 leading-none">:</span>
              <span className={`text-3xl font-black tabular-nums leading-none ${isLive ? 'text-white' : 'text-white/90'}`}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-medium text-gray-400 tabular-nums tracking-wide">
                {formatDateTime(match.matchDate)}
              </span>
              <span className="text-sm font-bold text-white/15 mt-0.5">VS</span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 flex items-center gap-3 justify-end min-w-0">
          <span className="font-semibold text-[15px] text-white leading-tight truncate text-right">
            {match.awayTeam}
          </span>
          {match.awayCrest && (
            <img
              src={match.awayCrest}
              alt=""
              className="w-8 h-8 object-contain flex-shrink-0 drop-shadow-sm"
            />
          )}
        </div>
      </div>

      {/* Venue */}
      {match.venue && (
        <div className="flex items-center gap-1.5 px-5 py-2 border-t border-white/[0.04]">
          <MapPin size={10} className="text-gray-600 flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate">{match.venue}</span>
        </div>
      )}
    </div>
  )
}
