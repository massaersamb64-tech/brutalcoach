import { createContext } from 'preact'
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'
import { calcScore, getDateKey } from '../utils/format'
import { getCoachMessage } from '../utils/coachAI'

const StoreContext = createContext(null)

const DEFAULT_SETTINGS = {
  dailyGoalHours: 6,
  sessionGoalMinutes: 90,
  mode: 'brutal',
  category: 'Études',
  openAIKey: '',
  groqKey: '',
  notifications: true,
  voiceName: '',
  voiceRate: 1.05,
  voicePitch: 0.95,
  elevenLabsKey: '',
  elevenLabsVoiceId: '',
}

const DEFAULT_TODAY = {
  date: '',
  productiveTime: 0,
  lostTime: 0,
  sessions: 0,
  score: 0,
}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function getTodayStats() {
  const stored = load('bc_today', DEFAULT_TODAY)
  const today = getDateKey()
  // Reset if it's a new day
  if (stored.date !== today) {
    return { ...DEFAULT_TODAY, date: today }
  }
  return stored
}

export function StoreProvider({ children }) {
  const [settings, setSettingsState] = useState(() => load('bc_settings', DEFAULT_SETTINGS))
  const [todayStats, setTodayStatsState] = useState(getTodayStats)
  const [history, setHistoryState] = useState(() => load('bc_history', []))
  const [streak, setStreakState] = useState(() => load('bc_streak', 0))
  const [points, setPointsState] = useState(() => load('bc_points', 0))
  const [dashboardMsg, setDashboardMsg] = useState(() =>
    getCoachMessage(load('bc_settings', DEFAULT_SETTINGS).mode, 'idle')
  )

  // Persist on change
  useEffect(() => { save('bc_settings', settings) }, [settings])
  useEffect(() => { save('bc_today', todayStats) }, [todayStats])
  useEffect(() => { save('bc_history', history) }, [history])
  useEffect(() => { save('bc_streak', streak) }, [streak])
  useEffect(() => { save('bc_points', points) }, [points])

  // Check day rollover every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const today = getDateKey()
      setTodayStatsState(prev => {
        if (prev.date !== today) {
          return { ...DEFAULT_TODAY, date: today }
        }
        return prev
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  const updateSettings = useCallback((patch) => {
    setSettingsState(prev => ({ ...prev, ...patch }))
  }, [])

  const addSession = useCallback((session) => {
    // session: { productiveTime, lostTime, category, goal }
    const score = calcScore(session.productiveTime, session.lostTime)
    const entry = {
      id: Date.now(),
      date: getDateKey(),
      ...session,
      score,
    }

    setHistoryState(prev => [entry, ...prev].slice(0, 365))

    setTodayStatsState(prev => {
      const newProductive = prev.productiveTime + session.productiveTime
      const newLost = prev.lostTime + session.lostTime
      const newScore = calcScore(newProductive, newLost)
      return {
        date: getDateKey(),
        productiveTime: newProductive,
        lostTime: newLost,
        sessions: prev.sessions + 1,
        score: newScore,
      }
    })

    // Points: 1 pt per minute productive + bonus for score
    const earned = Math.floor(session.productiveTime / 60) + (score >= 80 ? 10 : 0)
    setPointsState(prev => prev + earned)

    // Streak: updated externally if needed (simple: streak resets if no session today by midnight)
    setStreakState(prev => prev + 1)

    return score
  }, [])

  const refreshDashboardMsg = useCallback((type = 'check') => {
    const today = getTodayStats()
    const score = today.score
    setDashboardMsg(getCoachMessage(settings.mode, type, score))
  }, [settings.mode])

  return (
    <StoreContext.Provider value={{
      settings,
      updateSettings,
      todayStats,
      history,
      streak,
      points,
      addSession,
      dashboardMsg,
      setDashboardMsg,
      refreshDashboardMsg,
    }}>
      {children}
    </StoreContext.Provider>
  )
}

export const useStore = () => useContext(StoreContext)
