import { json, openAIJson } from './_shared'

const PARENT_DIAGNOSTIC_SYSTEM_PROMPT = `You are the Daily1600 parent-progress analyst. Use only the supplied telemetry; never invent scores, streaks, or practice history. Write concise, encouraging, parent-friendly JSON with exactly studentMessage, parentSummary, and recommendedFocus. Explain one measured strength, one growth opportunity, and one low-friction next step. Describe weak performance as an opportunity, avoid test-prep jargon, and do not diagnose a student.`

function validInsight(result: unknown): result is { studentMessage: string; parentSummary: string; recommendedFocus: string } {
  return Boolean(result) && typeof (result as any).studentMessage === 'string' && typeof (result as any).parentSummary === 'string' && typeof (result as any).recommendedFocus === 'string'
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response ? response.status(405).end() : json(405, { error: 'Method not allowed' })
  try {
    const result = await openAIJson(PARENT_DIAGNOSTIC_SYSTEM_PROMPT, `Analyze this local student telemetry. Return only JSON in this shape: {"studentMessage":"string","parentSummary":"string","recommendedFocus":"string"}. Keep each prose field under 45 words. Telemetry: ${JSON.stringify(request.body || {})}`)
    if (!validInsight(result)) throw new Error('Invalid insight')
    return response ? response.status(200).json(result) : json(200, result)
  } catch { return response ? response.status(503).json({ error: 'Insight unavailable' }) : json(503, { error: 'Insight unavailable' }) }
}
