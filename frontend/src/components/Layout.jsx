import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { MessageSquare, Settings, BarChart3, FileText, LogOut, Cat } from 'lucide-react';
import AgentTabBar from './AgentTabBar';
import './Layout.css';

function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/chat', label: 'Chat', icon: MessageSquare },
    { path: '/stats', label: 'Stats', icon: BarChart3 },
    { path: '/logs', label: 'Logs', icon: FileText },
  ];

  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Cat size={20} />
            </div>
            <div className="sidebar-brand-content">
              <span className="sidebar-brand-text">nanocats</span>
              <span className="sidebar-brand-subtitle">Agent Swarm</span>
            </div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getInitials(user?.name || user?.user_id)}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name || user?.user_id}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <AgentTabBar />
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
