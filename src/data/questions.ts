export interface SATQuestion {
  id: string
  subject: 'math' | 'english'
  category: string
  questionText: string
  passageText?: string
  options: string[]
  correctIndex: number
  explanation: string
  optionExplanations?: Record<string, string>
  hint?: string
  difficulty: 1 | 2 | 3 | 4 | 5
}

/** Normalizes authored and generated items so every runtime question has option-level feedback. */
export function withOptionExplanations(question: SATQuestion): SATQuestion & { optionExplanations: Record<string, string> } {
  const letters = ['A', 'B', 'C', 'D']
  const defaults = Object.fromEntries(question.options.map((_, index) => [letters[index], index === question.correctIndex
    ? question.explanation
    : question.subject === 'math'
      ? 'This choice uses an operation or formula that does not match the relationship in the question.'
      : 'This choice is less directly supported by the wording or evidence in the text.']))
  return { ...question, optionExplanations: { ...defaults, ...question.optionExplanations } }
}

const mathCategories = ['Algebra', 'Advanced Math', 'Geometry'] as const
const englishCategories = ['Standard English Conventions', 'Craft and Structure', 'Information and Ideas'] as const

const math = Array.from({ length: 94 }, (_, index): SATQuestion => {
  const n = index + 2
  const category = mathCategories[index % mathCategories.length]
  const difficulty = ((index % 5) + 1) as SATQuestion['difficulty']
  if (category === 'Algebra') {
    const answer = n + 3
    return { id: `math-algebra-${index}`, subject: 'math', category, questionText: `Solve for x: x − ${n} = 3.`, options: [`${n - 3}`, `${answer}`, `${n + 6}`, `${n * 3}`], correctIndex: 1, explanation: `Add ${n} to both sides: x = ${answer}.`, optionExplanations: { A: `This moves ${n} in the wrong direction instead of undoing the subtraction.`, B: `Adding ${n} to both sides isolates x at ${answer}.`, C: `This adds an extra 3 after solving the equation.`, D: `This multiplies the terms rather than using the inverse operation.` }, hint: 'Use the inverse operation: add the same value to both sides.', difficulty }
  }
  if (category === 'Advanced Math') {
    const answer = n * n
    return { id: `math-advanced-${index}`, subject: 'math', category, questionText: `What is the value of ${n}²?`, options: [`${n * 2}`, `${answer}`, `${answer + n}`, `${answer - n}`], correctIndex: 1, explanation: `${n} × ${n} = ${answer}.`, optionExplanations: { A: 'This doubles the number; squaring means multiplying the number by itself.', B: `${n} multiplied by itself equals ${answer}.`, C: `This adds ${n} after finding the square.`, D: `This subtracts ${n} after finding the square.` }, hint: 'A square means multiply the number by itself, not by 2.', difficulty }
  }
  const side = n + 1
  const answer = side * side
  return { id: `math-geometry-${index}`, subject: 'math', category, questionText: `A square has side length ${side}. What is its area?`, options: [`${side * 4}`, `${answer}`, `${answer + side}`, `${side * 2}`], correctIndex: 1, explanation: `A square's area is side × side: ${side}² = ${answer}.`, optionExplanations: { A: 'This is the perimeter, found by adding all four sides.', B: `${side} × ${side} gives an area of ${answer} square units.`, C: 'This adds one side length after calculating area, which is not part of the formula.', D: 'This doubles a side length instead of multiplying length by width.' }, hint: 'Area measures the space inside a shape: multiply length by width.', difficulty }
})

const conventionPairs = [
  ['The museum opened a new exhibit', 'it features photographs from local artists'],
  ['The garden produced a large harvest', 'volunteers donated vegetables to the shelter'],
  ['The train arrived early', 'passengers had extra time to change platforms'],
  ['The scientist repeated the experiment', 'the results remained consistent'],
  ['The bookstore hosted a poetry reading', 'several local writers shared new work'],
  ['The robotics team tested its design', 'the machine completed the obstacle course'],
  ['The city repaired the footbridge', 'walkers could again cross the creek safely'],
  ['The class surveyed the school community', 'students presented the results at assembly'],
] as const

const craftItems = [
  ['vivid', 'The author gave a vivid description of the city at dawn.', 'colorful and clear', 'quiet and hidden', 'brief and vague', 'ordinary and familiar'],
  ['reserved', 'Although the audience applauded enthusiastically, the speaker remained reserved after the presentation.', 'calm and restrained', 'loud and celebratory', 'confused and uncertain', 'eager to leave'],
  ['shift', 'After reviewing the evidence, the historian described a shift in public opinion.', 'a change in direction', 'a sudden noise', 'a place to work', 'a piece of equipment'],
  ['precise', 'The engineer used precise measurements when creating the model.', 'exact and accurate', 'quick and casual', 'old-fashioned', 'unnecessary'],
  ['sustain', 'The community hoped to sustain the program through the winter.', 'continue and support', 'replace immediately', 'question publicly', 'hide from view'],
  ['novel', 'The researchers proposed a novel approach to storing energy.', 'new and original', 'familiar and expected', 'dangerous and costly', 'temporary and weak'],
  ['decline', 'The report described a decline in water use after the new fixtures were installed.', 'a decrease', 'a celebration', 'a disagreement', 'an increase'],
  ['reveal', 'The map’s labels reveal how the neighborhood changed over time.', 'show clearly', 'make less important', 'repeat exactly', 'remove completely'],
] as const

const evidenceItems = [
  ['After the library extended its weekend hours, attendance rose steadily for three months.', 'Longer weekend access coincided with greater attendance.', 'The library permanently hired more staff.', 'Every visitor attended on weekends.', 'Attendance had been falling for years.'],
  ['In a pilot program, students who received text reminders submitted permission forms earlier than students who did not.', 'Text reminders were associated with earlier form submission.', 'Text reminders caused every student to submit a form.', 'Permission forms were no longer required.', 'Students preferred paper reminders.'],
  ['During the first month after new bike lanes opened, the city recorded more cyclists on the affected streets than it had recorded the previous month.', 'Cyclist counts increased after the lanes opened.', 'All residents began biking to work.', 'The lanes were the only change in the city.', 'The city eliminated traffic congestion.'],
  ['A neighborhood group collected food scraps from restaurants, converted them into compost, and distributed the compost to nearby gardens.', 'The group created a local composting program.', 'Restaurants stopped serving food.', 'Gardens no longer needed soil.', 'The group studied restaurant menus.'],
  ['Students who attended the optional review workshop completed more practice problems on average than students who did not attend.', 'Workshop attendance was associated with completing more practice problems.', 'Every workshop attendee earned a perfect score.', 'The workshop replaced regular classes.', 'Practice problems were no longer assigned.'],
  ['The town installed solar panels on its municipal buildings. During the following year, those buildings used less grid electricity.', 'The panels were followed by lower grid-electricity use.', 'Solar panels work only on municipal buildings.', 'The town eliminated all electricity costs.', 'Every building in town received panels.'],
  ['After a creek cleanup, volunteers recorded more fish species than they had recorded before the cleanup.', 'More fish species were recorded after the cleanup.', 'The cleanup guaranteed the creek would remain clean.', 'All fish had returned to the creek.', 'The volunteers counted every fish in the region.'],
  ['The school added covered bike racks in September. By November, more students reported biking to school at least once a week.', 'More students reported biking weekly after the racks were added.', 'Every student used the new racks.', 'The school stopped offering bus service.', 'Covered racks are required at every school.'],
] as const

const english = Array.from({ length: 96 }, (_, index): SATQuestion => {
  const category = englishCategories[index % englishCategories.length]
  const difficulty = ((index % 5) + 1) as SATQuestion['difficulty']
  const variation = Math.floor(index / 15) % 8
  if (category === 'Standard English Conventions') {
    const [first, second] = conventionPairs[variation]
    return { id: `english-conventions-${index}`, subject: 'english', category, questionText: 'Which choice completes the text so that it conforms to standard English conventions?', passageText: `${first} ___ ${second}.`, options: [',', ';', ':', ''], correctIndex: 1, explanation: 'A semicolon correctly joins two closely related independent clauses.', optionExplanations: { A: 'A comma alone creates a comma splice between two complete sentences.', B: 'A semicolon correctly joins two closely related independent clauses.', C: 'A colon does not correctly join these two independent clauses in this context.', D: 'No punctuation creates a run-on sentence.' }, hint: 'Both sides of the blank are complete sentences, so use punctuation that can join two independent clauses.', difficulty }
  }
  if (category === 'Craft and Structure') {
    const [word, passageText, correct, second, third, fourth] = craftItems[variation]
    return { id: `english-craft-${index}`, subject: 'english', category, questionText: `As used in the passage, “${word}” most nearly means:`, passageText, options: [correct, second, third, fourth], correctIndex: 0, explanation: `The context indicates that “${word}” means “${correct}.”`, optionExplanations: { A: `This is the meaning supported by the word’s use in the sentence.`, B: 'This choice does not fit the meaning created by the surrounding context.', C: 'This choice changes the sentence’s intended meaning.', D: 'This choice is not supported by the contextual clues.' }, hint: 'Use the surrounding sentence to determine which option best fits the word’s meaning.', difficulty }
  }
  const [passageText, correct, second, third, fourth] = evidenceItems[variation]
  return { id: `english-information-${index}`, subject: 'english', category, questionText: 'Which claim is best supported by the passage?', passageText, options: [correct, second, third, fourth], correctIndex: 0, explanation: 'The correct choice restates the evidence without adding an unsupported claim.', optionExplanations: { A: 'This choice restates the evidence without making the claim stronger than the passage allows.', B: 'This choice adds a stronger claim than the evidence supports.', C: 'This choice introduces a detail the passage does not establish.', D: 'This choice goes beyond the evidence in the passage.' }, hint: 'Choose only what the passage directly supports; avoid answers that make a stronger claim.', difficulty }
})

export const questionBank: SATQuestion[] = [...math, ...english]
