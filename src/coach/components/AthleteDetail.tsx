import {
  getAthleteMetrics,
  getAthleteTrend,
  getAthleteWeightSeries,
  getOrCreateAthleteConversation,
  readinessStatus,
  type Athlete,
} from '../data'
import { useInViewOnce } from '../hooks/useInViewOnce'
import { useT } from '../i18n'
import AnimatedBar from './AnimatedBar'
import CountUp from './CountUp'
import WeightChart from './WeightChart'

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function barColor(score: number) {
  return score >= 70 ? 'var(--green)' : score >= 50 ? 'var(--yellow)' : 'var(--red)'
}

export default function AthleteDetail({
  athlete,
  onClose,
  onOpenChat,
  metricUnits,
}: {
  athlete: Athlete
  onClose: () => void
  onOpenChat: (conversationId: string) => void
  metricUnits: boolean
}) {
  const t = useT()
  const metrics = getAthleteMetrics(athlete)
  const trend = getAthleteTrend(athlete)
  const weightSeries = getAthleteWeightSeries(athlete)
  const status = readinessStatus(athlete.readiness)
  const [trendRef, trendInView] = useInViewOnce<HTMLDivElement>()

  return (
    <div className="chat-detail">
      <div className="cd-head">
        <button className="back" onClick={onClose}>‹</button>
        <div className="pic">{athlete.initials}</div>
        <div className="ti">
          <div className="n">{athlete.name}</div>
          <div className="s">{t('Readiness')} {athlete.readiness}%</div>
        </div>
      </div>

      <div className="ad-body">
        <button
          className="chat-cta"
          onClick={() => onOpenChat(getOrCreateAthleteConversation(athlete))}
        >
          💬 {t('Chat with')} {athlete.name.split(' ')[0]}
        </button>

        <div className="readiness-banner" style={{ borderColor: status.color }}>
          <div className="readiness-title" style={{ color: status.color }}>
            {t(status.title)}
          </div>
          <div className="readiness-desc">{t(status.desc)}</div>
        </div>

        <div className="sectlabel">{t('Breakdown')}</div>
        <div className="set-group metric-group">
          {metrics.map((m) => (
            <div className="metric-row" key={m.label}>
              <div className="metric-head">
                <div className="metric-text">
                  <span className="metric-label">{t(m.label)}</span>
                  <span className="metric-sub">
                    {t(m.sublabel)}
                    {m.weight > 0 ? ` · ${m.weight}%` : ''}
                  </span>
                </div>
                <CountUp className="metric-score mono" value={m.score} />
              </div>
              <AnimatedBar percent={m.score} color={barColor(m.score)} />
            </div>
          ))}
        </div>

        <div className="metric-note">
          {t('Mid-season: readiness strongly affects load. Below 60% the system automatically reduces volume; below 40% it recommends rest. A 28-day load window (acute vs. chronic) is also tracked.')}
        </div>

        <div className="sectlabel">{t('Last 7 days')}</div>
        <div className="trend-card" ref={trendRef}>
          <div className="trend-chart">
            {trend.map((v, i) => (
              <div className="trend-bar-wrap" key={i}>
                <div
                  className={`trend-bar ${trendInView ? 'play' : ''}`}
                  style={{ height: `${v}%`, background: barColor(v), animationDelay: `${i * 110}ms` }}
                />
                <div className="trend-day">{dayLabels[i]}</div>
              </div>
            ))}
          </div>
        </div>

        <WeightChart points={weightSeries} metricUnits={metricUnits} />
      </div>
    </div>
  )
}
