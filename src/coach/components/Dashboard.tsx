import { useState } from 'react'
import { athletes, getTeamStats, type Athlete } from '../data'
import { useT } from '../i18n'
import AthleteDetail from './AthleteDetail'
import AthleteListSheet from './AthleteListSheet'
import Battery from './Battery'
import CountUp from './CountUp'

type StatFilter = 'all' | 'ready' | 'tired'

export default function Dashboard({
  onOpenChat,
  metricUnits,
}: {
  onOpenChat: (conversationId: string) => void
  metricUnits: boolean
}) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const [statFilter, setStatFilter] = useState<StatFilter | null>(null)
  const open = athletes.find((a) => a.id === openId)
  const stats = getTeamStats(athletes)

  const filteredAthletes =
    statFilter === 'ready'
      ? athletes.filter((a) => a.status === 'ready')
      : statFilter === 'tired'
        ? athletes.filter((a) => a.status === 'tired')
        : athletes

  const filterTitle =
    statFilter === 'ready' ? t('Ready') : statFilter === 'tired' ? t('Tired') : t('All athletes')

  function openFromList(athlete: Athlete) {
    setStatFilter(null)
    setOpenId(athlete.id)
  }

  return (
    <div className="screen">
      <div className="stat-row">
        <div className="stat" onClick={() => setStatFilter('all')}>
          <CountUp className="num" value={stats.total} />
          <div className="lbl">{t('athletes')}</div>
        </div>
        <div className="stat" onClick={() => setStatFilter('ready')}>
          <CountUp className="num green" value={stats.ready} />
          <div className="lbl">{t('ready')}</div>
        </div>
        <div className="stat" onClick={() => setStatFilter('tired')}>
          <CountUp className="num yellow" value={stats.tired} />
          <div className="lbl">{t('tired')}</div>
        </div>
      </div>

      <div className="sectlabel">{t('Your athletes')}</div>

      <div className="athlete-list">
        {athletes.map((a) => (
          <div className="athlete" key={a.id} onClick={() => setOpenId(a.id)}>
            <div className="pic">{a.initials}</div>
            <div className="info">
              <div className="nm">{a.name}</div>
              <div className="meta">{t(a.note)}</div>
            </div>
            <Battery percent={a.readiness} />
          </div>
        ))}
      </div>

      {statFilter && (
        <AthleteListSheet
          title={filterTitle}
          athletes={filteredAthletes}
          onClose={() => setStatFilter(null)}
          onSelectAthlete={openFromList}
        />
      )}

      {open && (
        <AthleteDetail
          athlete={open}
          onClose={() => setOpenId(null)}
          onOpenChat={onOpenChat}
          metricUnits={metricUnits}
        />
      )}
    </div>
  )
}
