import type { UserProfile } from './storage'

export interface LearningTelemetry {
  student_name: string
  current_streak: number
  longest_streak: number
  total_questions: number
  xp_trend: { date: string; xp: number }[]
  category_performance: Record<string, { correct: number; total: number }>
}

export interface LearningNarrative {
  narrative: string
  recommendedFocus: string
}

export function learningTelemetryFromProfile(profile: UserProfile): LearningTelemetry {
  const categoryNames = ['Algebra', 'Advanced Math', 'Geometry', 'Standard English Conventions', 'Craft and Structure', 'Information and Ideas']
  const recordedPerformance = profile.categoryPerformance || {}
  const category_performance = Object.fromEntries(categoryNames.map((name) => [name, recordedPerformance[name] || { correct: 0, total: 0 }]))
  return {
    student_name: profile.studentName?.trim() && profile.studentName !== 'Student' ? profile.studentName : 'Jake',
    current_streak: profile.streak,
    longest_streak: profile.longestStreak,
    total_questions: Object.values(category_performance).reduce((sum, category) => sum + category.total, 0),
    xp_trend: (profile.xpHistory || []).slice(-7),
    category_performance,
  }
}

function percent(correct: number, total: number): number { return total ? Math.round((correct / total) * 100) : 0 }

function strategyFor(category: string, name: string): string {
  if (category === 'Information and Ideas') return `Have ${name} identify the main claim and supporting evidence before reading distractor options.`
  if (category === 'Craft and Structure') return `Have ${name} underline the clue words around the target phrase, then choose the answer that best matches the passage's meaning.`
  if (category === 'Standard English Conventions') return `Have ${name} read the sentence aloud and check that the punctuation clearly connects complete ideas.`
  if (category === 'Algebra' || category === 'Advanced Math') return `Have ${name} write the equation first, solve one step at a time, and compare the final value with every answer choice.`
  if (category === 'Geometry') return `Have ${name} sketch and label the diagram before calculating, including every given measurement.`
  return `Have ${name} name the rule or evidence needed before comparing the answer choices.`
}

export interface ProgressCategory {
  name: string
  correct: number
  total: number
  accuracy: number
}

export interface ProgressReportData {
  name: string
  totalQuestions: number
  currentStreak: number
  hasData: boolean
  topDomain?: ProgressCategory
  growthDomain?: ProgressCategory
  mathDomains: ProgressCategory[]
  readingDomains: ProgressCategory[]
  strategy: string
  conversationStarter: string
}

export function buildProgressReportData(telemetry: LearningTelemetry): ProgressReportData {
  const categories = Object.entries(telemetry.category_performance).map(([name, value]) => ({ name, ...value, accuracy: percent(value.correct, value.total) }))
  const attempted = categories.filter((category) => category.total > 0)
  const totalQuestions = telemetry.total_questions || attempted.reduce((sum, category) => sum + category.total, 0)
  const name = telemetry.student_name.trim() || 'Jake'
  const topDomain = [...attempted].sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0]
  const growthDomain = totalQuestions ? [...categories].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0] : undefined
  const visible = (names: string[]) => categories.filter((category) => category.total > 0 || category.name === growthDomain?.name).filter((category) => names.includes(category.name))
  const growthName = growthDomain?.name || 'a core SAT skill'
  const topName = topDomain?.name || 'a recent skill win'
  return {
    name,
    totalQuestions,
    currentStreak: telemetry.current_streak,
    hasData: totalQuestions > 0,
    topDomain,
    growthDomain,
    mathDomains: visible(['Algebra', 'Advanced Math', 'Geometry']),
    readingDomains: visible(['Standard English Conventions', 'Craft and Structure', 'Information and Ideas']),
    strategy: strategyFor(growthName, name),
    conversationStarter: `“${name}, great job working on ${topName} this week. Let’s spend 10 minutes looking over a few ${growthName} questions together.”`,
  }
}

export function generateWeeklyLearningSummary(telemetry: LearningTelemetry): string {
  const categories = Object.entries(telemetry.category_performance).map(([name, value]) => ({ name, ...value, accuracy: percent(value.correct, value.total) }))
  const totalQuestions = telemetry.total_questions || categories.reduce((sum, category) => sum + category.total, 0)
  const name = telemetry.student_name.trim() || 'Jake'
  const highest = [...categories].filter((category) => category.total > 0).sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0]
  const lowest = [...categories].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0]
  const topName = highest?.name || 'a core SAT domain'
  const topAccuracy = highest ? `${highest.accuracy}%` : '0%'
  const growthName = lowest?.name || 'a core SAT domain'
  const growthAccuracy = lowest ? `${lowest.accuracy}%` : '0%'

  return `### 📊 Weekly Learning Narrative for ${name}

- **Overall Progress:** ${name} solved **${totalQuestions} questions** this week across Math and Reading/Writing, maintaining a **${telemetry.current_streak}-day streak** 🔥.
- **Top Mastery Domain:** Strongest accuracy in **${topName}** (${topAccuracy}).
- **Growth Opportunity:** Target focus needed in **${growthName}** (${growthAccuracy}).

---

### 🚀 Action Plan for ${name}'s Next Practice Session

1. **Focused Practice Set:**
   Encourage ${name} to start their next session with a 5-question practice set in **${growthName}** while focus is fresh.

2. **Strategy Shift:**
   ${strategyFor(growthName, name)}

3. **Parent Conversation Starter:**
   *“${name}, great job crushing ${topName} this week! Let's spend 10 minutes looking over a few ${growthName} questions together.”*`
}

export function generateDetailedProgressReport(telemetry: LearningTelemetry): string {
  const categories = Object.entries(telemetry.category_performance).map(([name, value]) => ({ name, ...value, accuracy: percent(value.correct, value.total) }))
  const totalQuestions = telemetry.total_questions || categories.reduce((sum, category) => sum + category.total, 0)
  const totalCorrect = categories.reduce((sum, category) => sum + category.correct, 0)
  const lowest = [...categories].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0]
  const name = telemetry.student_name.split(' ')[0] || 'The student'
  const math = ['Algebra', 'Advanced Math', 'Geometry'].map((key) => ({ name: key, ...(telemetry.category_performance[key] || { correct: 0, total: 0 }) }))
  const reading = ['Standard English Conventions', 'Craft and Structure', 'Information and Ideas'].map((key) => ({ name: key, ...(telemetry.category_performance[key] || { correct: 0, total: 0 }) }))
  const line = (category: { name: string; correct: number; total: number }) => `*${category.name}: ${category.correct}/${category.total} (${percent(category.correct, category.total)}%)*`
  const latestXp = telemetry.xp_trend.at(-1)?.xp || 0

  return `### 📋 Detailed Progress Narrative & Analysis

1. **Overall Performance Summary:**
   - ${name} has completed ${totalQuestions} questions with ${percent(totalCorrect, totalQuestions)}% overall accuracy and a ${telemetry.current_streak}-day current streak. The latest recorded daily XP gain is ${latestXp} XP.

2. **Domain-by-Domain Breakdown:**
   - **Math Strengths & Mastery:** ${math.map(line).join(', ')}.
   - **Reading & Writing Performance:** ${reading.map(line).join(', ')}.
   - **Critical Growth Area:** ${lowest.name} is the best next focus at ${lowest.correct}/${lowest.total} (${lowest.accuracy}%). Building this skill will strengthen accuracy across related SAT questions.

---

### 🚀 Recommended Action Plan for Next Session

1. **Immediate Focus Area (Next 5-Question Session):**
   - Complete a targeted 5-question practice set in *${lowest.name}*.
   - *Why:* Improving this area raises performance in a skill currently pulling down the overall score.

2. **Pacing & Concept Review Tip:**
   - Before choosing an answer, identify the exact evidence, rule, or calculation the question requires, then eliminate choices that do not match it.

3. **Parent Encouragement / Conversation Starter:**
   - Ask ${name}, *“Which question felt clearer after you slowed down and looked for the exact clue?”* Celebrate the effort before discussing the next skill to practice.`
}

export function generateParentNarrative(telemetry: LearningTelemetry): LearningNarrative {
  const categories = Object.entries(telemetry.category_performance)
    .map(([name, value]) => ({ name, ...value, accuracy: value.total ? Math.round((value.correct / value.total) * 100) : 0 }))
  const attempted = categories.filter((category) => category.total > 0)
  const totalQuestions = attempted.reduce((sum, category) => sum + category.total, 0)
  const name = telemetry.student_name.split(' ')[0] || 'The student'

  if (!totalQuestions) {
    return {
      narrative: `${name} is ready to start their SAT prep journey. Completing a first practice session will generate weekly insights here.`,
      recommendedFocus: 'Complete the first 5-question Daily Quest.',
    }
  }

  const topCategory = [...attempted]
    .filter((category) => category.total >= 3)
    .sort((a, b) => b.accuracy - a.accuracy || b.total - a.total)[0]
  const lowestCategory = [...categories].sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0]
  const firstSentence = topCategory
    ? `${name} is making solid progress this week, solving ${totalQuestions} questions with strong performance in ${topCategory.name} (${topCategory.accuracy}% accuracy).`
    : `${name} is making solid progress this week, solving ${totalQuestions} questions.`
  const streakSentence = telemetry.current_streak > 1 ? ` They are also maintaining a ${telemetry.current_streak}-day streak.` : ''

  return {
    narrative: `${firstSentence}${streakSentence} To build balanced mastery across all SAT domains, attention should turn toward ${lowestCategory.name}.`,
    recommendedFocus: `Complete a 5-question practice session in ${lowestCategory.name}.`,
  }
}
