import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { SATQuestion } from '../data/questions'
import type { ActiveSession, UserProfile } from '../lib/storage'
import { streamTutor } from '../lib/ai'

interface PracticeProps {
  profile: UserProfile; active: ActiveSession; question: SATQuestion; answered: number; feedback: boolean
  onAnswer: (choice: number) => void; onHintUsed: (questionId: string) => void; onNext: () => void; onExit: () => void; onRefill: () => void
}

const letters = ['A', 'B', 'C', 'D'] as const

function fallbackDistractorExplanation(question: SATQuestion, index: number) {
  if (question.subject === 'math') return 'This result comes from using a different operation or formula than the relationship in the question requires.'
  return 'This choice is not as directly supported by the wording or evidence as the correct answer.'
}

function initialSocraticPrompt(question: SATQuestion, selectedIndex: number) {
  const selectedLetter = letters[selectedIndex]
  const selectedOption = question.options[selectedIndex]
  if (selectedIndex === question.correctIndex) {
    return `Great job! You chose ${selectedLetter}: “${selectedOption}.” Do you want to explore a faster strategy, try a similar question, or ask a question about this rule?`
  }
  const clue = question.subject === 'math'
    ? `You chose ${selectedLetter}: “${selectedOption}.” Before looking back at the answer, identify the relationship between the quantities and the operation that relationship requires.`
    : `You chose ${selectedLetter}: “${selectedOption}.” Re-read the exact wording and identify the grammar, meaning, or evidence clue that this choice may overlook.`
  const questionPrompt = question.subject === 'math'
    ? 'Where did your calculation or formula choice first differ from the relationship in the prompt?'
    : 'Which exact word or sentence in the text should decide between the choices?'
  return `Let’s trace the reasoning together. ${clue}\n\nYour turn: ${questionPrompt}`
}

function followUpSocraticResponse(question: SATQuestion, selectedIndex: number, reply: string, turn: number) {
  const selectedLetter = letters[selectedIndex]
  const correctLetter = letters[question.correctIndex]
  const reflection = `You said: “${reply.trim()}.”`
  if (turn === 1) {
    return `${reflection} That is a useful place to start. Compare ${selectedLetter} with ${correctLetter}: which operation, grammar rule, or passage detail rules out ${selectedLetter}?`
  }
  return `${reflection} The key idea is: ${question.explanation} Can you state why ${correctLetter} fits the prompt better than ${selectedLetter}?`
}

export function Practice({ profile, active, question, answered, feedback, onAnswer, onHintUsed, onNext, onExit, onRefill }: PracticeProps) {
  const [hintOpen, setHintOpen] = useState(false)
  const [collieOpen, setCollieOpen] = useState(false)
  const [priorMessages, setPriorMessages] = useState<string[]>([])
  const [collieInput, setCollieInput] = useState('')
  const questionNumber = active.questionIds.indexOf(question.id) + 1
  const hintUsed = active.hintQuestionIds?.includes(question.id) || false
  const hint = question.hint || (question.subject === 'math' ? 'Write down the relationship in the question, then solve one step at a time.' : 'Return to the passage and choose the answer supported by its exact wording.')
  const selectedIndex = active.answers[question.id]?.answeredIndex
  const selectedCorrect = active.answers[question.id]?.isCorrect

  useEffect(() => { setHintOpen(false); setCollieOpen(false); setPriorMessages([]); setCollieInput('') }, [question.id])

  const requestLiveCoach = (history: string[], fallback: string) => {
    if (selectedIndex == null) return
    let streamed = ''
    void streamTutor({ question, studentAnswerIndex: selectedIndex, correctIndex: question.correctIndex, priorMessages: history, performanceSummary: profile.weakSpots?.join(', ') || '' }, (delta) => {
      streamed += delta
      setPriorMessages([...history, streamed])
    }).then((usedLiveEngine) => {
      if (!usedLiveEngine || !streamed) setPriorMessages((messages) => messages.length ? messages : [fallback])
    })
  }

  const askCollie = () => {
    if (selectedIndex == null) return
    const fallback = initialSocraticPrompt(question, selectedIndex)
    setCollieOpen(true)
    setPriorMessages([fallback])
    requestLiveCoach([], fallback)
  }
  const sendCollieReply = () => {
    if (!collieInput.trim() || selectedIndex == null) return
    const reply = collieInput.trim()
    setCollieInput('')
    const fallback = followUpSocraticResponse(question, selectedIndex, reply, Math.floor(priorMessages.length / 2))
    const history = [...priorMessages, `You: ${reply}`]
    setPriorMessages([...history, fallback])
    requestLiveCoach(history, fallback)
  }

  if (profile.hearts === 0 && feedback) return <main className="page centered"><section className="card"><h1>Out of hearts</h1><p>Refill all thirty hearts to continue where you left off.</p><button className="primary" onClick={onRefill}>Refill hearts · 💎 50</button><button onClick={onExit}>Exit to dashboard</button></section></main>

  return <main className="page"><header className="practice-head"><button onClick={onExit}>← Exit</button><span>Question {questionNumber} of {active.questionIds.length}</span><span className="hearts">♥ {profile.hearts}/30</span></header><AnimatePresence mode="wait"><motion.section key={question.id} className="card question" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: .22 }}><div className="progress"><i style={{ width: `${(answered / active.questionIds.length) * 100}%` }} /></div>{question.passageText && <blockquote>{question.passageText}</blockquote>}<h1>{question.questionText}</h1><button className="hint-button" disabled={feedback} onClick={() => { if (!hintOpen && !hintUsed) onHintUsed(question.id); setHintOpen((open) => !open) }}>💡 {hintOpen ? 'Hide hint' : 'Show hint'}</button>{hintOpen && <p className="question-hint">{hint}</p>}<div className="options">{question.options.map((option, index) => { const selected = selectedIndex === index; const correct = index === question.correctIndex; const state = feedback ? (correct ? 'correct' : selected ? 'incorrect' : '') : ''; const label = feedback ? `${correct ? 'Correct' : selected ? 'Incorrect' : 'Unselected'}: ${option}` : option; return <button disabled={feedback} className={state} aria-label={label} key={`${option}-${index}`} onClick={() => onAnswer(index)}><b>{feedback && correct ? '✓' : feedback && selected ? '✕' : letters[index]}</b>{option}</button> })}</div>{feedback && selectedIndex != null && <div className="feedback answer-breakdown" aria-live="polite"><strong>{selectedCorrect ? '✓ Correct!' : '✕ Not quite.'}</strong>{selectedCorrect && <motion.span className="xp-pop" initial={{ opacity: 0, y: 10, scale: .8 }} animate={{ opacity: 1, y: -8, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}>+10 XP</motion.span>}<section className="correct-rationale"><h2>Why {letters[question.correctIndex]} is correct</h2><p><b>{letters[question.correctIndex]}: {question.options[question.correctIndex]}</b> — {question.explanation}</p></section><section className="distractor-analysis"><h2>Why other choices are incorrect</h2><ul>{question.options.map((option, index) => index !== question.correctIndex && <li key={`${option}-${index}`}><b>{letters[index]}: {option}</b><span>{question.optionExplanations?.[letters[index]] || fallbackDistractorExplanation(question, index)}</span></li>)}</ul></section><button className="collie-button" onClick={askCollie}>🐕 Ask the Border Collie</button>{collieOpen && <div className="collie-panel"><b>Border Collie Coach</b>{priorMessages.map((message, index) => <p aria-live="polite" key={`${question.id}-${index}`}>{message}</p>)}<div className="collie-reply"><input value={collieInput} onChange={(event) => setCollieInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendCollieReply() }} placeholder="Reply to the Border Collie…" /><button disabled={!collieInput.trim()} onClick={sendCollieReply}>Send</button></div></div>}<button className="primary" onClick={onNext}>{answered === active.questionIds.length ? 'See results' : 'Next question'}</button></div>}</motion.section></AnimatePresence></main>
}
