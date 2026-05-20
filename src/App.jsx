import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_POINTS = 5
const FADE_DURATION_MS = 3000
const AUTO_PLAY_DELAY_MS = 650
const MAX_POINTS = 100

function createPoints(total) {
  return Array.from({ length: total }, (_, index) => ({
    id: index + 1,
    x: 8 + Math.random() * 84,
    y: 8 + Math.random() * 84,
  }))
}

function getTitle(status) {
  if (status === 'cleared') {
    return 'ALL CLEARED'
  }

  if (status === 'gameOver') {
    return 'GAME OVER'
  }

  return "LET'S PLAY"
}

function App() {
  const [pointInput, setPointInput] = useState(String(DEFAULT_POINTS))
  const [points, setPoints] = useState([])
  const [fadingPoints, setFadingPoints] = useState({})
  const [nextPoint, setNextPoint] = useState(1)
  const [status, setStatus] = useState('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [autoPlay, setAutoPlay] = useState(false)
  const fadeTimers = useRef([])
  const statusRef = useRef(status)

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus
    setStatus(nextStatus)
  }, [])

  const totalPoints = useMemo(() => {
    const parsedValue = Number(pointInput)

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return 0
    }

    return Math.min(parsedValue, MAX_POINTS)
  }, [pointInput])

  function clearFadeTimers() {
    fadeTimers.current.forEach((timerId) => clearTimeout(timerId))
    fadeTimers.current = []
  }

  function resetGame() {
    const pointCount = totalPoints || DEFAULT_POINTS

    clearFadeTimers()
    setPoints(createPoints(pointCount))
    setFadingPoints({})
    setNextPoint(1)
    setElapsedMs(0)
    setNow(Date.now())
    setAutoPlay(false)
    updateStatus('playing')
  }

  const removePointAfterFade = useCallback((pointId) => {
    const timerId = setTimeout(() => {
      setPoints((currentPoints) => {
        const remainingPoints = currentPoints.filter((point) => point.id !== pointId)

        if (remainingPoints.length === 0 && statusRef.current === 'playing') {
          updateStatus('cleared')
          setAutoPlay(false)
        }

        return remainingPoints
      })

      setFadingPoints((currentPoints) => {
        const nextFadingPoints = { ...currentPoints }
        delete nextFadingPoints[pointId]
        return nextFadingPoints
      })
    }, FADE_DURATION_MS)

    fadeTimers.current.push(timerId)
  }, [updateStatus])

  const handlePointClick = useCallback((pointId) => {
    if (status !== 'playing') {
      return
    }

    if (fadingPoints[pointId]) {
      return
    }

    if (pointId !== nextPoint) {
      updateStatus('gameOver')
      setAutoPlay(false)
      return
    }

    setFadingPoints((currentPoints) => ({
      ...currentPoints,
      [pointId]: Date.now(),
    }))
    setNextPoint((currentPoint) => currentPoint + 1)
    removePointAfterFade(pointId)
  }, [fadingPoints, nextPoint, removePointAfterFade, status, updateStatus])

  useEffect(() => {
    if (status !== 'playing') {
      return undefined
    }

    const intervalId = setInterval(() => {
      setElapsedMs((currentElapsedMs) => currentElapsedMs + 100)
    }, 100)

    return () => clearInterval(intervalId)
  }, [status])

  useEffect(() => {
    const hasFadingPoints = Object.keys(fadingPoints).length > 0

    if (status !== 'playing' && !hasFadingPoints) {
      return undefined
    }

    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, 100)

    return () => clearInterval(intervalId)
  }, [fadingPoints, status])

  useEffect(() => {
    if (!autoPlay || status !== 'playing') {
      return undefined
    }

    const nextActivePoint = points.find(
      (point) => point.id === nextPoint && !fadingPoints[point.id],
    )

    if (!nextActivePoint) {
      return undefined
    }

    const timeoutId = setTimeout(() => {
      handlePointClick(nextActivePoint.id)
    }, AUTO_PLAY_DELAY_MS)

    return () => clearTimeout(timeoutId)
  }, [autoPlay, fadingPoints, handlePointClick, nextPoint, points, status])

  useEffect(() => {
    return () => clearFadeTimers()
  }, [])

  return (
    <main className="game-shell">
      <section className="game-panel" aria-label="Clear points game">
        <h1 className={`status-title status-${status}`}>{getTitle(status)}</h1>

        <label className="control-row">
          <span>Points:</span>
          <input
            min="1"
            max={MAX_POINTS}
            type="number"
            value={pointInput}
            disabled={status === 'playing'}
            onChange={(event) => setPointInput(event.target.value)}
          />
        </label>

        <div className="control-row" aria-live="polite">
          <span>Time:</span>
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>

        <div className="button-row">
          <button type="button" onClick={resetGame} disabled={totalPoints === 0}>
            {status === 'idle' ? 'Play' : 'Restart'}
          </button>
          <button
            type="button"
            disabled={status !== 'playing'}
            onClick={() => setAutoPlay((currentValue) => !currentValue)}
          >
            Auto Play {autoPlay ? 'OFF' : 'ON'}
          </button>
        </div>

        <div className="board">
          {points.map((point) => {
            const fadingStartedAt = fadingPoints[point.id]
            const isFading = Boolean(fadingStartedAt)
            const remainingMs = FADE_DURATION_MS - (now - fadingStartedAt)
            const remainingSeconds = Math.max(0, remainingMs / 1000).toFixed(1)

            return (
              <button
                key={point.id}
                type="button"
                className={isFading ? 'point point-fading' : 'point'}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                onClick={() => handlePointClick(point.id)}
                disabled={status !== 'playing' || isFading}
              >
                <span>{point.id}</span>
                {isFading ? <small>{remainingSeconds}s</small> : null}
              </button>
            )
          })}
        </div>

        <p className="next-label">Next: {status === 'cleared' ? '-' : nextPoint}</p>
      </section>
    </main>
  )
}

export default App
