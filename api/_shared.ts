export const OPENAI_MODEL = 'gpt-5.6'

export function json(status: number, body: unknown) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

export async function openAIJson(instructions: string, input: string) {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not configured')
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OPENAI_MODEL, instructions, input, text: { format: { type: 'json_object' } } }),
  })
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`)
  const data = await response.json() as { output_text?: string }
  if (!data.output_text) throw new Error('Model returned no text')
  return JSON.parse(data.output_text)
}
