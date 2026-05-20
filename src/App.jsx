import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const DEFAULT_POINTS = 5
const FADE_DURATION_MS = 3000

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
  const fadeTimers = useRef([])

  const totalPoints = useMemo(() => {
    const parsedValue = Number(pointInput)

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      return 0
    }

    return parsedValue
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
    setStatus('playing')
  }

  function removePointAfterFade(pointId) {
    const timerId = setTimeout(() => {
      setPoints((currentPoints) => {
        const remainingPoints = currentPoints.filter((point) => point.id !== pointId)

        if (remainingPoints.length === 0) {
          setStatus('cleared')
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
  }

  function handlePointClick(pointId) {
    if (status !== 'playing') {
      return
    }

    if (fadingPoints[pointId]) {
      return
    }

    if (pointId !== nextPoint) {
      setStatus('gameOver')
      return
    }

    setFadingPoints((currentPoints) => ({
      ...currentPoints,
      [pointId]: Date.now(),
    }))
    setNextPoint((currentPoint) => currentPoint + 1)
    removePointAfterFade(pointId)
  }

  useEffect(() => {
    if (status !== 'playing') {
      return undefined
    }

    const intervalId = setInterval(() => {
      setElapsedMs((currentTime) => currentTime + 100)
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
            type="number"
            value={pointInput}
            onChange={(event) => setPointInput(event.target.value)}
          />
        </label>

        <div className="control-row" aria-live="polite">
          <span>Time:</span>
          <span>{(elapsedMs / 1000).toFixed(1)}s</span>
        </div>

        <div className="button-row">
          <button type="button" onClick={resetGame} disabled={totalPoints === 0}>
            {status === 'idle' ? 'Start' : 'Restart'}
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
