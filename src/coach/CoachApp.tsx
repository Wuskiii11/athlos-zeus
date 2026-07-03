import { useState } from 'react'
import './App.css'
import { teamSchedule } from './data'
import { LangContext, translate, type Lang } from './i18n'
import Dashboard from './components/Dashboard'
import AICoach from './components/AICoach'
import Calendar from './components/Calendar'
import Chat from './components/Chat'
import Settings from './components/Settings'
import BottomNav, { type Tab } from './components/BottomNav'

const subtitleKey: Record<Tab, string> = {
  home: 'NK Domžale · coach',
  calendar: 'Team schedule',
  coach: 'AI Coach',
  chat: 'Messages',
  settings: 'Settings',
}

// Coach experience, mounted by the main app when the logged-in profile has role "coach".
// Login/logout + the chosen language are owned by the host app (profile.lang).
export default function CoachApp({
  onLogout,
  lang = 'en',
  onLangChange,
}: {
  onLogout?: () => void
  lang?: Lang
  onLangChange?: (lang: Lang) => void
}) {
  const [tab, setTab] = useState<Tab>('home')
  const [openChatId, setOpenChatId] = useState<string | null>(null)
  // Default to the device OS theme; the coach can flip it in Settings.
  const [darkMode, setDarkMode] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  )
  const [metricUnits, setMetricUnits] = useState(true)
  const [teamName, setTeamName] = useState(teamSchedule.teamName)

  function openChat(conversationId: string) {
    setOpenChatId(conversationId)
    setTab('chat')
  }

  return (
    <LangContext.Provider value={lang}>
      <div className={`phone ${darkMode ? '' : 'light'}`}>
        <div className="topbar">
          <div>
            <div className="logo">ATH<b>LOS</b></div>
            <div className="sub">{translate(lang, subtitleKey[tab])}</div>
          </div>
          <div className="topbar-avatar">M</div>
        </div>
        <div className="phone-content">
          <div className="screen-anim" key={tab}>
            {tab === 'home' && <Dashboard onOpenChat={openChat} metricUnits={metricUnits} />}
            {tab === 'calendar' && <Calendar teamName={teamName} />}
            {tab === 'coach' && <AICoach />}
            {tab === 'chat' && <Chat openId={openChatId} onOpenChange={setOpenChatId} />}
            {tab === 'settings' && (
              <Settings
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((d) => !d)}
                metricUnits={metricUnits}
                onToggleMetricUnits={() => setMetricUnits((m) => !m)}
                onLogout={() => onLogout?.()}
                teamName={teamName}
                onEditTeamName={setTeamName}
                lang={lang}
                onLangChange={(l) => onLangChange?.(l)}
              />
            )}
          </div>
        </div>
        <BottomNav active={tab} onChange={setTab} />
      </div>
    </LangContext.Provider>
  )
}
