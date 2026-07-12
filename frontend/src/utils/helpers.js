// ── Points ─────────────────────────────────────────────────────────────────
//
// Mirrors the backend PointsCalculationService exactly so we can show LIVE
// projected points ("if it ends now") from the current score. Keep in sync with
// PointsCalculationService.calculatePointsForMatch.
//
//   base    = max(0, 10 − 2 × (|Δhome| + |Δaway|))         → up to 10
//   outcome = +4 if the W/D/L result matches
//   gd      = +3 if the exact goal difference matches
//   penalty = shootout only: +5 right advancer, +max(0,3−penDiff) closeness  → up to +8
export function computePoints(pred, actualHome, actualAway, opts = {}) {
  if (pred == null || actualHome == null || actualAway == null) return null
  const ph = pred.predictedHomeScore
  const pa = pred.predictedAwayScore
  if (ph == null || pa == null) return null

  const diff    = Math.abs(ph - actualHome) + Math.abs(pa - actualAway)
  const base    = Math.max(0, 10 - 2 * diff)
  const outcome = Math.sign(ph - pa) === Math.sign(actualHome - actualAway) ? 4 : 0
  const gd      = (ph - pa) === (actualHome - actualAway) ? 3 : 0

  let penaltyBonus = 0
  const { penaltyHome, penaltyAway, duration } = opts
  const shootout = duration === 'PENALTY_SHOOTOUT' && penaltyHome != null && penaltyAway != null
  if (shootout && ph === pa && pred.predictedPenaltyHome != null && pred.predictedPenaltyAway != null) {
    const penWinner = Math.sign(pred.predictedPenaltyHome - pred.predictedPenaltyAway)
                      === Math.sign(penaltyHome - penaltyAway) ? 5 : 0
    const penDiff = Math.abs(pred.predictedPenaltyHome - penaltyHome)
                    + Math.abs(pred.predictedPenaltyAway - penaltyAway)
    penaltyBonus = penWinner + Math.max(0, 3 - penDiff)
  }

  return { base, outcome, gd, penaltyBonus, total: base + outcome + gd + penaltyBonus }
}

// ── Date / time ──────────────────────────────────────────────────────────────

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** Format a UTC/ISO datetime string in IST (Asia/Kolkata) */
export function formatDateTimeIST(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/** Alias kept for any existing imports */
export const formatDateTime = formatDateTimeIST

/** Returns just the time in IST, e.g. "07:30 PM" */
export function formatTimeIST(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/** Returns date label in IST, e.g. "22 Jun" */
export function formatDateLabelIST(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  })
}

export function timeUntil(dateStr) {
  if (!dateStr) return ''
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 'Starting'
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins  = Math.floor((diff % 3600000) / 60000)
  if (days > 0)  return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// ── Optimistic live state ─────────────────────────────────────────────────────
//
// The football API lags a minute or two before flipping a match to IN_PLAY at
// kick-off, so a just-started match still reports SCHEDULED for a short while.
// To avoid a stale "VS / kickoff time" UI, we treat a SCHEDULED match whose
// kick-off time has passed as LIVE (0-0). Real status/scores arriving via
// WebSocket override this the moment the backend broadcasts them.

export function isKickoffPassed(match, nowMs = Date.now()) {
  return match?.status === 'SCHEDULED' && new Date(match.matchDate).getTime() <= nowMs
}

/** Match status as the UI should treat it, accounting for the optimistic flip. */
export function effectiveStatus(match, nowMs = Date.now()) {
  return isKickoffPassed(match, nowMs) ? 'LIVE' : match?.status
}

// ── EST day grouping ──────────────────────────────────────────────────────────

/** Returns the EST calendar day key "YYYY-MM-DD" for grouping matches */
export function getESTDayKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  // en-CA gives YYYY-MM-DD format naturally
  return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/** Today's EST day key */
export function todayESTKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/**
 * Human-friendly day label:
 *   - "Today" or "Tomorrow" based on EST calendar day
 *   - Otherwise short date in IST ("Mon, 23 Jun")
 */
export function getDayLabelEST(dateStr) {
  if (!dateStr) return ''
  const matchKey = getESTDayKey(dateStr)

  const nowEST     = new Date()
  const todayKey   = nowEST.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrowDt = new Date(nowEST)
  tomorrowDt.setDate(tomorrowDt.getDate() + 1)
  const tomorrowKey = tomorrowDt.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  if (matchKey === todayKey)     return 'Today'
  if (matchKey === tomorrowKey)  return 'Tomorrow'

  return new Date(dateStr).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
