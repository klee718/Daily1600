export const PROFILE_STORAGE_KEY = 'daily1600_profile'

export type Track = 'math' | 'english'

export interface ActiveSession {
  track: Track
  questionIds: string[]
  questionBankVersion?: number
  answers: Record<string, { answeredIndex: number; isCorrect: boolean; submittedAt: string }>
  hintQuestionIds?: string[]
  startedAt: string
  completed: boolean
}

export interface UserProfile {
  xp: number
  streak: number
  longestStreak: number
  lastCompletedDate?: string
  selectedTrack: Track
  timezone: string
  createdAt: string
  currentSession?: ActiveSession | null
  dailyGoal: number
  questionsAnsweredToday: number
  todayTrackQuestions?: Record<Track, number>
  lastActiveDate: string
  weakSpots?: string[]
  categoryPerformance?: Record<string, { correct: number; total: number }>
  moduleLevels?: Record<string, number>
  passedCheckpoints?: string[]
  unlockedBadges: string[]
  gems: number
  streakFreezeCount: number
  hearts: number
  lastHeartLostAt?: string
  doubleOrNothingActive?: boolean
  doubleOrNothingStreakStart?: number
  brokenStreakValue?: number
  brokenStreakAt?: string
  dailyQuestProgress: Record<string, number>
  dailyQuestsClaimed: string[]
  hasCompletedOnboarding: boolean
  completionHistory?: string[]
  xpHistory?: { date: string; xp: number }[]
  sessionXpEvents?: { timestamp: string; xpGained: number; activityType: string }[]
  studentName?: string
  dailyQuestDate?: string
  lastMilestoneStreak?: number
  soundMuted?: boolean
  motivation?: string
  premium?: boolean
  gemBalanceVersion?: number
  resourceBalanceVersion?: number
  generatedQuestions?: import('../data/questions').SATQuestion[]
  aiInsight?: { date: string; studentMessage: string; parentSummary: string; recommendedFocus: string }
}

function localDate(): string {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function createDefaultProfile(): UserProfile {
  const now = new Date().toISOString()
  return {
    xp: 0, streak: 0, longestStreak: 0, selectedTrack: 'math',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    createdAt: now, currentSession: null, dailyGoal: 5,
    questionsAnsweredToday: 0, todayTrackQuestions: { math: 0, english: 0 }, lastActiveDate: localDate(),
    weakSpots: [], categoryPerformance: {}, moduleLevels: {}, passedCheckpoints: [],
    unlockedBadges: [], gems: 1600, streakFreezeCount: 1, hearts: 30,
    dailyQuestProgress: {}, dailyQuestsClaimed: [], hasCompletedOnboarding: false,
    completionHistory: [], xpHistory: [], sessionXpEvents: [], studentName: 'Jake', soundMuted: false, generatedQuestions: [], gemBalanceVersion: 3, resourceBalanceVersion: 2,
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
}

export function getProfile(): UserProfile {
  const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
  if (!savedProfile) {
    const profile = createDefaultProfile()
    saveProfile(profile)
    return profile
  }
  try {
    const stored = JSON.parse(savedProfile) as Partial<UserProfile>
    const profile = { ...createDefaultProfile(), ...stored } as UserProfile

    // One-time migration: profiles created before the 1,600-gem starting
    // balance receive the new balance without losing any other progress.
    if (stored.gemBalanceVersion !== 3) {
      profile.gems = 1600
      profile.gemBalanceVersion = 3
      saveProfile(profile)
    }
    if (stored.resourceBalanceVersion !== 2) {
      if (stored.resourceBalanceVersion == null) profile.gems = 1600
      profile.hearts = 30
      profile.lastHeartLostAt = undefined
      profile.resourceBalanceVersion = 2
      saveProfile(profile)
    }
    const todayTrackQuestions = profile.todayTrackQuestions || { math: 0, english: 0 }
    const trackedToday = todayTrackQuestions.math + todayTrackQuestions.english
    if (trackedToday !== profile.questionsAnsweredToday) {
      // Earlier profiles only stored one total. Attribute its unclassified
      // questions to the currently selected track so the dashboard stays
      // internally consistent from this point forward.
      const difference = profile.questionsAnsweredToday - trackedToday
      if (difference > 0) todayTrackQuestions[profile.selectedTrack] += difference
      else profile.questionsAnsweredToday = trackedToday
      profile.todayTrackQuestions = todayTrackQuestions
      saveProfile(profile)
    }
    return profile
  } catch {
    const profile = createDefaultProfile()
    saveProfile(profile)
    return profile
  }
}
