import { useEffect } from 'preact/hooks'
import { Link } from 'react-router-dom'
import { Play, Clock, TrendingDown, Zap, MessageCircle, BarChart2, Trophy, Flame } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { formatDuration } from '../utils/format'

function ScoreRing({ score }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="absolute -rotate-90" width="160" height="160">
        {/* Background ring */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke="#252525"
          strokeWidth="10"
        />
        {/* Progress ring */}
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-4xl font-bold text-white leading-none">{score}</div>
        <div className="text-xs text-brutal-300 mt-1 tracking-widest uppercase">score</div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex-1 bg-brutal-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-brutal-300">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { todayStats, settings, streak, points, dashboardMsg, refreshDashboardMsg } = useStore()
  const { productiveTime, lostTime, score, sessions } = todayStats
  const dailyGoalSec = settings.dailyGoalHours * 3600
  const progress = Math.min(100, Math.round((productiveTime / dailyGoalSec) * 100))

  useEffect(() => {
    refreshDashboardMsg('check')
  }, [])

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">BrutalCoach</h1>
          <p className="text-brutal-300 text-sm mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-brutal-800 px-3 py-1.5 rounded-full">
            <Flame size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-white">{streak}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-brutal-800 px-3 py-1.5 rounded-full">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-sm font-semibold text-white">{points}</span>
          </div>
        </div>
      </div>

      {/* Score Ring */}
      <div className="bg-brutal-800 rounded-3xl p-6 flex flex-col items-center gap-4">
        <ScoreRing score={score} />

        {/* Daily progress bar */}
        <div className="w-full">
          <div className="flex justify-between text-xs text-brutal-300 mb-2">
            <span>Objectif journalier</span>
            <span className="text-white font-medium">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-brutal-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-productive-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-brutal-400 mt-1.5">
            <span>{formatDuration(productiveTime)}</span>
            <span>{settings.dailyGoalHours}h objectif</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <StatCard
          icon={Clock}
          label="Productif"
          value={formatDuration(productiveTime) || '—'}
          color="bg-productive-500/20 text-productive-400"
        />
        <StatCard
          icon={TrendingDown}
          label="Perdu"
          value={formatDuration(lostTime) || '—'}
          color="bg-distraction-500/20 text-distraction-400"
        />
        <StatCard
          icon={Zap}
          label="Sessions"
          value={sessions}
          color="bg-indigo-500/20 text-indigo-400"
        />
      </div>

      {/* Coach message */}
      <div
        className="bg-brutal-800 rounded-2xl p-4 flex gap-3 items-start cursor-pointer active:opacity-80"
        onClick={() => refreshDashboardMsg('check')}
      >
        <div className="w-8 h-8 bg-indigo-600/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageCircle size={15} className="text-indigo-400" />
        </div>
        <div>
          <p className="text-xs text-brutal-400 mb-1 uppercase tracking-widest font-medium">Coach</p>
          <p className="text-sm text-white leading-relaxed">{dashboardMsg}</p>
        </div>
      </div>

      {/* Actions */}
      <Link
        to="/session"
        className="w-full bg-white text-brutal-900 rounded-2xl py-4 font-bold text-base
                   flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Play size={18} fill="currentColor" />
        Démarrer une session
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/history"
          className="bg-brutal-800 rounded-2xl py-4 flex flex-col items-center gap-2
                     active:opacity-70 transition-opacity"
        >
          <BarChart2 size={20} className="text-indigo-400" />
          <span className="text-sm font-medium text-white">Historique</span>
        </Link>
        <Link
          to="/coach"
          className="bg-brutal-800 rounded-2xl py-4 flex flex-col items-center gap-2
                     active:opacity-70 transition-opacity"
        >
          <MessageCircle size={20} className="text-indigo-400" />
          <span className="text-sm font-medium text-white">Coach IA</span>
        </Link>
      </div>
    </div>
  )
}
