import { useState, useMemo } from 'preact/hooks'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useStore } from '../store/StoreContext'
import { formatDuration, getWeekDays, getMonthDays, shortDay, shortDate, calcScore } from '../utils/format'
import { TrendingUp, Clock, Target, AlertTriangle } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Filler)

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: true } },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#666666', font: { size: 10 } },
      border: { display: false },
    },
    y: {
      grid: { color: '#252525' },
      ticks: { color: '#666666', font: { size: 10 }, maxTicksLimit: 4 },
      border: { display: false },
    },
  },
}

const TABS = ['Semaine', 'Mois']

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-brutal-800 rounded-2xl p-4 flex gap-3 items-center">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-white font-bold text-lg leading-none">{value}</div>
        <div className="text-brutal-400 text-xs mt-1">{label}</div>
        {sub && <div className="text-brutal-300 text-xs">{sub}</div>}
      </div>
    </div>
  )
}

export default function History() {
  const { history, todayStats } = useStore()
  const [tab, setTab] = useState(0)

  // Build daily map from history
  const byDate = useMemo(() => {
    const map = {}
    history.forEach(s => {
      if (!map[s.date]) map[s.date] = { productive: 0, lost: 0, sessions: 0 }
      map[s.date].productive += s.productiveTime
      map[s.date].lost += s.lostTime
      map[s.date].sessions += 1
    })
    // Add today's live stats
    if (todayStats.date) {
      const d = todayStats.date
      map[d] = {
        productive: todayStats.productiveTime,
        lost: todayStats.lostTime,
        sessions: todayStats.sessions,
      }
    }
    return map
  }, [history, todayStats])

  const weekDays = getWeekDays()
  const monthDays = getMonthDays()

  const days = tab === 0 ? weekDays : monthDays
  const labels = days.map(d => tab === 0 ? shortDay(d) : shortDate(d))

  const productiveData = days.map(d => Math.round((byDate[d]?.productive || 0) / 60))
  const lostData = days.map(d => Math.round((byDate[d]?.lost || 0) / 60))
  const scoreData = days.map(d => {
    const e = byDate[d]
    if (!e) return 0
    return calcScore(e.productive, e.lost)
  })

  const barData = {
    labels,
    datasets: [
      {
        label: 'Productif',
        data: productiveData,
        backgroundColor: 'rgba(16,185,129,0.8)',
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: 'Perdu',
        data: lostData,
        backgroundColor: 'rgba(239,68,68,0.6)',
        borderRadius: 4,
        borderSkipped: false,
      },
    ],
  }

  const lineData = {
    labels,
    datasets: [
      {
        data: scoreData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
    ],
  }

  // Summary stats
  const totalProductive = history.reduce((a, s) => a + s.productiveTime, 0) + todayStats.productiveTime
  const totalLost = history.reduce((a, s) => a + s.lostTime, 0) + todayStats.lostTime
  const totalSessions = history.length + todayStats.sessions
  const avgScore = totalSessions > 0
    ? Math.round(scoreData.filter(Boolean).reduce((a, v) => a + v, 0) / (scoreData.filter(Boolean).length || 1))
    : 0

  // Life projection: hours lost per year
  const avgLostPerDay = totalSessions > 0
    ? totalLost / Math.max(1, [...new Set(history.map(s => s.date))].length)
    : 0
  const hoursLostYear = Math.round((avgLostPerDay * 365) / 3600)

  return (
    <div className="flex flex-col gap-5 px-5 pt-6 pb-28">
      <h2 className="text-xl font-bold text-white">Statistiques</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={Clock}
          label="Temps productif total"
          value={formatDuration(totalProductive)}
          color="bg-productive-500/20 text-productive-400"
        />
        <SummaryCard
          icon={Target}
          label="Score moyen"
          value={`${avgScore}%`}
          sub={`${totalSessions} sessions`}
          color="bg-indigo-500/20 text-indigo-400"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total sessions"
          value={totalSessions}
          color="bg-brutal-600/50 text-brutal-200"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Projection perte/an"
          value={`${hoursLostYear}h`}
          sub="heures perdues"
          color="bg-distraction-500/20 text-distraction-400"
        />
      </div>

      {/* Tab switcher */}
      <div className="flex bg-brutal-800 p-1 rounded-2xl">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200
              ${tab === i ? 'bg-white text-brutal-900' : 'text-brutal-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Bar chart - productive vs lost */}
      <div className="bg-brutal-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-white">Temps (min)</p>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-productive-400">
              <span className="w-2 h-2 rounded-sm bg-productive-500 inline-block" />
              Productif
            </span>
            <span className="flex items-center gap-1.5 text-distraction-400">
              <span className="w-2 h-2 rounded-sm bg-distraction-500 inline-block" />
              Perdu
            </span>
          </div>
        </div>
        <div style={{ height: 160 }}>
          <Bar
            data={barData}
            options={{
              ...CHART_OPTIONS,
              scales: {
                ...CHART_OPTIONS.scales,
                x: { ...CHART_OPTIONS.scales.x, stacked: false },
                y: { ...CHART_OPTIONS.scales.y, stacked: false },
              },
            }}
          />
        </div>
      </div>

      {/* Line chart - discipline score */}
      <div className="bg-brutal-800 rounded-2xl p-4">
        <p className="text-sm font-semibold text-white mb-4">Score de discipline (%)</p>
        <div style={{ height: 140 }}>
          <Line
            data={lineData}
            options={{
              ...CHART_OPTIONS,
              scales: {
                ...CHART_OPTIONS.scales,
                y: {
                  ...CHART_OPTIONS.scales.y,
                  min: 0,
                  max: 100,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Session list */}
      {history.length > 0 && (
        <div className="bg-brutal-800 rounded-2xl p-4">
          <p className="text-sm font-semibold text-white mb-3">Sessions récentes</p>
          <div className="flex flex-col gap-2">
            {history.slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-brutal-700 last:border-0">
                <div>
                  <span className="text-sm text-white font-medium">{s.category || 'Session'}</span>
                  <span className="text-xs text-brutal-400 ml-2">{s.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-productive-400">{formatDuration(s.productiveTime)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                    ${s.score >= 70 ? 'bg-productive-500/20 text-productive-400' :
                      s.score >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-distraction-500/20 text-distraction-400'}`}>
                    {s.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length === 0 && (
        <div className="text-center py-10 text-brutal-400">
          <p className="text-base">Aucune session encore.</p>
          <p className="text-sm mt-1">Lance ta première session !</p>
        </div>
      )}
    </div>
  )
}
