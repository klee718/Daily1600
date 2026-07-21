export interface SessionXpEvent {
  timestamp: string
  xpGained: number
  activityType: string
}

export interface DailyXpRecord {
  date: string
  xp: number
}

export interface XpTrendSummary {
  xpTrendData: DailyXpRecord[]
  historicalDailyXp: DailyXpRecord[]
  todayTotalXp: number
  weeklyTotalXp: number
  momentumStatus: 'High Momentum Day' | 'Consistent' | 'Needs Encouragement'
}

function dateInTimezone(timestamp: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(timestamp))
}

function previousDate(date: string, daysAgo: number): string {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() - daysAgo)
  return value.toISOString().slice(0, 10)
}

export function computeXpTrend(input: {
  sessionXpEvents: SessionXpEvent[]
  historicalDailyXp: DailyXpRecord[]
  currentDate: string
  timezone: string
}): XpTrendSummary {
  const eventTotals = new Map<string, number>()
  input.sessionXpEvents.forEach((event) => {
    const date = dateInTimezone(event.timestamp, input.timezone)
    const xp = Math.max(0, Math.round(event.xpGained))
    eventTotals.set(date, (eventTotals.get(date) || 0) + xp)
  })
  const history = new Map(input.historicalDailyXp.map((entry) => [entry.date, Math.max(0, Math.round(entry.xp))]))
  eventTotals.forEach((xp, date) => history.set(date, xp))
  const historicalDailyXp = [...history.entries()].map(([date, xp]) => ({ date, xp })).sort((a, b) => a.date.localeCompare(b.date))
  const xpTrendData = Array.from({ length: 7 }, (_, index) => {
    const date = previousDate(input.currentDate, 6 - index)
    return { date: date.slice(5), xp: history.get(date) || 0 }
  })
  const todayTotalXp = history.get(input.currentDate) || 0
  const weeklyTotalXp = xpTrendData.reduce((sum, entry) => sum + entry.xp, 0)
  const rollingAverage = weeklyTotalXp / 7
  const momentumStatus = todayTotalXp > 0 && todayTotalXp >= rollingAverage * 1.2
    ? 'High Momentum Day'
    : weeklyTotalXp > 0 ? 'Consistent' : 'Needs Encouragement'
  return { xpTrendData, historicalDailyXp, todayTotalXp, weeklyTotalXp, momentumStatus }
}
