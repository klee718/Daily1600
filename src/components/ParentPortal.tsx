import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { UserProfile } from '../lib/storage'
import { learningTelemetryFromProfile } from '../lib/learningNarrative'
import { computeXpTrend } from '../lib/xpTrend'
import { DetailedProgressReport } from './DetailedProgressReport'

function dateInZone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export default function ParentPortal({ profile, onBack, onSettings }: { profile: UserProfile; onBack: () => void; onSettings: () => void }) {
  const telemetry = learningTelemetryFromProfile(profile)
  const xpTrend = computeXpTrend({ sessionXpEvents: profile.sessionXpEvents || [], historicalDailyXp: profile.xpHistory || [], currentDate: dateInZone(profile.timezone), timezone: profile.timezone })
  return <main className="page">
    <header className="top"><div><span className="eyebrow">PARENT PORTAL</span><h1>Progress at a glance</h1></div><div className="button-row"><button onClick={onSettings}>Profile settings</button><button onClick={onBack}>Back to student view</button></div></header>
    <div className="portal-grid">
      <DetailedProgressReport telemetry={telemetry} />
      <section className="card"><h2><i className="card-emoji" aria-hidden="true">🔥</i>Current streak</h2><strong className="big">{profile.streak} days</strong><p>Longest streak: {profile.longestStreak} days</p></section>
      <section className="card"><h2><i className="card-emoji" aria-hidden="true">📈</i>XP trend</h2><p className="xp-momentum"><b>{xpTrend.momentumStatus}</b> · {xpTrend.todayTotalXp} XP today · {xpTrend.weeklyTotalXp} XP this week</p><div className="chart"><ResponsiveContainer><LineChart data={xpTrend.xpTrendData}><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="xp" stroke="#A51C30" strokeWidth={3} /></LineChart></ResponsiveContainer></div></section>
    </div>
  </main>
}
