import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Cat } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await login(userId, password);
      navigate('/chat');
    } catch (err) {
    }
  };

  return (
    <div className="login-container">
      <div className="login-left-panel">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Cat size={32} />
          </div>
          <span className="login-brand-text">nanocats</span>
        </div>
        <p className="login-tagline">Your ultra-lightweight AI assistant</p>
      </div>
      <div className="login-right-panel">
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your dashboard</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label htmlFor="userId">Agent ID</label>
              <input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your agent ID"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Access Token</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your access token"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size="small" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
