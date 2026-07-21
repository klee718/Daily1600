const liveTutorEnabled = import.meta.env.VITE_ENABLE_LIVE_TUTOR === 'true'


export async function streamTutor(input: unknown, onDelta: (delta: string) => void): Promise<boolean> {
  if (!liveTutorEnabled) return false
  try {
    const response = await fetch('/api/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
    if (!response.ok || !response.body) return false
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
    while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const events = buffer.split('\n\n'); buffer = events.pop() || ''; for (const event of events) { const value = event.replace(/^data: /, ''); if (value !== '[DONE]') { const data = JSON.parse(value) as { delta?: string }; if (data.delta) onDelta(data.delta) } } }
    return true
  } catch {
    console.warn('Live tutor request failed. Using the local Socratic fallback engine.')
    return false
  }
}
