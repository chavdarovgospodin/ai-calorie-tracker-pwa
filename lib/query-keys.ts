import type { QueryClient } from '@tanstack/react-query'

/**
 * A day's food / activity / water entry was added or removed. React Query
 * matches by prefix, so each call below covers every user- and date-scoped
 * variant of that key. Refreshes:
 *  - that day's list on the dashboard (`[kind, date, userId]`),
 *  - the History month view — aggregates changed (`['history', y, m, userId]`),
 *  - the earliest-date / earliest-month bounds that gate the date navigators:
 *    a new entry may predate them, a delete may retract them
 *    (`['earliest_date', userId]`, `['earliest_month', userId]`).
 *
 * Every mutation that writes to food_entries / activity_entries / water_entries
 * must call this instead of invalidating a single key, otherwise the History
 * view and the date-navigation bounds go stale until refetch.
 */
export function invalidateDayData(
  queryClient: QueryClient,
  kind: 'food_entries' | 'activity_entries' | 'water_entries',
  date: string,
) {
  queryClient.invalidateQueries({ queryKey: [kind, date] })
  queryClient.invalidateQueries({ queryKey: ['history'] })
  queryClient.invalidateQueries({ queryKey: ['earliest_date'] })
  queryClient.invalidateQueries({ queryKey: ['earliest_month'] })
}
