import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { questionBank, type SATQuestion, withOptionExplanations } from './data/questions'
import generatedQuestionBank from './data/questions.generated.json'
import { computeXpTrend } from './lib/xpTrend'
import { Dashboard } from './components/StudentDashboard'
import { Practice } from './components/PracticeSession'
import { getProfile, saveProfile, type ActiveSession, type Track, type UserProfile } from './lib/storage'

const HEARTS_MAX = 30
const HEART_REGEN_INTERVAL_MS = 4 * 60 * 60 * 1000
const HEART_REFILL_GEM_COST = 50
const FREEZE_COST = 75
const STREAK_REPAIR_GEM_COST = 200
const STREAK_REPAIR_WINDOW_MS = 48 * 60 * 60 * 1000
const MODULE_MAX_LEVEL = 5
const QUESTION_BANK_VERSION = 3
const ParentPortal = lazy(() => import('./components/ParentPortal'))

const roadmap: Record<Track, { id: string; name: string; categories: string[]; unit: 1 | 2 }[]> = {
  math: [
    { id: 'math-algebra', name: 'Algebra', categories: ['Algebra'], unit: 1 },
    { id: 'math-advanced', name: 'Advanced Math', categories: ['Advanced Math'], unit: 1 },
    { id: 'math-geometry', name: 'Geometry', categories: ['Geometry'], unit: 2 },
  ],
  english: [
    { id: 'english-conventions', name: 'Standard English', categories: ['Standard English Conventions'], unit: 1 },
    { id: 'english-craft', name: 'Craft & Structure', categories: ['Craft and Structure'], unit: 1 },
    { id: 'english-information', name: 'Information & Ideas', categories: ['Information and Ideas'], unit: 2 },
  ],
}

const questPool = [
  { id: 'questions-5', label: 'Answer 5 questions', kind: 'questions', target: 5, reward: 20 },
  { id: 'questions-10', label: 'Answer 10 questions', kind: 'questions', target: 10, reward: 35 },
  { id: 'xp-30', label: 'Earn 30 XP', kind: 'xp', target: 30, reward: 25 },
  { id: 'xp-60', label: 'Earn 60 XP', kind: 'xp', target: 60, reward: 45 },
  { id: 'perfect', label: 'Finish a perfect session', kind: 'perfect', target: 1, reward: 50 },
] as const

function dateInZone(timezone: string, value = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
}
function daysBetween(a: string, b: string): number { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) }
function seededQuests(date: string) {
  let seed = [...date].reduce((n, char) => n + char.charCodeAt(0), 0)
  return [...questPool].sort(() => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5).slice(0, 3)
}
export function computeRegeneratedHearts(hearts: number, lastHeartLostAt?: string): { hearts: number; lastHeartLostAt?: string } {
  if (hearts >= HEARTS_MAX || !lastHeartLostAt) return { hearts, lastHeartLostAt }
  const elapsed = Date.now() - Date.parse(lastHeartLostAt)
  const gained = Math.floor(elapsed / HEART_REGEN_INTERVAL_MS)
  if (!gained) return { hearts, lastHeartLostAt }
  const nextHearts = Math.min(HEARTS_MAX, hearts + gained)
  return { hearts: nextHearts, lastHeartLostAt: nextHearts === HEARTS_MAX ? undefined : new Date(Date.parse(lastHeartLostAt) + gained * HEART_REGEN_INTERVAL_MS).toISOString() }
}
function playTone(type: 'correct' | 'wrong' | 'click' | 'fanfare', muted?: boolean) {
  if (muted) return
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return
  const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain()
  osc.frequency.value = type === 'correct' ? 660 : type === 'wrong' ? 130 : type === 'fanfare' ? 880 : 420
  gain.gain.setValueAtTime(0.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (type === 'fanfare' ? .45 : .15))
  osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + (type === 'fanfare' ? .45 : .15))
}
declare global { interface Window { webkitAudioContext?: typeof AudioContext } }

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(() => getProfile())
  const [view, setView] = useState<'dashboard' | 'parent' | 'settings'>('dashboard')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ correct: number; total: number; xp: number; perfect: boolean; hintsUsed: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const today = dateInZone(profile.timezone)
  const allQuestionPool = [...(profile.generatedQuestions || []), ...(generatedQuestionBank as SATQuestion[]), ...questionBank].map(withOptionExplanations)

  useEffect(() => { saveProfile(profile) }, [profile])
  useEffect(() => {
    setProfile((p) => {
      const healed = computeRegeneratedHearts(p.hearts, p.lastHeartLostAt)
      const today = dateInZone(p.timezone)
      let next = { ...p, ...healed }
      if (p.lastActiveDate !== today) next = { ...next, lastActiveDate: today, questionsAnsweredToday: 0, todayTrackQuestions: { math: 0, english: 0 }, dailyQuestProgress: {}, dailyQuestsClaimed: [], dailyQuestDate: today }
      if (p.lastCompletedDate && daysBetween(p.lastCompletedDate, today) === 2 && p.streakFreezeCount > 0) next = { ...next, streakFreezeCount: p.streakFreezeCount - 1, lastCompletedDate: dateInZone(p.timezone, new Date(Date.now() - 86400000)) }
      if (next.currentSession && next.currentSession.questionBankVersion !== QUESTION_BANK_VERSION) {
        next = { ...next, currentSession: null }
      }
      return next
    })
  }, [])

  const quests = useMemo(() => seededQuests(today), [today])
  const active = profile.currentSession && !profile.currentSession.completed ? profile.currentSession : null
  const unansweredQuestion = active ? allQuestionPool.find((q) => q.id === active.questionIds.find((id) => !active.answers[id])) : undefined
  const currentQuestion = active && feedback
    ? allQuestionPool.find((q) => q.id === feedback)
    : unansweredQuestion
  const answered = active ? Object.keys(active.answers).length : 0

  const startSession = (moduleId?: string, checkpoint = false) => {
    if (profile.hearts <= 0) { setNotice('Out of Hearts — refill in the shop to continue.'); return }
    const module = moduleId ? roadmap[profile.selectedTrack].find((item) => item.id === moduleId) : undefined
    const categories = checkpoint ? roadmap[profile.selectedTrack].filter((item) => item.unit === 1).flatMap((item) => item.categories) : module?.categories
    const level = module ? (profile.moduleLevels?.[module.id] || 0) + 1 : 1
    const weakSpotSet = new Set(profile.weakSpots || [])
    const candidates = allQuestionPool.filter((q) => q.subject === profile.selectedTrack && (!categories || categories.includes(q.category)))
      .sort((a, b) => {
        const weakSpotDifference = Number(weakSpotSet.has(b.category)) - Number(weakSpotSet.has(a.category))
        return weakSpotDifference || Math.abs(a.difficulty - level) - Math.abs(b.difficulty - level)
      })
    const count = checkpoint ? 10 : profile.dailyGoal
    const picked = candidates
      .filter((question, index, list) => list.findIndex((candidate) => candidate.id === question.id) === index)
      .filter((question, index, list) => list.findIndex((candidate) => `${candidate.questionText}|${candidate.passageText || ''}` === `${question.questionText}|${question.passageText || ''}`) === index)
      .slice(0, count)
    if (!picked.length) { setNotice('No questions are available for this practice set yet.'); return }
    const session: ActiveSession = { track: profile.selectedTrack, questionIds: picked.map((q) => q.id), questionBankVersion: QUESTION_BANK_VERSION, answers: {}, hintQuestionIds: [], startedAt: new Date().toISOString(), completed: false }
    ;(session as ActiveSession & { moduleId?: string; checkpoint?: boolean }).moduleId = moduleId
    ;(session as ActiveSession & { moduleId?: string; checkpoint?: boolean }).checkpoint = checkpoint
    setFeedback(null); setSummary(null); setProfile((p) => ({ ...p, currentSession: session }))
  }

  const submit = (choice: number) => {
    if (!active || !currentQuestion || feedback) return
    const isCorrect = choice === currentQuestion.correctIndex
    const answers = { ...active.answers, [currentQuestion.id]: { answeredIndex: choice, isCorrect, submittedAt: new Date().toISOString() } }
    const lostHeart = !isCorrect ? Math.max(0, profile.hearts - 1) : profile.hearts
    setProfile((p) => ({ ...p, hearts: lostHeart, lastHeartLostAt: !isCorrect ? new Date().toISOString() : p.lastHeartLostAt, currentSession: { ...active, answers } }))
    playTone(isCorrect ? 'correct' : 'wrong', profile.soundMuted); setFeedback(currentQuestion.id)
  }

  const completeSession = () => {
    if (!active) return
    const results = Object.values(active.answers)
    const correct = results.filter((result) => result.isCorrect).length
    const total = active.questionIds.length
    const xp = correct * 10
    const perfect = correct === total
    const meta = active as ActiveSession & { moduleId?: string; checkpoint?: boolean }
    setProfile((p) => {
      const todayDate = dateInZone(p.timezone)
      const gap = p.lastCompletedDate ? daysBetween(p.lastCompletedDate, todayDate) : 99
      const newStreak = gap === 0 ? p.streak : gap === 1 ? p.streak + 1 : 1
      const categoryPerformance = { ...p.categoryPerformance }
      active.questionIds.forEach((id) => { const q = allQuestionPool.find((item) => item.id === id)!; const item = categoryPerformance?.[q.category] || { correct: 0, total: 0 }; categoryPerformance![q.category] = { correct: item.correct + (active.answers[id]?.isCorrect ? 1 : 0), total: item.total + 1 } })
      const weakSpots = Object.entries(categoryPerformance || {})
        .filter(([, value]) => value.total >= 2 && value.correct / value.total < .6)
        .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))
        .map(([category]) => category)
      const moduleLevels = { ...p.moduleLevels }
      const score = correct / total
      if (meta.moduleId && score >= .6) moduleLevels[meta.moduleId] = Math.min(MODULE_MAX_LEVEL, (moduleLevels[meta.moduleId] || 0) + 1)
      const checkpointId = `${active.track}-unit-1-checkpoint`
      const passedCheckpoints = meta.checkpoint && score >= .8 && !p.passedCheckpoints?.includes(checkpointId) ? [...(p.passedCheckpoints || []), checkpointId] : p.passedCheckpoints
      const questProgress = { ...p.dailyQuestProgress }
      quests.forEach((q) => { questProgress[q.id] = (questProgress[q.id] || 0) + (q.kind === 'questions' ? total : q.kind === 'xp' ? xp : perfect ? 1 : 0) })
      const badges = new Set(p.unlockedBadges)
      badges.add('first-session'); if (newStreak >= 7) badges.add('daily-warrior'); if (newStreak >= 30) badges.add('consistent-scholar'); if (newStreak >= 100) badges.add('marathon'); if (xp + p.xp >= 500) badges.add('xp-champion'); if (perfect) badges.add('perfect-session'); if (new Date().getHours() < 9) badges.add('early-bird')
      const streakBroke = Boolean(p.lastCompletedDate && gap > 1 && p.streak > 0)
      const wagerWon = Boolean(p.doubleOrNothingActive && !streakBroke && newStreak - (p.doubleOrNothingStreakStart || 0) >= 7)
      const gems = p.gems + 10 + (perfect ? 15 : 0) + (wagerWon ? 100 : 0)
      const sessionXpEvents = [...(p.sessionXpEvents || [])]
      const historicalToday = (p.xpHistory || []).find((entry) => entry.date === todayDate)
      if (!sessionXpEvents.some((event) => dateInZone(p.timezone, new Date(event.timestamp)) === todayDate) && historicalToday?.xp) sessionXpEvents.push({ timestamp: `${todayDate}T12:00:00.000Z`, xpGained: historicalToday.xp, activityType: 'legacy-practice' })
      sessionXpEvents.push({ timestamp: new Date().toISOString(), xpGained: xp, activityType: 'practice-session' })
      const xpTrend = computeXpTrend({ sessionXpEvents, historicalDailyXp: (p.xpHistory || []).filter((entry) => entry.date !== todayDate), currentDate: todayDate, timezone: p.timezone })
      const todayTrackQuestions = { math: p.todayTrackQuestions?.math || 0, english: p.todayTrackQuestions?.english || 0 }
      todayTrackQuestions[active.track] += total
      return { ...p, xp: p.xp + xp, gems, streak: newStreak, longestStreak: Math.max(p.longestStreak, newStreak), lastCompletedDate: todayDate, questionsAnsweredToday: p.questionsAnsweredToday + total, todayTrackQuestions, weakSpots, currentSession: null, categoryPerformance, moduleLevels, passedCheckpoints, dailyQuestProgress: questProgress, unlockedBadges: [...badges], completionHistory: [...(p.completionHistory || []), todayDate], xpHistory: xpTrend.historicalDailyXp.slice(-90), sessionXpEvents: sessionXpEvents.slice(-500), brokenStreakValue: streakBroke ? p.streak : p.brokenStreakValue, brokenStreakAt: streakBroke ? new Date().toISOString() : p.brokenStreakAt, doubleOrNothingActive: wagerWon || streakBroke ? false : p.doubleOrNothingActive, doubleOrNothingStreakStart: wagerWon || streakBroke ? undefined : p.doubleOrNothingStreakStart, lastMilestoneStreak: [7, 30, 100].includes(newStreak) ? newStreak : p.lastMilestoneStreak }
    })
    playTone('fanfare', profile.soundMuted); setFeedback(null); setSummary({ correct, total, xp, perfect, hintsUsed: active.hintQuestionIds?.length || 0 })
  }

  const claimQuest = (id: string) => setProfile((p) => {
    const quest = quests.find((item) => item.id === id)!; if ((p.dailyQuestProgress[id] || 0) < quest.target || p.dailyQuestsClaimed.includes(id)) return p
    return { ...p, gems: p.gems + quest.reward, dailyQuestsClaimed: [...p.dailyQuestsClaimed, id] }
  })
  const buy = (kind: 'refill' | 'freeze' | 'repair' | 'wager') => setProfile((p) => {
    if (kind === 'refill' && p.gems >= HEART_REFILL_GEM_COST) return { ...p, gems: p.gems - HEART_REFILL_GEM_COST, hearts: HEARTS_MAX, lastHeartLostAt: undefined }
    if (kind === 'freeze' && p.gems >= FREEZE_COST) return { ...p, gems: p.gems - FREEZE_COST, streakFreezeCount: p.streakFreezeCount + 1 }
    if (kind === 'repair' && p.brokenStreakValue && p.brokenStreakAt && Date.now() - Date.parse(p.brokenStreakAt) < STREAK_REPAIR_WINDOW_MS && p.gems >= STREAK_REPAIR_GEM_COST) return { ...p, gems: p.gems - STREAK_REPAIR_GEM_COST, streak: p.brokenStreakValue, brokenStreakValue: undefined, brokenStreakAt: undefined }
    if (kind === 'wager' && !p.doubleOrNothingActive && p.gems >= 50) return { ...p, gems: p.gems - 50, doubleOrNothingActive: true, doubleOrNothingStreakStart: p.streak }
    return p
  })

  if (!profile.hasCompletedOnboarding) return <Onboarding profile={profile} onDone={(updates) => setProfile((p) => ({ ...p, ...updates, hasCompletedOnboarding: true }))} />
  if (active && currentQuestion) return <Practice profile={profile} active={active} question={currentQuestion} answered={answered} feedback={feedback === currentQuestion.id} onAnswer={submit} onHintUsed={(questionId) => setProfile((p) => p.currentSession?.hintQuestionIds?.includes(questionId) ? p : { ...p, currentSession: p.currentSession ? { ...p.currentSession, hintQuestionIds: [...(p.currentSession.hintQuestionIds || []), questionId] } : p.currentSession })} onNext={() => { if (answered >= active.questionIds.length) completeSession(); else setFeedback(null) }} onExit={() => setProfile((p) => ({ ...p, currentSession: null }))} onRefill={() => buy('refill')} />
  if (summary) return <SessionSummary summary={summary} onDone={() => setSummary(null)} />
  if (view === 'settings') return <ProfileSettings profile={profile} onBack={() => setView('parent')} onSave={(studentName) => setProfile((current) => ({ ...current, studentName }))} />
  return view === 'parent' ? <Suspense fallback={<main className="page centered"><p>Loading Parent Portal…</p></main>}><ParentPortal profile={profile} onBack={() => setView('dashboard')} onSettings={() => setView('settings')} /></Suspense> : <Dashboard profile={profile} quests={quests} notice={notice} onStart={startSession} onTrack={(track) => setProfile((p) => ({ ...p, selectedTrack: track }))} onClaim={claimQuest} onBuy={buy} onParent={() => setView('parent')} onProfile={() => setView('settings')} onMute={() => { if (profile.soundMuted) playTone('click', false); setProfile((p) => ({ ...p, soundMuted: !p.soundMuted })) }} />
}

function SessionSummary({ summary, onDone }: { summary: { correct: number; total: number; xp: number; perfect: boolean; hintsUsed: number }; onDone: () => void }) {
  return <main className="page centered"><section className="card"><span className="eyebrow">SESSION COMPLETE</span><h1>{summary.correct}/{summary.total} correct</h1><p>You earned <b>+{summary.xp} XP</b>{summary.perfect && ' and a perfect-session bonus!'}</p><p className="hint-summary">💡 Hints used: <b>{summary.hintsUsed}</b></p><button className="primary" onClick={onDone}>Back to dashboard</button></section></main>
}

function Onboarding({ profile, onDone }: { profile: UserProfile; onDone: (updates: Pick<UserProfile, 'selectedTrack' | 'dailyGoal' | 'motivation' | 'studentName'>) => void }) {
  const [track, setTrack] = useState<Track>('math'); const [goal, setGoal] = useState(5); const [motivation, setMotivation] = useState('Confidence'); const [studentName, setStudentName] = useState(profile.studentName === 'Student' ? 'Jake' : profile.studentName || 'Jake')
  return <main className="page centered"><section className="card onboarding"><span className="eyebrow">WELCOME TO DAILY1600</span><h1>Small practice. Real momentum.</h1><p>Set up your local study plan. You can change your track any time.</p><label>Your first name<input value={studentName} maxLength={40} onChange={(e) => setStudentName(e.target.value)} placeholder="Jake" /></label><label>What motivates you?<select value={motivation} onChange={(e) => setMotivation(e.target.value)}><option>Confidence</option><option>A great SAT score</option><option>Building a habit</option></select></label><div className="button-row">{(['math', 'english'] as const).map((item) => <button key={item} className={track === item ? 'selected' : ''} onClick={() => setTrack(item)}>{item}</button>)}</div><label>Daily pace<select value={goal} onChange={(e) => setGoal(Number(e.target.value))}>{[5, 10, 15, 20].map((n) => <option key={n}>{n}</option>)}</select></label><button className="primary" onClick={() => onDone({ selectedTrack: track, dailyGoal: goal, motivation, studentName: studentName.trim() || 'Jake' })}>Start my plan</button></section></main>
}

function ProfileSettings({ profile, onBack, onSave }: { profile: UserProfile; onBack: () => void; onSave: (studentName: string) => void }) {
  const [studentName, setStudentName] = useState(profile.studentName === 'Student' ? 'Jake' : profile.studentName || 'Jake')
  return <main className="page centered"><section className="card onboarding"><span className="eyebrow">PROFILE SETTINGS</span><h1>Personalize your report</h1><p>Your saved name appears throughout the Parent Portal’s progress report and action plan.</p><label>Your first name<input value={studentName} maxLength={40} onChange={(event) => setStudentName(event.target.value)} placeholder="Jake" autoFocus /></label><div className="button-row"><button onClick={onBack}>Cancel</button><button className="primary" onClick={() => { onSave(studentName.trim() || 'Jake'); onBack() }}>Save name</button></div></section></main>
}
