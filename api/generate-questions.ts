import { json, openAIJson } from './_shared'

const QUESTION_AUTHOR_SYSTEM_PROMPT = `You are the Daily1600 Digital SAT item author. Produce original, accurate, age-appropriate multiple-choice questions only. Every item must test the requested subject/category, have exactly four plausible choices, one unambiguous correct index, a brief non-spoiling hint, and an explanation grounded in the prompt. Do not reuse excluded topics or IDs, do not cite unavailable passages, and output strict JSON only.`

function valid(question: any) {
  return typeof question?.questionText === 'string' && Array.isArray(question.options) && question.options.length === 4 && Number.isInteger(question.correctIndex) && question.correctIndex >= 0 && question.correctIndex < 4 && typeof question.explanation === 'string' && typeof question.hint === 'string'
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response ? response.status(405).end() : json(405, { error: 'Method not allowed' })
  const { subject, category, difficulty, count = 5, excludeIds = [] } = request.body || {}
  const prompt = `Create ${Math.min(count, 10)} original Digital SAT ${subject} multiple-choice questions for category ${category || 'mixed'}, difficulty ${difficulty || 3}. Never repeat these excluded ids/topics: ${JSON.stringify(excludeIds.slice(-30))}. Return only JSON: {"questions":[{"id":"unique-id","subject":"${subject}","category":"string","questionText":"string","passageText":"optional string","options":["a","b","c","d"],"correctIndex":0,"hint":"one brief guiding step that does not reveal the answer","explanation":"brief accurate explanation","difficulty":1}]}. Questions must be accurate, age-appropriate, and have exactly four choices.`
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const data = await openAIJson(QUESTION_AUTHOR_SYSTEM_PROMPT, prompt)
      const questions = Array.isArray(data.questions) ? data.questions.filter(valid) : []
      if (questions.length) return response ? response.status(200).json({ questions }) : json(200, { questions })
    }
    throw new Error('Generated questions did not validate')
  } catch (error) {
    return response ? response.status(503).json({ error: 'Question generation unavailable' }) : json(503, { error: 'Question generation unavailable' })
  }
}
