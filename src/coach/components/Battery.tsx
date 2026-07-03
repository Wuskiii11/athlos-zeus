import { useEffect, useRef, useState } from 'react'

function battClass(percent: number) {
  return percent >= 80 ? 'g' : percent >= 60 ? 'y' : 'r'
}

const DURATION = 1500
const SEGMENTS = 4

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function Battery({ percent }: { percent: number }) {
  const cls = battClass(percent)
  const [display, setDisplay] = useState(0)
  const frame = useRef<number | undefined>(undefined)

  useEffect(() => {
    const start = performance.now()

    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION)
      setDisplay(Math.round(easeOutCubic(t) * percent))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [percent])

  const lit = Math.round((display / 100) * SEGMENTS)

  return (
    <div className={`batt ${cls}`}>
      <span className="pct mono">{display}%</span>
      <div className="cell">
        {Array.from({ length: SEGMENTS }).map((_, i) => (
          <div key={i} className={`seg ${i < lit ? 'lit' : ''}`} />
        ))}
      </div>
    </div>
  )
}
