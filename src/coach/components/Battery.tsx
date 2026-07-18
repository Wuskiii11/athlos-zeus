import { useEffect, useRef, useState } from 'react'

// Circular readiness ring (replaces the old iOS-battery indicator).
// Same thresholds as before: green ≥ 80, yellow ≥ 60, red below.
function ringColor(percent: number) {
  return percent >= 80 ? 'var(--green)' : percent >= 60 ? 'var(--yellow)' : 'var(--red)'
}

const DURATION = 1500
const SIZE = 44
const RADIUS = 17
const STROKE = 3.5
const CIRCUM = 2 * Math.PI * RADIUS

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function Battery({ percent }: { percent: number }) {
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

  const color = ringColor(percent)
  const center = SIZE / 2

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
      <circle cx={center} cy={center} r={RADIUS} fill="none" stroke="var(--line2)" strokeWidth={STROKE} />
      <circle
        cx={center}
        cy={center}
        r={RADIUS}
        fill="none"
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeDasharray={CIRCUM}
        strokeDashoffset={CIRCUM * (1 - display / 100)}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text
        x={center}
        y={center + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text)"
        fontSize="11"
        fontWeight="600"
        fontFamily="'JetBrains Mono', monospace"
      >
        {display}
      </text>
    </svg>
  )
}
