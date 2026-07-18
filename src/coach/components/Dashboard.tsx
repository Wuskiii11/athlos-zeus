import { useState } from 'react'
import { getTeamStats, type Athlete } from '../data'
import { useT } from '../i18n'
import AthleteDetail from './AthleteDetail'
import AthleteListSheet from './AthleteListSheet'
import AddAthleteSheet from './AddAthleteSheet'
import Battery from './Battery'
import CountUp from './CountUp'

type StatFilter = 'all' | 'ready' | 'tired'

type UiAthlete = Athlete & { user_id?: string; photo?: string | null }

// Coach home — the live view of the club: stat tiles, the athlete list with
// readiness rings, and the "+ add athlete by username" flow. All real data.
export default function Dashboard({
  athletes,
  coachId,
  club,
  onRefresh,
  onOpenChat,
  metricUnits,
}: {
  athletes: UiAthlete[]
  coachId: string
  club: { id: string; name: string; location: string | null; conversation_id: string | null }
  onRefresh: () => void
  onOpenChat: (conversationId: string) => void
  metricUnits: boolean
}) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const [statFilter, setStatFilter] = useState<StatFilter | null>(null)
  const [adding, setAdding] = useState(false)
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

      <div className="sectlabel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{t('Your athletes')}</span>
        <button
          onClick={() => setAdding(true)}
          style={{
            background: 'var(--green)', color: '#04130A', border: 'none',
            borderRadius: 999, padding: '6px 13px', fontFamily: 'inherit',
            fontWeight: 800, fontSize: 12, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          + {t('Add')}
        </button>
      </div>

      <div className="athlete-list">
        {athletes.map((a) => (
          <div className="athlete" key={a.id} onClick={() => setOpenId(a.id)}>
            <div className="pic" style={a.photo ? { backgroundImage: `url(${a.photo})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : undefined}>
              {a.initials}
            </div>
            <div className="info">
              <div className="nm">{a.name}</div>
              <div className="meta">{t(a.note)}</div>
            </div>
            <Battery percent={a.readiness} />
          </div>
        ))}
        {athletes.length === 0 && (
          <div className="empty" style={{ padding: '34px 20px', textAlign: 'center', lineHeight: 1.6 }}>
            {t('No athletes yet.')}<br />
            {t('Tap “+ Add” and search your athletes by username.')}
          </div>
        )}
      </div>

      {statFilter && (
        <AthleteListSheet
          title={filterTitle}
          athletes={filteredAthletes}
          onClose={() => setStatFilter(null)}
          onSelectAthlete={openFromList}
        />
      )}

      {adding && (
        <AddAthleteSheet
          coachId={coachId}
          club={club}
          existingUserIds={athletes.map((a) => a.user_id).filter(Boolean) as string[]}
          onAdded={onRefresh}
          onClose={() => setAdding(false)}
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
