import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import { Mic, MicOff, Bot, RefreshCw, Volume2 } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { getCoachMessage, getOpenAIMessage } from '../utils/coachAI'

const QUICK_PROMPTS = [
  "Plan pour aujourd'hui",
  "Mini-défi du jour",
  "Analyse mon score",
  "Comment m'améliorer ?",
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
  // Try to find a French voice
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
  const recognitionRef = useRef(null)

  const getContext = () => ({
    score: todayStats.score,
    productiveTime: Math.round(todayStats.productiveTime / 60),
    sessions: todayStats.sessions,
  })

  // Greeting on mount
  useEffect(() => {
    const greeting = getCoachMessage(settings.mode, 'idle')
    setCoachText(greeting)
    // Wait a moment before speaking
    const t = setTimeout(() => {
      speak(greeting, () => setStatus(STATUS.IDLE))
      setStatus(STATUS.SPEAKING)
    }, 600)
    return () => {
      clearTimeout(t)
      window.speechSynthesis.cancel()
    }
  }, [])

  const sendToCoach = useCallback(async (text) => {
    if (!text.trim()) return
    setUserText(text)
    setStatus(STATUS.THINKING)
    setCoachText('...')

    try {
      let response = null

      if (settings.openAIKey) {
        response = await getOpenAIMessage(
          settings.openAIKey,
          [{ role: 'user', content: text }],
          settings,
          getContext()
        )
      }

      if (!response) {
        response = buildLocalResponse(text, settings, getContext())
      }

      setCoachText(response)
      setStatus(STATUS.SPEAKING)
      speak(response, () => setStatus(STATUS.IDLE))
    } catch {
      const fallback = buildLocalResponse(text, settings, getContext())
      setCoachText(fallback)
      setStatus(STATUS.SPEAKING)
      speak(fallback, () => setStatus(STATUS.IDLE))
    }
  }, [settings, todayStats])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError("La reconnaissance vocale n'est pas supportée sur ce navigateur.")
      return
    }

    window.speechSynthesis.cancel()
    setStatus(STATUS.LISTENING)
    setUserText('')
    setError('')

    const recognition = new SpeechRecognition()
    recognition.lang = 'fr-FR'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      sendToCoach(transcript)
    }

    recognition.onerror = (e) => {
      setStatus(STATUS.IDLE)
      if (e.error === 'no-speech') setError('Aucune parole détectée. Réessaie.')
      else if (e.error === 'not-allowed') setError('Microphone refusé. Autorise-le dans les paramètres.')
      else setError('Erreur micro. Réessaie.')
    }

    recognition.onend = () => {
      if (status === STATUS.LISTENING) setStatus(STATUS.IDLE)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [sendToCoach, status])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setStatus(STATUS.IDLE)
  }, [])

  const handleMic = () => {
    if (status === STATUS.LISTENING) stopListening()
    else if (status === STATUS.IDLE) startListening()
    else if (status === STATUS.SPEAKING) {
      window.speechSynthesis.cancel()
      setStatus(STATUS.IDLE)
      startListening()
    }
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
    const greeting = getCoachMessage(settings.mode, 'idle')
    setCoachText(greeting)
    setTimeout(() => {
      speak(greeting, () => setStatus(STATUS.IDLE))
      setStatus(STATUS.SPEAKING)
    }, 200)
  }

  const statusLabel = {
    [STATUS.IDLE]: 'Appuie pour parler',
    [STATUS.LISTENING]: 'Écoute...',
    [STATUS.THINKING]: 'Le coach réfléchit...',
    [STATUS.SPEAKING]: 'Le coach parle...',
  }[status]

  const micActive = status === STATUS.LISTENING
  const micPulse = status === STATUS.LISTENING || status === STATUS.SPEAKING

  return (
    <div className="h-dvh overflow-hidden flex flex-col px-5 pt-5 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Coach IA</h2>
          <p className="text-xs text-brutal-400 mt-0.5">
            Mode : <span className={settings.mode === 'brutal' ? 'text-distraction-400' : 'text-productive-400'}>
              {settings.mode === 'brutal' ? 'Brutal' : 'Encouragement'}
            </span>
            {' · '}{todayStats.score}%
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-9 h-9 bg-brutal-800 rounded-xl flex items-center justify-center active:opacity-70"
        >
          <RefreshCw size={15} className="text-brutal-300" />
        </button>
      </div>

      {/* Coach response area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">

        {/* Coach avatar with pulse */}
        <div className="relative">
          {micPulse && (
            <div className={`absolute inset-0 rounded-full animate-ping opacity-20
              ${status === STATUS.LISTENING ? 'bg-productive-500' : 'bg-indigo-500'}`}
              style={{ transform: 'scale(1.4)' }}
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
              : <Bot size={32} className="text-brutal-300" />
            }
          </div>
        </div>

        {/* Coach text */}
        <div className="w-full bg-brutal-800 rounded-2xl px-5 py-4 min-h-[80px] flex items-center justify-center">
          <p className={`text-base text-white text-center leading-relaxed
            ${status === STATUS.THINKING ? 'text-brutal-400' : ''}`}>
            {coachText || '...'}
          </p>
        </div>

        {/* User text (what was heard) */}
        {userText ? (
          <p className="text-xs text-brutal-400 text-center italic">"{userText}"</p>
        ) : null}

        {/* Error */}
        {error ? (
          <p className="text-xs text-distraction-400 text-center">{error}</p>
        ) : null}

        {/* Status label */}
        <p className="text-xs text-brutal-400">{statusLabel}</p>
      </div>

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p}
            onClick={() => handleQuick(p)}
            disabled={status === STATUS.THINKING}
            className="flex-shrink-0 bg-brutal-800 border border-brutal-600 text-brutal-200
                       text-xs px-3 py-2 rounded-full whitespace-nowrap
                       active:opacity-70 disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Mic button */}
      <button
        onClick={handleMic}
        disabled={status === STATUS.THINKING}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3
                   transition-all active:scale-[0.98] disabled:opacity-40
          ${micActive
            ? 'bg-distraction-500 text-white'
            : 'bg-white text-brutal-900'}`}
      >
        {micActive ? <MicOff size={22} /> : <Mic size={22} />}
        {micActive ? 'Arrêter' : status === STATUS.SPEAKING ? 'Interrompre & Parler' : 'Parler au coach'}
      </button>

    </div>
  )
}

function buildLocalResponse(text, settings, ctx) {
  const t = text.toLowerCase()
  const mode = settings.mode

  if (t.includes('plan') || t.includes('aujourd')) {
    return mode === 'brutal'
      ? `Voici ton plan : ${settings.sessionGoalMinutes} minutes de travail, 10 minutes de pause, répète. Aucune excuse. Objectif : ${settings.dailyGoalHours} heures productives. Maintenant exécute.`
      : `Voici ton plan idéal : blocs de ${settings.sessionGoalMinutes} minutes avec des pauses de 10 minutes. Objectif : ${settings.dailyGoalHours} heures productives. Tu peux le faire !`
  }

  if (t.includes('défi') || t.includes('challenge')) {
    const defis = [
      'Travaille 45 minutes sans aucune interruption. Téléphone en mode avion.',
      'Termine une tâche que tu repousses depuis 3 jours.',
      'Fais une session de travail profond : 90 minutes, aucune notification.',
      'Identifie ta tâche la plus importante et commence par elle.',
    ]
    return defis[Math.floor(Math.random() * defis.length)]
  }

  if (t.includes('améliorer') || t.includes('discipline') || t.includes('conseil')) {
    return mode === 'brutal'
      ? `Stop aux excuses. Applique ça : téléphone en mode avion, un seul objectif à la fois, timer de ${settings.sessionGoalMinutes} minutes, aucune dérogation. La discipline ça se construit par la répétition, pas par la motivation.`
      : `Pour améliorer ta discipline : commence par de petites sessions de 30 minutes, élimine les distractions visibles, et célèbre chaque session complétée. La régularité prime sur l'intensité !`
  }

  if (t.includes('score') || t.includes('analyse') || t.includes('performance')) {
    const s = ctx.score
    const time = ctx.productiveTime
    if (s === 0) return mode === 'brutal' ? "Score nul. Tu n'as pas encore commencé. Lance une session." : "Tu n'as pas encore commencé aujourd'hui. Lance ta première session !"
    if (s >= 80) return mode === 'brutal' ? `${s} pourcent, c'est bien. Mais peut-on viser 90 ? ${time} minutes de productivité, continue.` : `${s} pourcent ! C'est excellent ! Tu as été productif pendant ${time} minutes. Continue sur cette lancée !`
    if (s >= 50) return mode === 'brutal' ? `${s} pourcent c'est insuffisant. Tu peux faire mieux. Concentre-toi.` : `${s} pourcent c'est un bon début ! Avec un peu plus de focus, tu peux atteindre 80. Tu y es presque !`
    return mode === 'brutal' ? `${s} pourcent c'est faible. Reprends-toi immédiatement.` : `${s} pourcent, ne te décourage pas ! Chaque session est une opportunité de s'améliorer.`
  }

  const defaults = mode === 'brutal'
    ? ["Travaille. C'est tout ce que j'ai à te dire.", "Arrête de parler, commence à agir.", "La question n'est pas comment, c'est quand. La réponse : maintenant."]
    : ["Je suis là pour t'aider ! Pose-moi tes questions sur la productivité.", "Continue à travailler, tu fais du bon boulot !", "Chaque effort compte. Tu avances !"]

  return defaults[Math.floor(Math.random() * defaults.length)]
}
