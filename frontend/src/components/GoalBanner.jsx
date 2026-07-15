import { motion, AnimatePresence } from 'framer-motion'

/**
 * Celebratory "GOAL!" moment shown at the top of the room when a live match's
 * score changes. Tap to dismiss; auto-clears after a few seconds (handled by the
 * parent). Mobile-first: near-full-width on phones, capped on larger screens.
 */
export default function GoalBanner({ moment, onDismiss }) {
  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.key}
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={onDismiss}
          className="fixed top-[4.5rem] sm:top-20 left-1/2 -translate-x-1/2 z-[70] w-[92%] max-w-md px-1 cursor-pointer"
        >
          <div className="rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent p-[2px] shadow-2xl shadow-primary/30">
            <div className="rounded-[15px] bg-[#0f0f1a] px-4 py-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <motion.span
                  animate={{ rotate: [0, -25, 25, -15, 0], scale: [1, 1.25, 1] }}
                  transition={{ duration: 0.7, repeat: 1 }}
                  className="text-2xl leading-none"
                >⚽</motion.span>
                <span className="text-lg font-black tracking-wider bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  GOAL!
                </span>
              </div>

              <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-bold text-white">
                {moment.homeCrest && <img src={moment.homeCrest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />}
                <span className={`truncate max-w-[72px] sm:max-w-[110px] ${moment.scoringSide === 'home' ? 'text-accent' : ''}`}>
                  {moment.homeTeam}
                </span>
                <span className="text-xl font-black tabular-nums px-1.5">{moment.homeScore}–{moment.awayScore}</span>
                <span className={`truncate max-w-[72px] sm:max-w-[110px] ${moment.scoringSide === 'away' ? 'text-accent' : ''}`}>
                  {moment.awayTeam}
                </span>
                {moment.awayCrest && <img src={moment.awayCrest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
