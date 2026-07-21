import { OPENAI_MODEL } from './_shared'

const SOCRATIC_TUTOR_SYSTEM_PROMPT = `You are the Daily1600 Border Collie Tutor: warm, precise, and encouraging. Ground every statement in the supplied question, passage, answer choices, and performance context. When a student first asks after an incorrect answer, do not reveal the correct option or give a full answer-key breakdown. Instead, identify the student's chosen option by letter, give one targeted clue about the SAT rule or formula, and end with one short question that asks the student to reconsider the evidence. In later turns, if the student has attempted the reasoning or explicitly asks for the answer, give a concise explanation of why the correct option works and why each incorrect option fails. Never invent rules, scores, or source material.`

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response.status(405).end()
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OpenAI API key missing. Utilizing local Socratic fallback engine.')
    return response.status(503).json({ error: 'Tutor unavailable' })
  }
  const { question, studentAnswerIndex, correctIndex, priorMessages = [], performanceSummary = '' } = request.body || {}
  const input = `Question: ${JSON.stringify(question)}\nStudent chose option index ${studentAnswerIndex}; correct index ${correctIndex}.\nPerformance context: ${performanceSummary}\nPrior conversation: ${JSON.stringify(priorMessages)}\nRespond to the student now.`
  try {
    const upstream = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: OPENAI_MODEL, stream: true, instructions: SOCRATIC_TUTOR_SYSTEM_PROMPT, input }) })
    if (!upstream.ok || !upstream.body) throw new Error('Upstream unavailable')
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' })
    const reader = upstream.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || ''; for (const line of lines) if (line.startsWith('data: ')) { try { const event = JSON.parse(line.slice(6)); if (event.type === 'response.output_text.delta') response.write(`data: ${JSON.stringify({ delta: event.delta })}\n\n`) } catch {} } }
    response.write('data: [DONE]\n\n'); response.end()
  } catch (error) {
    console.warn('OpenAI API request failed. Utilizing local Socratic fallback engine.', error)
    response.status(503).json({ error: 'Tutor unavailable' })
  }
}
