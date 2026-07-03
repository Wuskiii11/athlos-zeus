export default function LoggedOut({ onLogin }: { onLogin: () => void }) {
  return (
    <div
      className="screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div className="logo" style={{ fontSize: 22 }}>
        ATH<b>LOS</b>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: 13 }}>You've been logged out.</div>
      <button className="chat-cta" style={{ width: 'auto', padding: '12px 28px' }} onClick={onLogin}>
        Log back in
      </button>
    </div>
  )
}
