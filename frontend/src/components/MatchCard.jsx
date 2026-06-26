import { useState, useEffect, useMemo } from 'react'
import { MapPin, Clock } from 'lucide-react'
import LiveIndicator from './LiveIndicator'
import { formatTimeIST } from '../utils/helpers'

const CLOSE_BEFORE_KICKOFF_MS = 5 * 60 * 1000    // 5 min
const COUNTDOWN_SHOW_BELOW_MS = 30 * 60 * 1000   // show countdown when < 30 min remain

function timeUntilKickoff(matchDate) {
  const diff = new Date(matchDate).getTime() - Date.now()
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

/**
 * Inline countdown that only renders when the prediction window
 * is open and fewer than 30 minutes remain until it closes.
 * Updates every second entirely in the browser — no backend calls.
 */
function PredictionWindowCountdown({ matchDate }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const kickoff  = useMemo(() => new Date(matchDate).getTime(), [matchDate])
  const deadline = kickoff - CLOSE_BEFORE_KICKOFF_MS
  const remaining = deadline - now

  if (remaining <= 0 || remaining > COUNTDOWN_SHOW_BELOW_MS) return null

  const m = Math.floor(remaining / 60000)
  const s = Math.floor((remaining % 60000) / 1000)

  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded tabular-nums">
      <Clock size={9} />
      Closes {m}m{String(s).padStart(2, '0')}s
    </span>
  )
}

export default function MatchCard({ match, onClick, children }) {
  const isLive      = match.status === 'LIVE'
  const isFinished  = match.status === 'FINISHED'
  const isPostponed = match.status === 'POSTPONED'
  const isCancelled = match.status === 'CANCELLED'
  const isScheduled = match.status === 'SCHEDULED'
  const hasScore    = (isLive || isFinished) && match.homeScore !== null

  // predictionOpen is computed server-side but we also mirror it here
  // so the countdown only shows when the window is actually open
  const isPredictionOpen = match.predictionOpen && isScheduled

  return (
    <div
      onClick={onClick}
      className={`match-card cursor-pointer group ${isLive ? 'is-live' : ''}`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          {match.groupName && (
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-primary/80 bg-primary/8 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
              Grp {match.groupName}
            </span>
          )}
          {match.stage && (
            <span className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-gray-500 truncate hidden sm:block">
              {match.stage.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Slot for parent-injected badges */}
          {children}

          {/* Prediction-close countdown (frontend-only, no polling) */}
          {isPredictionOpen && (
            <PredictionWindowCountdown matchDate={match.matchDate} />
          )}

          {isLive ? (
            <LiveIndicator />
          ) : isFinished ? (
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/8 px-2.5 py-0.5 rounded">
              FT
            </span>
          ) : isPostponed ? (
            <span className="text-[10px] font-bold uppercase text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">
              PPD
            </span>
          ) : isCancelled ? (
            <span className="text-[10px] font-bold uppercase text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
              CANC
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold tabular-nums text-primary/70">
              <Clock size={9} className="opacity-60" />
              {timeUntilKickoff(match.matchDate) ?? 'Starting'}
            </span>
          )}
        </div>
      </div>

      {/* ── Teams + score ─────────────────────────────────────────── */}
      <div className="flex items-center px-4 sm:px-5 py-3 sm:py-4 gap-2 sm:gap-3">
        {/* Home */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
          {match.homeCrest && (
            <img src={match.homeCrest} alt="" className="w-7 sm:w-8 h-7 sm:h-8 object-contain flex-shrink-0 drop-shadow-sm" />
          )}
          <span className="font-semibold text-[13px] sm:text-[15px] text-white leading-tight truncate">
            {match.homeTeam}
          </span>
        </div>

        {/* Score / time */}
        <div className="flex flex-col items-center justify-center min-w-[80px] sm:min-w-[110px] px-1 sm:px-2">
          {hasScore ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${isLive ? 'text-white' : 'text-white/90'}`}>
                {match.homeScore}
              </span>
              <span className="text-base sm:text-lg font-bold text-white/20 leading-none">:</span>
              <span className={`text-2xl sm:text-3xl font-black tabular-nums leading-none ${isLive ? 'text-white' : 'text-white/90'}`}>
                {match.awayScore}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-400 tabular-nums">
                {formatTimeIST(match.matchDate)} IST
              </span>
              <span className="text-xs font-bold text-white/15 mt-0.5">VS</span>
            </div>
          )}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 justify-end min-w-0">
          <span className="font-semibold text-[13px] sm:text-[15px] text-white leading-tight truncate text-right">
            {match.awayTeam}
          </span>
          {match.awayCrest && (
            <img src={match.awayCrest} alt="" className="w-7 sm:w-8 h-7 sm:h-8 object-contain flex-shrink-0 drop-shadow-sm" />
          )}
        </div>
      </div>

      {/* ── Venue ─────────────────────────────────────────────────── */}
      {match.venue && (
        <div className="flex items-center gap-1.5 px-4 sm:px-5 py-2 border-t border-white/[0.04]">
          <MapPin size={10} className="text-gray-600 flex-shrink-0" />
          <span className="text-[10px] text-gray-500 truncate">{match.venue}</span>
        </div>
      )}
    </div>
  )
}
