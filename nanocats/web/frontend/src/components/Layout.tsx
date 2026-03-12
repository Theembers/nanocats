import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, Settings, BarChart3, FileText, LogOut, Cat } from 'lucide-react';

export default function Layout() {
  const { agent, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/config', icon: Settings, label: 'Config' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/logs', icon: FileText, label: 'Logs' },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex flex-col shrink-0"
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        {/* Logo */}
        <div
          className="px-6 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Cat className="w-5 h-5" style={{ color: 'var(--text-inverse)' }} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-inverse)' }}>
              nanocats
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-primary)' }}>
              Agent Swarm
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                      isActive ? 'nav-active' : 'nav-idle'
                    }`
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--text-inverse)',
                        }
                      : {
                          color: 'rgba(255,255,255,0.65)',
                        }
                  }
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    if (!el.classList.contains('nav-active')) {
                      el.style.backgroundColor = 'var(--bg-sidebar-hover)';
                      el.style.color = '#fff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    if (!el.classList.contains('nav-active')) {
                      el.style.backgroundColor = '';
                      el.style.color = 'rgba(255,255,255,0.65)';
                    }
                  }}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                backgroundColor: 'var(--color-primary-dark)',
                color: 'var(--text-inverse)',
              }}
            >
              {agent?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-inverse)' }}>
                {agent?.name || agent?.id}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--color-primary)' }}>
                {agent?.type} Agent
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(192,97,74,0.2)';
              (e.currentTarget as HTMLElement).style.color = '#e88a76';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '';
              (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
