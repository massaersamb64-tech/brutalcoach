import { useState, useEffect, useRef, useCallback } from 'preact/hooks'
import { useNavigate } from 'react-router-dom'
import { Pause, Play, Square, Zap, AlertTriangle, ChevronDown } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { formatTime, formatDuration } from '../utils/format'
import { getCoachMessage } from '../utils/coachAI'

const CATEGORIES = ['Études', 'Sport', 'Projets', 'Lecture', 'Autre']

const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  DISTRACTION: 'distraction',
}

export default function Session() {
  const navigate = useNavigate()
  const { settings, addSession } = useStore()

  const [status, setStatus] = useState(STATUS.IDLE)
  const [elapsed, setElapsed] = useState(0)        // total seconds since start
  const [productiveSec, setProductiveSec] = useState(0)
  const [lostSec, setLostSec] = useState(0)
  const [coachMsg, setCoachMsg] = useState(getCoachMessage(settings.mode, 'start'))
  const [category, setCategory] = useState(settings.category)
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [msgKey, setMsgKey] = useState(0) // for animation trigger

  const intervalRef = useRef(null)
  const msgTimerRef = useRef(null)
  const goalSec = settings.sessionGoalMinutes * 60

  const showMsg = useCallback((msg) => {
    setCoachMsg(msg)
    setMsgKey(k => k + 1)
  }, [])

  const triggerCoachMsg = useCallback((type) => {
    const score = productiveSec + lostSec > 0
      ? Math.round((productiveSec / (productiveSec + lostSec)) * 100)
      : null
    showMsg(getCoachMessage(settings.mode, type, score))
  }, [settings.mode, productiveSec, lostSec, showMsg])

  // Periodic coach messages
  useEffect(() => {
    if (status === STATUS.RUNNING) {
      msgTimerRef.current = setInterval(() => {
        triggerCoachMsg('productive')
      }, 120000) // every 2 min
    } else {
      clearInterval(msgTimerRef.current)
    }
    return () => clearInterval(msgTimerRef.current)
  }, [status, triggerCoachMsg])

  // Main timer
  useEffect(() => {
    if (status === STATUS.RUNNING || status === STATUS.DISTRACTION) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => e + 1)
        if (status === STATUS.RUNNING) {
          setProductiveSec(p => p + 1)
        } else {
          setLostSec(l => l + 1)
        }
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [status])

  // Alert when goal reached
  useEffect(() => {
    if (productiveSec === goalSec) {
      triggerCoachMsg('goal_reached')
    }
  }, [productiveSec, goalSec])

  // Alert at distraction milestones
  useEffect(() => {
    if (lostSec > 0 && lostSec % 60 === 0 && status === STATUS.DISTRACTION) {
      triggerCoachMsg('distraction')
    }
  }, [lostSec, status])

  const handleStart = () => {
    setStatus(STATUS.RUNNING)
    showMsg(getCoachMessage(settings.mode, 'start'))
  }

  const handlePause = () => {
    if (status === STATUS.PAUSED) {
      setStatus(STATUS.RUNNING)
      triggerCoachMsg('productive')
    } else {
      setStatus(STATUS.PAUSED)
      showMsg(getCoachMessage(settings.mode, 'pause'))
    }
  }

  const handleDistraction = () => {
    if (status === STATUS.DISTRACTION) {
      setStatus(STATUS.RUNNING)
      triggerCoachMsg('productive')
    } else if (status === STATUS.RUNNING) {
      setStatus(STATUS.DISTRACTION)
      showMsg(getCoachMessage(settings.mode, 'distraction'))
    }
  }

  const handleStop = () => {
    if (productiveSec + lostSec === 0) {
      navigate('/')
      return
    }
    const score = addSession({ productiveTime: productiveSec, lostTime: lostSec, category, goal: goalSec })
    navigate('/')
  }

  const score = productiveSec + lostSec > 0
    ? Math.round((productiveSec / (productiveSec + lostSec)) * 100)
    : null

  const goalProgress = Math.min(100, Math.round((productiveSec / goalSec) * 100))

  const isRunning = status === STATUS.RUNNING || status === STATUS.DISTRACTION

  return (
    <div className="flex flex-col min-h-screen px-5 pt-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Session</h2>
        <button
          onClick={() => setShowCatPicker(v => !v)}
          className="flex items-center gap-1.5 bg-brutal-800 px-3 py-1.5 rounded-full
                     text-sm text-brutal-200"
        >
          {category}
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Category Picker */}
      {showCatPicker && (
        <div className="flex gap-2 flex-wrap mb-4">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => { setCategory(c); setShowCatPicker(false) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${category === c
                  ? 'bg-white text-brutal-900'
                  : 'bg-brutal-800 text-brutal-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Timer display */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {/* Status badge */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
          transition-all duration-300
          ${status === STATUS.RUNNING ? 'bg-productive-500/20 text-productive-400' :
            status === STATUS.DISTRACTION ? 'bg-distraction-500/20 text-distraction-400' :
            status === STATUS.PAUSED ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-brutal-700 text-brutal-300'}`}
        >
          <div className={`w-2 h-2 rounded-full
            ${status === STATUS.RUNNING ? 'bg-productive-500 animate-pulse' :
              status === STATUS.DISTRACTION ? 'bg-distraction-500 animate-pulse' :
              status === STATUS.PAUSED ? 'bg-yellow-500' :
              'bg-brutal-400'}`}
          />
          {status === STATUS.RUNNING ? 'Productif' :
           status === STATUS.DISTRACTION ? 'Distraction' :
           status === STATUS.PAUSED ? 'En pause' :
           'Prêt'}
        </div>

        {/* Big timer */}
        <div className="text-center">
          <div className="text-7xl font-bold text-white tracking-tight tabular-nums">
            {formatTime(elapsed)}
          </div>
          <div className="text-brutal-400 text-sm mt-2">
            Objectif : {settings.sessionGoalMinutes}min
          </div>
        </div>

        {/* Goal progress */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-brutal-400 mb-2">
            <span className="text-productive-400 font-medium">{formatTime(productiveSec)} productif</span>
            <span className="text-distraction-400 font-medium">{formatTime(lostSec)} perdu</span>
          </div>
          <div className="h-2 bg-brutal-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-productive-500 rounded-full transition-all duration-500"
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          {score !== null && (
            <div className="text-center mt-2">
              <span className={`text-sm font-bold
                ${score >= 70 ? 'text-productive-400' : score >= 40 ? 'text-yellow-400' : 'text-distraction-400'}`}>
                {score}% de discipline
              </span>
            </div>
          )}
        </div>

        {/* Coach message */}
        <div
          key={msgKey}
          className="bg-brutal-800 rounded-2xl p-4 w-full max-w-xs animate-fade"
        >
          <p className="text-sm text-white text-center leading-relaxed">{coachMsg}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 pb-4">
        {status === STATUS.IDLE ? (
          <button
            onClick={handleStart}
            className="w-full bg-white text-brutal-900 rounded-2xl py-5 font-bold text-lg
                       flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
          >
            <Play size={22} fill="currentColor" />
            Démarrer
          </button>
        ) : (
          <>
            {/* Productive / Distraction toggle */}
            <button
              onClick={handleDistraction}
              disabled={status === STATUS.PAUSED}
              className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2
                         active:scale-[0.98] transition-all disabled:opacity-40
                ${status === STATUS.DISTRACTION
                  ? 'bg-productive-500 text-white'
                  : 'bg-distraction-500/20 text-distraction-400 border border-distraction-500/30'}`}
            >
              {status === STATUS.DISTRACTION
                ? <><Zap size={18} /> Reprendre le focus</>
                : <><AlertTriangle size={18} /> Signaler distraction</>
              }
            </button>

            <div className="flex gap-3">
              <button
                onClick={handlePause}
                className="flex-1 bg-brutal-800 border border-brutal-600 rounded-2xl py-4
                           font-semibold text-white flex items-center justify-center gap-2
                           active:opacity-70 transition-opacity"
              >
                {status === STATUS.PAUSED
                  ? <><Play size={18} fill="currentColor" /> Reprendre</>
                  : <><Pause size={18} /> Pause</>
                }
              </button>
              <button
                onClick={handleStop}
                className="flex-1 bg-brutal-800 border border-brutal-600 rounded-2xl py-4
                           font-semibold text-distraction-400 flex items-center justify-center gap-2
                           active:opacity-70 transition-opacity"
              >
                <Square size={18} fill="currentColor" />
                Terminer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
