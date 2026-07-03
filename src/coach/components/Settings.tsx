import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { coachProfile, settingsGroups } from '../data'
import { useT, type Lang } from '../i18n'
import { supabase, hasSupabase } from '../../lib/supabase'

export default function Settings({
  darkMode,
  onToggleDarkMode,
  metricUnits,
  onToggleMetricUnits,
  onLogout,
  teamName,
  onEditTeamName,
  lang = 'en',
  onLangChange,
}: {
  darkMode: boolean
  onToggleDarkMode: () => void
  metricUnits: boolean
  onToggleMetricUnits: () => void
  onLogout: () => void
  teamName: string
  onEditTeamName: (name: string) => void
  lang?: Lang
  onLangChange?: (lang: Lang) => void
}) {
  const t = useT()
  const [name, setName] = useState(coachProfile.name)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Load the coach's saved avatar from Supabase (cloud mode).
  useEffect(() => {
    if (!hasSupabase || !supabase) return
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u?.user) return
      const { data } = await supabase.from('coaches').select('photo').eq('id', u.user.id).maybeSingle()
      if (data?.photo) setPhotoUrl(data.photo)
    })().catch(() => {})
  }, [])

  // Upload the coach profile picture to Supabase Storage and save its URL.
  async function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoUrl(URL.createObjectURL(file)) // instant local preview
    if (!hasSupabase || !supabase) return
    try {
      const { data: u } = await supabase.auth.getUser()
      const uid = u?.user?.id
      if (!uid) return
      const path = `coach-${uid}`
      await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${pub.publicUrl}?t=${Date.now()}`
      setPhotoUrl(url)
      await supabase.from('coaches').update({ photo: url }).eq('id', uid)
    } catch { /* keep local preview on failure */ }
  }
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    settingsGroups.forEach((g) => g.items.forEach((i) => {
      if (i.type === 'toggle' && i.id !== 'dark' && i.id !== 'units') initial[i.id] = !!i.defaultOn
    }))
    return initial
  })

  function editName() {
    const v = window.prompt(t('Edit coach name:'), name)
    if (v) setName(v)
  }

  function editTeamName() {
    const v = window.prompt(t('Edit team name:'), teamName)
    if (v) onEditTeamName(v)
  }

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setLogoUrl(URL.createObjectURL(file))
  }

  function changePassword() {
    const next = window.prompt(t('Enter a new password:'))
    if (!next) return
    const confirmation = window.prompt(t('Confirm new password:'))
    if (confirmation !== next) {
      window.alert(t("Passwords don't match — try again."))
      return
    }
    window.alert(t('Password updated.'))
  }

  function logout() {
    if (window.confirm(t('Log out of ATHLOS?'))) onLogout()
  }

  function isToggleOn(id: string) {
    if (id === 'dark') return darkMode
    if (id === 'units') return metricUnits
    return toggles[id]
  }

  function toggleClick(id: string) {
    if (id === 'dark') return onToggleDarkMode()
    if (id === 'units') return onToggleMetricUnits()
    setToggles((t) => ({ ...t, [id]: !t[id] }))
  }

  return (
    <div className="screen">
      <div className="prof-hero">
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
        <div
          className="prof-pic"
          onClick={() => photoInputRef.current?.click()}
          style={photoUrl ? { backgroundImage: `url(${photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {!photoUrl && coachProfile.initials}
          <div className="cam">📷</div>
        </div>
        <button className="prof-name" onClick={editName}>
          {name} <span className="pen">✎</span>
        </button>
        <div className="prof-role">{t(coachProfile.role)} · {coachProfile.club}</div>
      </div>

      <div className="sectlabel">{t('Language')}</div>
      <div className="set-group">
        <div className="set-item">
          <span>{t('App language')}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['sl', 'en'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLangChange?.(l)}
                aria-pressed={lang === l}
                style={{
                  padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid var(--line2)',
                  background: lang === l ? 'var(--green)' : 'transparent',
                  color: lang === l ? '#ffffff' : 'var(--muted)',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 12,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sectlabel">{t('Team schedule')}</div>
      <div className="set-group">
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleLogoChange}
        />
        <div className="urnik-logo" onClick={() => logoInputRef.current?.click()}>
          <div
            className="lp"
            style={
              logoUrl
                ? { backgroundImage: `url(${logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                : undefined
            }
          >
            {!logoUrl && '🏆'}
          </div>
          <div className="li">
            <div className="t">{t('Schedule logo')}</div>
            <div className="s">{t('Shown to the team in the schedule')}</div>
          </div>
          <div className="up">{t('Edit')}</div>
        </div>
        <button className="set-item edit" onClick={editTeamName}>
          <span>{t('Team name')}</span>
          <span className="r">{teamName} ›</span>
        </button>
      </div>

      {settingsGroups.map((group) => (
        <div key={group.title}>
          <div className="sectlabel">{t(group.title)}</div>
          <div className="set-group">
            {group.items.map((item) => (
              <div className="set-item" key={item.id}>
                <span>{t(item.label)}</span>
                {item.type === 'toggle' ? (
                  <button
                    className={`toggle ${isToggleOn(item.id) ? 'on' : ''}`}
                    onClick={() => toggleClick(item.id)}
                    aria-pressed={isToggleOn(item.id)}
                  >
                    <span className="toggle-knob" />
                  </button>
                ) : (
                  <span className="r">{t(item.description ?? '')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="sectlabel">{t('Account')}</div>
      <div className="set-group">
        <button className="set-item edit" onClick={changePassword}>
          <span>{t('Password')}</span>
          <span className="chev">›</span>
        </button>
        <button className="set-item edit" onClick={logout}>
          <span style={{ color: 'var(--red)' }}>{t('Log out')}</span>
        </button>
      </div>
    </div>
  )
}
