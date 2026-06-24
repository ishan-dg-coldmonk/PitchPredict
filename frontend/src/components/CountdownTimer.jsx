import { useState, useEffect } from 'react'

export default function CountdownTimer({ targetDate }) {
  const [time, setTime] = useState(getTimeLeft(targetDate))

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(targetDate)), 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (time.total <= 0) return null

  const blocks = [
    { label: 'Days', value: time.days },
    { label: 'Hours', value: time.hours },
    { label: 'Min', value: time.minutes },
    { label: 'Sec', value: time.seconds },
  ]

  return (
    <div className="flex items-center gap-2">
      {blocks.map((b, i) => (
        <div key={b.label} className="flex items-center">
          <div className="glass-card px-2 sm:px-3 py-2 text-center min-w-[42px] sm:min-w-[52px]">
            <div className="text-base sm:text-lg font-bold text-white tabular-nums">{String(b.value).padStart(2, '0')}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{b.label}</div>
          </div>
          {i < blocks.length - 1 && <span className="text-primary font-bold mx-1">:</span>}
        </div>
      ))}
    </div>
  )
}

function getTimeLeft(target) {
  const total = new Date(target) - new Date()
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
  return {
    total,
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    minutes: Math.floor((total % 3600000) / 60000),
    seconds: Math.floor((total % 60000) / 1000),
  }
}
