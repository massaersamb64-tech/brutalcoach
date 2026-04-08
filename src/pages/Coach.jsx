import { useState, useRef, useEffect } from 'preact/hooks'
import { Send, Bot, User, Loader, RefreshCw } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { getCoachMessage, getOpenAIMessage } from '../utils/coachAI'
import { formatDuration } from '../utils/format'

const QUICK_PROMPTS = [
  "Comment améliorer ma discipline ?",
  "Plan pour aujourd'hui",
  "Mini-défi du jour",
  "Analyse mon score",
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
        ${isUser ? 'bg-indigo-600' : 'bg-brutal-700'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} className="text-indigo-400" />}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3
        ${isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-brutal-800 text-white rounded-tl-sm'}`}
      >
        <p className="text-sm leading-relaxed">{msg.content}</p>
        <p className="text-[10px] opacity-50 mt-1">{msg.time}</p>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-brutal-700 flex items-center justify-center">
        <Bot size={14} className="text-indigo-400" />
      </div>
      <div className="bg-brutal-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-brutal-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function now() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Coach() {
  const { settings, todayStats } = useStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Initial greeting
  useEffect(() => {
    const greeting = getCoachMessage(settings.mode, 'idle')
    setMessages([{
      role: 'assistant',
      content: greeting,
      time: now(),
    }])
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const getContext = () => ({
    score: todayStats.score,
    productiveTime: Math.round(todayStats.productiveTime / 60),
    sessions: todayStats.sessions,
  })

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text.trim(), time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      let response = null

      if (settings.openAIKey) {
        const history = messages
          .filter(m => !m.time || m.role)
          .map(m => ({ role: m.role, content: m.content }))
        history.push({ role: 'user', content: text.trim() })
        response = await getOpenAIMessage(settings.openAIKey, history, settings, getContext())
      }

      if (!response) {
        // Rule-based fallback
        response = buildLocalResponse(text.trim(), settings, getContext())
      }

      setMessages(prev => [...prev, { role: 'assistant', content: response, time: now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleQuick = (prompt) => {
    sendMessage(prompt)
  }

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: getCoachMessage(settings.mode, 'idle'), time: now() }])
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-3 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white">Coach IA</h2>
          <p className="text-xs text-brutal-400 mt-0.5">
            Mode : <span className={settings.mode === 'brutal' ? 'text-distraction-400' : 'text-productive-400'}>
              {settings.mode === 'brutal' ? 'Brutal' : 'Encouragement'}
            </span>
            {' · '}Score : <span className="text-white font-medium">{todayStats.score}%</span>
          </p>
        </div>
        <button
          onClick={clearChat}
          className="w-8 h-8 bg-brutal-800 rounded-xl flex items-center justify-center active:opacity-70"
        >
          <RefreshCw size={15} className="text-brutal-300" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-4 pb-2"
           style={{ paddingBottom: '180px' }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex-shrink-0 px-5 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => handleQuick(p)}
              disabled={loading}
              className="flex-shrink-0 bg-brutal-800 border border-brutal-600 text-brutal-200
                         text-xs px-3 py-2 rounded-full whitespace-nowrap
                         active:opacity-70 disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-5 pb-28">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onInput={e => setInput(e.target.value)}
            placeholder="Parle à ton coach..."
            className="flex-1 bg-brutal-800 border border-brutal-600 rounded-2xl px-4 py-3
                       text-sm text-white placeholder-brutal-400 outline-none
                       focus:border-indigo-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center
                       disabled:opacity-40 active:opacity-70 transition-opacity flex-shrink-0"
          >
            {loading ? <Loader size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  )
}

function buildLocalResponse(text, settings, ctx) {
  const t = text.toLowerCase()
  const mode = settings.mode

  if (t.includes('plan') || t.includes('aujourd')) {
    return mode === 'brutal'
      ? `Voici ton plan : ${settings.sessionGoalMinutes}min de travail, 10min de pause, répète. Aucune excuse. Objectif : ${settings.dailyGoalHours}h productives. Maintenant exécute.`
      : `Voici ton plan idéal : blocs de ${settings.sessionGoalMinutes}min avec des pauses de 10min. Objectif : ${settings.dailyGoalHours}h productives. Tu peux le faire !`
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
      ? `Stop aux excuses. Applique ça : 1) Téléphone en mode avion. 2) Un seul objectif à la fois. 3) Timer de ${settings.sessionGoalMinutes}min, aucune dérogation. La discipline ça se construit par la répétition, pas par la motivation.`
      : `Pour améliorer ta discipline : 1) Commence par de petites sessions (30min). 2) Élimine les distractions visibles. 3) Célèbre chaque session complétée. La régularité prime sur l'intensité !`
  }

  if (t.includes('score') || t.includes('analyse') || t.includes('performance')) {
    const s = ctx.score
    const time = ctx.productiveTime
    if (s === 0) return mode === 'brutal' ? 'Score nul. Tu n\'as pas encore commencé. Lance une session.' : 'Tu n\'as pas encore commencé aujourd\'hui. Lance ta première session !'
    if (s >= 80) return mode === 'brutal' ? `${s}% c'est bien. Mais peut-on viser 90% ? ${time} minutes de productivité, continue.` : `${s}% ! C'est excellent ! Tu as été productif pendant ${time} minutes. Continue sur cette lancée !`
    if (s >= 50) return mode === 'brutal' ? `${s}% c'est insuffisant. Tu peux faire mieux que ça. Concentre-toi.` : `${s}% c'est un bon début ! Avec un peu plus de focus, tu peux atteindre 80%. Tu y es presque !`
    return mode === 'brutal' ? `${s}% c'est honteux. Reprends-toi immédiatement.` : `${s}%, ne te décourage pas ! Chaque session est une opportunité de s'améliorer. Recommence maintenant.`
  }

  // Default
  const defaults = mode === 'brutal'
    ? ['Travaille. C\'est tout ce que j\'ai à te dire.', 'Arrête de parler, commence à agir.', 'La question n\'est pas comment, c\'est quand. La réponse : maintenant.']
    : ['Je suis là pour t\'aider ! Pose-moi tes questions sur la productivité.', 'Continue à travailler, tu fais du bon boulot !', 'Chaque question posée est un pas vers le progrès !']

  return defaults[Math.floor(Math.random() * defaults.length)]
}
