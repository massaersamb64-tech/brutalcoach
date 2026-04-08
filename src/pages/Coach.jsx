import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { Mic, MicOff, Bot, RefreshCw, Volume2, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/StoreContext'
import { getCoachMessage, getGroqMessage, getOpenAIMessage } from '../utils/coachAI'

const QUICK_PROMPTS = [
  "Donne-moi un défi",
  "Analyse mon score",
  "Plan pour aujourd'hui",
  "Dis-moi quelque chose d'intéressant",
]

const STATUS = {
  IDLE: 'idle',
  LISTENING: 'listening',
  THINKING: 'thinking',
  SPEAKING: 'speaking',
}

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'fr-FR'
  utterance.rate = 1.05
  utterance.pitch = 0.95
  const voices = window.speechSynthesis.getVoices()
  const frVoice = voices.find(v => v.lang.startsWith('fr'))
  if (frVoice) utterance.voice = frVoice
  utterance.onend = onEnd || null
  window.speechSynthesis.speak(utterance)
}

export default function Coach() {
  const { settings, todayStats } = useStore()
  const [status, setStatus] = useState(STATUS.IDLE)
  const [coachText, setCoachText] = useState('')
  const [userText, setUserText] = useState('')
  const [error, setError] = useState('')
  const [hasAI, setHasAI] = useState(false)
  const [history, setHistory] = useState([]) // conversation history for AI
  const recognitionRef = useRef(null)

  const getContext = () => ({
    score: todayStats.score,
    productiveTime: Math.round(todayStats.productiveTime / 60),
    sessions: todayStats.sessions,
  })

  useEffect(() => {
    setHasAI(!!(settings.groqKey || settings.openAIKey))
  }, [settings.groqKey, settings.openAIKey])

  // Greeting on mount
  useEffect(() => {
    const greeting = hasAI
      ? "Bonjour ! Je suis prêt à discuter de tout sujet avec toi. Appuie sur le bouton et parle-moi."
      : getCoachMessage(settings.mode, 'idle')
    setCoachText(greeting)
    const t = setTimeout(() => {
      speak(greeting, () => setStatus(STATUS.IDLE))
      setStatus(STATUS.SPEAKING)
    }, 600)
    return () => { clearTimeout(t); window.speechSynthesis.cancel() }
  }, [hasAI])

  const sendToCoach = useCallback(async (text) => {
    if (!text.trim()) return
    setUserText(text)
    setStatus(STATUS.THINKING)
    setCoachText('...')

    const newHistory = [...history, { role: 'user', content: text }]

    try {
      let response = null

      if (settings.groqKey) {
        response = await getGroqMessage(settings.groqKey, newHistory, settings, getContext())
      } else if (settings.openAIKey) {
        response = await getOpenAIMessage(settings.openAIKey, newHistory, settings, getContext())
      }

      if (!response) {
        response = buildLocalResponse(text, settings, getContext())
      }

      // Save conversation history
      setHistory([...newHistory, { role: 'assistant', content: response }])

      setCoachText(response)
      setStatus(STATUS.SPEAKING)
      speak(response, () => setStatus(STATUS.IDLE))
    } catch {
      const fallback = buildLocalResponse(text, settings, getContext())
      setCoachText(fallback)
      setStatus(STATUS.SPEAKING)
      speak(fallback, () => setStatus(STATUS.IDLE))
    }
  }, [settings, todayStats, history])

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError("Reconnaissance vocale non supportée. Utilise Chrome ou Safari.")
      return
    }
    window.speechSynthesis.cancel()
    setStatus(STATUS.LISTENING)
    setUserText('')
    setError('')

    const recognition = new SR()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      sendToCoach(e.results[0][0].transcript)
    }
    recognition.onerror = (e) => {
      setStatus(STATUS.IDLE)
      if (e.error === 'no-speech') setError('Aucune parole détectée. Réessaie.')
      else if (e.error === 'not-allowed') setError('Micro refusé. Autorise-le dans les paramètres du navigateur.')
      else setError('Erreur micro. Réessaie.')
    }
    recognition.onend = () => {
      if (status === STATUS.LISTENING) setStatus(STATUS.IDLE)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [sendToCoach, status])

  const handleMic = () => {
    if (status === STATUS.LISTENING) { recognitionRef.current?.stop(); setStatus(STATUS.IDLE) }
    else if (status === STATUS.IDLE) startListening()
    else if (status === STATUS.SPEAKING) { window.speechSynthesis.cancel(); setStatus(STATUS.IDLE); setTimeout(startListening, 100) }
  }

  const handleQuick = (prompt) => {
    window.speechSynthesis.cancel()
    sendToCoach(prompt)
  }

  const handleReset = () => {
    window.speechSynthesis.cancel()
    recognitionRef.current?.stop()
    setStatus(STATUS.IDLE)
    setUserText('')
    setError('')
    setHistory([])
    const greeting = "Conversation réinitialisée. Parle-moi !"
    setCoachText(greeting)
    setTimeout(() => { speak(greeting, () => setStatus(STATUS.IDLE)); setStatus(STATUS.SPEAKING) }, 200)
  }

  const statusLabel = {
    [STATUS.IDLE]: hasAI ? 'Appuie pour parler de tout' : 'Appuie pour parler',
    [STATUS.LISTENING]: 'Écoute...',
    [STATUS.THINKING]: 'Réflexion...',
    [STATUS.SPEAKING]: 'Parle... (appuie pour interrompre)',
  }[status]

  const micPulse = status === STATUS.LISTENING || status === STATUS.SPEAKING

  return (
    <div className="h-dvh overflow-hidden flex flex-col px-5 pt-5 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Coach IA</h2>
          <p className="text-xs text-brutal-400 mt-0.5">
            {hasAI
              ? <span className="text-productive-400">IA connectée — discussion libre</span>
              : <span className="text-yellow-400">Mode basique — <Link to="/settings" className="underline">connecte une IA</Link></span>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/settings"
            className="w-9 h-9 bg-brutal-800 rounded-xl flex items-center justify-center active:opacity-70">
            <Settings size={15} className="text-brutal-300" />
          </Link>
          <button onClick={handleReset}
            className="w-9 h-9 bg-brutal-800 rounded-xl flex items-center justify-center active:opacity-70">
            <RefreshCw size={15} className="text-brutal-300" />
          </button>
        </div>
      </div>

      {/* Coach area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5">

        {/* Avatar */}
        <div className="relative">
          {micPulse && (
            <div className={`absolute rounded-full animate-ping opacity-20
              ${status === STATUS.LISTENING ? 'bg-productive-500' : 'bg-indigo-500'}`}
              style={{ inset: '-12px' }}
            />
          )}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300
            ${status === STATUS.LISTENING ? 'bg-productive-500/20 border-2 border-productive-500' :
              status === STATUS.SPEAKING ? 'bg-indigo-500/20 border-2 border-indigo-500' :
              status === STATUS.THINKING ? 'bg-yellow-500/20 border-2 border-yellow-500' :
              'bg-brutal-800 border-2 border-brutal-600'}`}
          >
            {status === STATUS.SPEAKING
              ? <Volume2 size={32} className="text-indigo-400" />
              : <Bot size={32} className="text-brutal-300" />}
          </div>
        </div>

        {/* Coach response */}
        <div className="w-full bg-brutal-800 rounded-2xl px-5 py-4 min-h-[90px] flex items-center justify-center">
          <p className={`text-base text-white text-center leading-relaxed
            ${status === STATUS.THINKING ? 'text-brutal-400 animate-pulse' : ''}`}>
            {coachText || '...'}
          </p>
        </div>

        {/* What user said */}
        {userText ? <p className="text-xs text-brutal-400 text-center italic px-4">"{userText}"</p> : null}
        {error ? <p className="text-xs text-distraction-400 text-center">{error}</p> : null}

        <p className="text-xs text-brutal-500">{statusLabel}</p>
      </div>

      {/* No AI banner */}
      {!hasAI && (
        <div className="bg-brutal-800 border border-brutal-600 rounded-xl px-4 py-3 mb-3">
          <p className="text-xs text-brutal-300 text-center">
            Pour discuter de <span className="text-white font-medium">n'importe quel sujet</span>, ajoute une clé Groq gratuite dans{' '}
            <Link to="/settings" className="text-indigo-400 underline">Paramètres</Link>
          </p>
        </div>
      )}

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => handleQuick(p)} disabled={status === STATUS.THINKING}
            className="flex-shrink-0 bg-brutal-800 border border-brutal-600 text-brutal-200
                       text-xs px-3 py-2 rounded-full whitespace-nowrap active:opacity-70 disabled:opacity-40">
            {p}
          </button>
        ))}
      </div>

      {/* Mic button */}
      <button onClick={handleMic} disabled={status === STATUS.THINKING}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3
                   transition-all active:scale-[0.98] disabled:opacity-40
          ${status === STATUS.LISTENING ? 'bg-distraction-500 text-white' : 'bg-white text-brutal-900'}`}
      >
        {status === STATUS.LISTENING ? <MicOff size={22} /> : <Mic size={22} />}
        {status === STATUS.LISTENING ? 'Arrêter' :
         status === STATUS.SPEAKING ? 'Interrompre & Parler' : 'Parler'}
      </button>

    </div>
  )
}

function buildLocalResponse(text, settings, ctx) {
  const t = text.toLowerCase()
  const mode = settings.mode
  if (t.includes('plan') || t.includes('aujourd')) {
    return mode === 'brutal'
      ? `Voici ton plan : ${settings.sessionGoalMinutes} minutes de travail, 10 minutes de pause, répète. Objectif : ${settings.dailyGoalHours} heures productives.`
      : `Plan idéal : blocs de ${settings.sessionGoalMinutes} minutes avec des pauses de 10 minutes. Objectif : ${settings.dailyGoalHours} heures productives.`
  }
  if (t.includes('défi') || t.includes('challenge')) {
    const defis = ['Travaille 45 minutes sans interruption, téléphone en mode avion.', 'Termine une tâche que tu repousses depuis 3 jours.', 'Une session de 90 minutes, zéro notification.']
    return defis[Math.floor(Math.random() * defis.length)]
  }
  if (t.includes('score') || t.includes('analyse')) {
    const s = ctx.score
    if (s === 0) return "Tu n'as pas encore commencé aujourd'hui. Lance une session !"
    if (s >= 80) return `${s}% de discipline, excellent ! ${ctx.productiveTime} minutes productives.`
    return `${s}% pour l'instant. Tu peux faire mieux, continue !`
  }
  const defaults = mode === 'brutal'
    ? ["Arrête de parler, commence à agir.", "La question n'est pas comment, c'est quand. La réponse : maintenant."]
    : ["Je suis là pour t'aider ! Pour discuter librement, ajoute une clé Groq dans les paramètres.", "Chaque effort compte. Tu avances !"]
  return defaults[Math.floor(Math.random() * defaults.length)]
}
