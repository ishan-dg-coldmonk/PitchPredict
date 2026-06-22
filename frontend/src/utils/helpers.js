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

/** Legacy – kept for non-IST uses */
export function formatDateTime(dateStr) {
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

/** Returns just the time portion in IST, e.g. "07:30 PM" */
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

/**
 * Returns "Today", "Tomorrow", or a formatted date string in IST,
 * comparing against EST "today" so grouping matches EST calendar day.
 */
export function getDayLabelEST(dateStr) {
  if (!dateStr) return ''
  const matchDate = new Date(dateStr)

  // Get EST "today" midnight
  const nowEST = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const todayEST = new Date(nowEST.getFullYear(), nowEST.getMonth(), nowEST.getDate())
  const tomorrowEST = new Date(todayEST)
  tomorrowEST.setDate(todayEST.getDate() + 1)

  // Get EST date of the match
  const matchEST = new Date(matchDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const matchDayEST = new Date(matchEST.getFullYear(), matchEST.getMonth(), matchEST.getDate())

  if (matchDayEST.getTime() === todayEST.getTime()) return 'Today'
  if (matchDayEST.getTime() === tomorrowEST.getTime()) return 'Tomorrow'

  // Show full date in IST for display
  return matchDate.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Returns the EST "day key" for grouping: YYYY-MM-DD in EST */
export function getESTDayKey(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const estStr = d.toLocaleString('en-CA', { timeZone: 'America/New_York' })
  return estStr.split(',')[0].trim()
}

export function timeUntil(dateStr) {
  if (!dateStr) return ''
  const diff = new Date(dateStr) - new Date()
  if (diff <= 0) return 'Starting'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// ── Prediction window helpers ─────────────────────────────────────────────────

/** Returns true if the prediction window is currently open for this match */
export function isPredictionWindowOpen(match) {
  if (!match.predictionOpen) return false
  if (match.status !== 'SCHEDULED') return false
  const now = new Date()
  const matchTime = new Date(match.matchDate)
  const diffMs = matchTime - now
  const diffHours = diffMs / 3600000
  // Window: opens 24h before, closes 10min before (backend enforces, this is UI hint)
  return diffHours <= 24 && diffMs > 10 * 60 * 1000
}

/** Returns minutes until prediction window closes (10 min before match) */
export function minutesUntilClose(match) {
  const matchTime = new Date(match.matchDate)
  const closeTime = new Date(matchTime.getTime() - 10 * 60 * 1000)
  return Math.max(0, Math.floor((closeTime - new Date()) / 60000))
}
