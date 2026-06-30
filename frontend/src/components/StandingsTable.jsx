import { motion } from 'framer-motion'

/**
 * Renders one table per group (Group A, Group B, …). For leagues/knockouts the
 * backend sends a single group with a null name, which renders without a header.
 *
 * Props:
 *   groups: [{ group: string|null, table: StandingRowDTO[] }]
 */
export default function StandingsTable({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 text-sm">
        Standings aren’t available for this event yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((g, gi) => (
        <motion.div
          key={g.group ?? gi}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.05, duration: 0.3 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden"
        >
          {g.group && (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white">{g.group}</h3>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-500">
                <th className="text-left font-semibold py-2.5 pl-4 pr-2 w-7">#</th>
                <th className="text-left font-semibold py-2.5 px-1">Team</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-7">P</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-7 hidden sm:table-cell">W</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-7 hidden sm:table-cell">D</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-7 hidden sm:table-cell">L</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-9 hidden md:table-cell">GF</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-9 hidden md:table-cell">GA</th>
                <th className="text-center font-semibold py-2.5 px-1.5 w-9">GD</th>
                <th className="text-center font-semibold py-2.5 pl-1.5 pr-4 w-9">Pts</th>
              </tr>
            </thead>
            <tbody>
              {g.table.map((r) => {
                // NOTE: the football-data.org response carries no qualification
                // field, so we don't mark "who advances". For WC 2026 that rule
                // (top 2 + 8 best third-placed across all 12 groups) is a
                // cross-group calculation we'd have to compute ourselves.
                return (
                  <tr
                    key={r.teamId ?? r.position}
                    className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 pl-4 pr-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-gray-500">
                        {r.position}
                      </span>
                    </td>
                    <td className="py-2.5 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.teamCrest && (
                          <img src={r.teamCrest} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                        )}
                        <span className="font-semibold text-white truncate">
                          <span className="sm:hidden">{r.teamTla || r.teamName}</span>
                          <span className="hidden sm:inline">{r.teamName}</span>
                        </span>
                      </div>
                    </td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5">{r.playedGames}</td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5 hidden sm:table-cell">{r.won}</td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5 hidden sm:table-cell">{r.draw}</td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5 hidden sm:table-cell">{r.lost}</td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5 hidden md:table-cell">{r.goalsFor}</td>
                    <td className="text-center text-gray-400 tabular-nums px-1.5 hidden md:table-cell">{r.goalsAgainst}</td>
                    <td className="text-center text-gray-300 tabular-nums px-1.5">
                      {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                    </td>
                    <td className="text-center font-black text-white tabular-nums pl-1.5 pr-4">{r.points}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </motion.div>
      ))}
    </div>
  )
}
