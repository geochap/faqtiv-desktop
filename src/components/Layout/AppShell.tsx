import { Link, useLocation } from 'react-router-dom'

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path

  const menuItems = [
    { label: 'Chat', path: '/chat' },
    { label: 'Agents', path: '/agents' },
    { label: 'Training', path: '/training' },
    // Add: { label: 'Logs', path: '/logs' }, etc.
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <aside
        style={{
          width: '220px',
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #ddd',
          padding: '20px'
        }}
      >
        <h4 style={{ fontWeight: 'bold', marginBottom: '1.5rem' }}>FAQtiv</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {menuItems.map(({ label, path }) => (
            <li key={path} style={{ marginBottom: '0.8rem' }}>
              <Link
                to={path}
                style={{
                  display: 'block',
                  padding: '0.5em 1em',
                  borderRadius: '0.5em',
                  backgroundColor: isActive(path) ? '#007bff' : 'transparent',
                  color: isActive(path) ? '#fff' : '#000',
                  textDecoration: 'none'
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {children}
      </main>
    </div>
  )
}

export default AppShell
