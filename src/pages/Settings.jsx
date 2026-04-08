import { useState } from 'preact/hooks'
import { Eye, EyeOff, Check, Trash2, Zap, Heart } from 'lucide-react'
import { useStore } from '../store/StoreContext'

const CATEGORIES = ['Études', 'Sport', 'Projets', 'Lecture', 'Autre']

function Section({ title, children }) {
  return (
    <div className="bg-brutal-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-brutal-700">
        <p className="text-xs font-semibold text-brutal-300 uppercase tracking-widest">{title}</p>
      </div>
      <div className="divide-y divide-brutal-700">{children}</div>
    </div>
  )
}

function Row({ label, sub, children }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{label}</p>
        {sub && <p className="text-xs text-brutal-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200
        ${value ? 'bg-productive-500' : 'bg-brutal-600'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
        ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function Stepper({ value, onChange, min, max, step = 1, format }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-8 h-8 bg-brutal-700 rounded-xl text-white font-bold flex items-center justify-center active:opacity-70"
      >−</button>
      <span className="text-white font-semibold w-14 text-center">
        {format ? format(value) : value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-8 h-8 bg-brutal-700 rounded-xl text-white font-bold flex items-center justify-center active:opacity-70"
      >+</button>
    </div>
  )
}

export default function Settings() {
  const { settings, updateSettings } = useStore()
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearData = () => {
    if (window.confirm('Effacer tout l\'historique ? Cette action est irréversible.')) {
      localStorage.removeItem('bc_history')
      localStorage.removeItem('bc_today')
      localStorage.removeItem('bc_streak')
      localStorage.removeItem('bc_points')
      window.location.reload()
    }
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28">
      <h2 className="text-xl font-bold text-white">Paramètres</h2>

      {/* Objectifs */}
      <Section title="Objectifs">
        <Row
          label="Objectif journalier"
          sub="Heures productives par jour"
        >
          <Stepper
            value={settings.dailyGoalHours}
            onChange={v => updateSettings({ dailyGoalHours: v })}
            min={1}
            max={16}
            format={v => `${v}h`}
          />
        </Row>
        <Row
          label="Durée de session"
          sub="Durée cible d'une session"
        >
          <Stepper
            value={settings.sessionGoalMinutes}
            onChange={v => updateSettings({ sessionGoalMinutes: v })}
            min={15}
            max={240}
            step={15}
            format={v => `${v}m`}
          />
        </Row>
      </Section>

      {/* Mode coach */}
      <Section title="Mode Coach IA">
        <Row label="Mode actif">
          <div className="flex bg-brutal-700 p-1 rounded-xl gap-1">
            <button
              onClick={() => updateSettings({ mode: 'brutal' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${settings.mode === 'brutal' ? 'bg-distraction-500 text-white' : 'text-brutal-300'}`}
            >
              <Zap size={12} />
              Brutal
            </button>
            <button
              onClick={() => updateSettings({ mode: 'encourage' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${settings.mode === 'encourage' ? 'bg-productive-500 text-white' : 'text-brutal-300'}`}
            >
              <Heart size={12} />
              Bienveillant
            </button>
          </div>
        </Row>
        <Row
          label="Description"
          sub={settings.mode === 'brutal'
            ? 'Le coach ne mâche pas ses mots. Messages directs, sans filtre.'
            : 'Le coach encourage et motive. Messages positifs et bienveillants.'}
        >
          <div />
        </Row>
      </Section>

      {/* Catégorie par défaut */}
      <Section title="Catégorie par défaut">
        <Row label="Catégorie">
          <div className="flex flex-wrap gap-1.5 justify-end max-w-[200px]">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => updateSettings({ category: c })}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                  ${settings.category === c
                    ? 'bg-white text-brutal-900'
                    : 'bg-brutal-700 text-brutal-300'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      {/* OpenAI */}
      <Section title="Intégration IA (optionnel)">
        <Row
          label="Clé OpenAI"
          sub="Optionnel. Active le coach GPT temps réel."
        >
          <div />
        </Row>
        <div className="px-4 pb-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.openAIKey}
              onInput={e => updateSettings({ openAIKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-brutal-700 border border-brutal-600 rounded-xl px-3 py-2.5 pr-10
                         text-sm text-white placeholder-brutal-400 outline-none
                         focus:border-indigo-500 transition-colors"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brutal-400"
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {settings.openAIKey && (
            <p className="text-xs text-productive-400 mt-1.5 flex items-center gap-1">
              <Check size={12} /> Clé configurée — coach GPT activé
            </p>
          )}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications">
        <Row
          label="Rappels push"
          sub="Alertes et rappels de session"
        >
          <Toggle
            value={settings.notifications}
            onChange={v => updateSettings({ notifications: v })}
          />
        </Row>
      </Section>

      {/* Danger zone */}
      <Section title="Données">
        <Row label="Effacer tout l'historique" sub="Irréversible — sessions, stats, streak">
          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 bg-distraction-500/20 text-distraction-400
                       text-xs font-semibold px-3 py-2 rounded-xl active:opacity-70"
          >
            <Trash2 size={13} />
            Effacer
          </button>
        </Row>
      </Section>

      {/* App info */}
      <div className="text-center py-2">
        <p className="text-xs text-brutal-500">BrutalCoach v1.0</p>
        <p className="text-xs text-brutal-600 mt-0.5">La discipline, c'est maintenant.</p>
      </div>
    </div>
  )
}
