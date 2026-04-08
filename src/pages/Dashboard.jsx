import { useEffect } from 'preact/hooks'
import { Link } from 'react-router-dom'
import { Play, Clock, TrendingDown, Zap, MessageCircle, Trophy, Flame } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { formatDuration } from '../utils/format'

function ScoreRing({ score }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="absolute -rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={radius} fill="none" stroke="#252525" strokeWidth="9" />
        <circle
          cx="56" cy="56" r={radius}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-bold text-white leading-none">{score}</div>
        <div className="text-[10px] text-brutal-300 mt-0.5 tracking-widest uppercase">score</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { todayStats, settings, streak, points, dashboardMsg, refreshDashboardMsg } = useStore()
  const { productiveTime, lostTime, score, sessions } = todayStats
  const dailyGoalSec = settings.dailyGoalHours * 3600
  const progress = Math.min(100, Math.round((productiveTime / dailyGoalSec) * 100))

  useEffect(() => { refreshDashboardMsg('check') }, [])

  return (
    <div className="h-dvh overflow-hidden flex flex-col px-4 pt-5 pb-24 gap-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">BrutalCoach</h1>
          <p className="text-brutal-300 text-xs mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-brutal-800 px-2.5 py-1 rounded-full">
            <Flame size={13} className="text-orange-400" />
            <span className="text-xs font-semibold text-white">{streak}</span>
          </div>
          <div className="flex items-center gap-1 bg-brutal-800 px-2.5 py-1 rounded-full">
            <Trophy size={13} className="text-yellow-400" />
            <span className="text-xs font-semibold text-white">{points}</span>
          </div>
        </div>
      </div>

      {/* Score + progress */}
      <div className="bg-brutal-800 rounded-2xl px-4 py-3 flex items-center gap-4">
        <ScoreRing score={score} />
        <div className="flex-1">
          <div className="flex justify-between text-xs text-brutal-300 mb-1.5">
            <span>Objectif journalier</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-brutal-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-productive-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-brutal-400 mt-1">
            <span>{formatDuration(productiveTime)}</span>
            <span>{settings.dailyGoalHours}h objectif</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        {[
          { icon: Clock, label: 'Productif', value: formatDuration(productiveTime) || '—', cls: 'bg-productive-500/20 text-productive-400' },
          { icon: TrendingDown, label: 'Perdu', value: formatDuration(lostTime) || '—', cls: 'bg-distraction-500/20 text-distraction-400' },
          { icon: Zap, label: 'Sessions', value: sessions, cls: 'bg-indigo-500/20 text-indigo-400' },
        ].map(({ icon: Icon, label, value, cls }) => (
          <div key={label} className="flex-1 bg-brutal-800 rounded-xl p-3 flex flex-col gap-1.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cls}`}>
              <Icon size={14} />
            </div>
            <div className="text-base font-bold text-white">{value}</div>
            <div className="text-[10px] text-brutal-300">{label}</div>
          </div>
        ))}
      </div>

      {/* Coach message */}
      <div
        className="bg-brutal-800 rounded-2xl px-4 py-3 flex gap-3 items-start cursor-pointer active:opacity-80 flex-1"
        onClick={() => refreshDashboardMsg('check')}
      >
        <div className="w-7 h-7 bg-indigo-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageCircle size={14} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-[10px] text-brutal-400 mb-1 uppercase tracking-widest font-medium">Coach</p>
          <p className="text-sm text-white leading-relaxed">{dashboardMsg}</p>
        </div>
      </div>

      {/* Start button */}
      <Link
        to="/session"
        className="w-full bg-white text-brutal-900 rounded-2xl py-3.5 font-bold text-base
                   flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Play size={17} fill="currentColor" />
        Démarrer une session
      </Link>

    </div>
  )
}
