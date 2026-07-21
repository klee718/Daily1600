import type { ReactNode } from 'react'
import type { Track, UserProfile } from '../lib/storage'

type Quest = { id: string; label: string; target: number; reward: number }
type ShopItem = 'refill' | 'freeze' | 'repair' | 'wager'

const modules: Record<Track, { id: string; name: string; unit: 1 | 2 }[]> = {
  math: [{ id: 'math-algebra', name: 'Algebra', unit: 1 }, { id: 'math-advanced', name: 'Advanced Math', unit: 1 }, { id: 'math-geometry', name: 'Geometry', unit: 2 }],
  english: [{ id: 'english-conventions', name: 'Standard English', unit: 1 }, { id: 'english-craft', name: 'Craft & Structure', unit: 1 }, { id: 'english-information', name: 'Information & Ideas', unit: 2 }],
}

function localDate(timezone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function CardLabel({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return <div className="card-label"><span className="card-header-icon" aria-hidden="true">{icon}</span><span>{children}</span></div>
}

export function Dashboard({ profile, quests, notice, onStart, onTrack, onClaim, onBuy, onParent, onProfile, onMute }: {
  profile: UserProfile
  quests: ReadonlyArray<Quest>
  notice: string | null
  onStart: (id?: string, checkpoint?: boolean) => void
  onTrack: (track: Track) => void
  onClaim: (id: string) => void
  onBuy: (kind: ShopItem) => void
  onParent: () => void
  onProfile: () => void
  onMute: () => void
}) {
  const trackModules = modules[profile.selectedTrack]
  const checkpointId = `${profile.selectedTrack}-unit-1-checkpoint`
  const checkpointPassed = profile.passedCheckpoints?.includes(checkpointId)
  const unitOneDone = trackModules.filter((item) => item.unit === 1).every((item) => (profile.moduleLevels?.[item.id] || 0) >= 1)
  const totals = Object.values(profile.categoryPerformance || {}).reduce((sum, item) => ({ correct: sum.correct + item.correct, total: sum.total + item.total }), { correct: 0, total: 0 })
  const accuracy = totals.total ? Math.round((totals.correct / totals.total) * 100) : 0
  const mathToday = profile.todayTrackQuestions?.math || 0
  const englishToday = profile.todayTrackQuestions?.english || 0
  const studentName = profile.studentName?.trim() && profile.studentName !== 'Student' ? profile.studentName : 'Jake'
  const coach = profile.aiInsight?.studentMessage || (profile.streak >= 7 ? 'Your consistency is becoming a superpower.' : 'One focused session today makes tomorrow easier.')

  return <main className="student-dashboard">
    <header className="dashboard-header">
      <div className="dashboard-brand"><span className="dashboard-logo">D</span><div><b>Daily<span>1600</span></b><small>Make today count.</small></div></div>
      <div className="dashboard-stats"><span className="xp-pill" data-tooltip="XP: experience points earned from correct answers and completed practice."><i className="stat-icon" aria-hidden="true">⚡</i>{profile.xp} XP</span><span data-tooltip="Streak: consecutive days on which you completed practice."><i className="stat-icon" aria-hidden="true">🔥</i>{profile.streak}</span><span className="gem-pill" data-tooltip="Gems: currency used for heart refills, streak freezes, and other power-ups."><i className="stat-icon" aria-hidden="true">💎</i>{profile.gems}</span><span data-tooltip="Hearts: practice lives. An incorrect answer costs one heart."><i className="stat-icon heart-icon" aria-hidden="true">♥</i>{profile.hearts}</span><button className="metric-action icon-only" data-tooltip={profile.soundMuted ? 'Turn sound effects on' : 'Turn sound effects off'} aria-label={profile.soundMuted ? 'Turn sound effects on' : 'Turn sound effects off'} onClick={onMute}><i className="stat-icon" aria-hidden="true">{profile.soundMuted ? '🔇' : '🔊'}</i></button><button className="metric-action" data-tooltip="Change the student name used in the Parent Portal" onClick={onProfile}><i className="stat-icon" aria-hidden="true">⚙</i>Profile Settings</button><button className="parent-button metric-action" data-tooltip="Open the read-only parent progress report" onClick={onParent}><i className="stat-icon" aria-hidden="true">👪</i>Parent Portal</button></div>
    </header>
    <div className="dashboard-grid">
      <aside className="left-rail">
        <section className="dark-card coach-card"><CardLabel icon="🐕">Border Collie Tutor</CardLabel><h2>Border Collie Tutor</h2><p>“{coach}”</p><div className="subject-toggle">{(['math', 'english'] as const).map((track) => <button className={profile.selectedTrack === track ? 'active' : ''} key={track} onClick={() => onTrack(track)}>{track}</button>)}</div></section>
        <section className="dark-card roadmap-card"><CardLabel icon="🗺">{profile.selectedTrack} roadmap</CardLabel><div className="roadmap-list">{trackModules.map((module, index) => { const level = profile.moduleLevels?.[module.id] || 0; const unlocked = index === 0 || (module.unit === 1 ? (profile.moduleLevels?.[trackModules[index - 1].id] || 0) > 0 : checkpointPassed); return <button className={`roadmap-row ${unlocked ? '' : 'locked'}`} disabled={!unlocked || level >= 5} key={module.id} onClick={() => onStart(module.id)}><span>{unlocked ? '◉' : '🔒'}</span><b>{module.name}</b><small>{'●'.repeat(level)}{'○'.repeat(5 - level)} · {level}/5</small></button> })}<button className="checkpoint-row" disabled={!unitOneDone} onClick={() => onStart(undefined, true)}>⚑ Unit checkpoint · 80% to pass</button></div></section>
      </aside>
      <section className="center-rail">
        {notice && <p className="dashboard-notice">{notice}</p>}
        <section className="mission-card"><CardLabel icon="🎯">Today’s mission</CardLabel><h1>Ready to practice, {studentName}?</h1><p>Focus on {profile.selectedTrack === 'math' ? 'Math' : 'English'} and take the next step toward your 7-day milestone.</p><button onClick={() => onStart()}>Start {profile.selectedTrack === 'math' ? 'a Math' : 'an English'} practice session</button><small>{profile.dailyGoal} questions · your progress saves automatically</small></section>
        <section className="dark-card today-practice"><CardLabel icon="📋">Today’s practice</CardLabel><div className="today-total"><b>{profile.questionsAnsweredToday}</b><span>questions answered today</span></div><div className="today-subjects"><span><b>Math</b><strong>{mathToday}</strong></span><span><b>English</b><strong>{englishToday}</strong></span></div></section>
        <div className="dashboard-insights"><section className="dark-card"><CardLabel icon="📊">Consistency tracker</CardLabel><div className="dark-bars">{Array.from({ length: 7 }, (_, index) => { const date = localDate(profile.timezone, new Date(Date.now() - (6 - index) * 86400000)); const active = (profile.completionHistory || []).includes(date); return <div key={date}><i className={active ? 'goal-day' : ''} style={{ height: active ? '72%' : '12%' }} /><small>{date.slice(5)}</small></div> })}</div></section><section className="dark-card mastery-card"><CardLabel icon="📈">Accuracy & mastery</CardLabel><b>{accuracy}%</b><small>Core accuracy</small><progress value={accuracy} max="100" /><div><span>Solved <b>{totals.total}</b></span><span>Correct <b>{totals.correct}</b></span></div></section></div>
      </section>
      <aside className="right-rail">
        <section className="dark-card"><CardLabel icon="✅">Daily quests</CardLabel>{quests.map((quest) => { const progress = Math.min(profile.dailyQuestProgress[quest.id] || 0, quest.target); const claimed = profile.dailyQuestsClaimed.includes(quest.id); return <div className="dark-quest" key={quest.id}><b>{quest.label}</b><progress value={progress} max={quest.target} /><small>{progress}/{quest.target}</small><span className="currency-inline">💎 {quest.reward}</span><button disabled={progress < quest.target || claimed} onClick={() => onClaim(quest.id)}>{claimed ? 'Claimed' : 'Claim'}</button></div> })}</section>
        <section className="dark-card shop-card"><CardLabel icon="🛍">Power-up shop</CardLabel>{profile.doubleOrNothingActive && <p className="active-wager">🎲 Wager active — protect your streak for 7 days.</p>}<button onClick={() => onBuy('refill')}><span className="inline-item">♥ Heart refill</span><em className="currency-inline">💎 50</em></button><button onClick={() => onBuy('freeze')}><span className="inline-item">❄ Streak freeze</span><em className="currency-inline">💎 75</em></button><button disabled={profile.doubleOrNothingActive} onClick={() => onBuy('wager')}><span className="inline-item">🎲 Double or Nothing</span><em className="currency-inline">💎 50</em></button>{profile.brokenStreakValue && <button onClick={() => onBuy('repair')}><span className="inline-item">🩹 Repair streak</span><em className="currency-inline">💎 200</em></button>}</section>
        <section className="dark-card"><CardLabel icon="🏅">Badges</CardLabel><div className="dark-badges">{profile.unlockedBadges.length ? profile.unlockedBadges.map((badge) => <span key={badge}><i className="inline-list-icon" aria-hidden="true">🏅</i>{badge.replace('-', ' ')}</span>) : <span className="locked-badge">Your first badge awaits.</span>}</div></section>
      </aside>
    </div>
  </main>
}
