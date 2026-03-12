import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Cat, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [agentId, setAgentId] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(agentId, token);
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex w-2/5 flex-col items-center justify-center p-12"
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          <Cat className="w-12 h-12" style={{ color: 'var(--text-inverse)' }} />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-inverse)' }}>
          nanocats
        </h1>
        <p className="text-center text-sm leading-relaxed" style={{ color: 'var(--color-primary)' }}>
          Personal AI Agent Swarm<br />
          Always curious, always ready 🐱
        </p>
        {/* Decorative tabby stripes */}
        <div className="mt-12 space-y-2 w-32 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                height: '3px',
                backgroundColor: 'var(--color-accent)',
                width: `${100 - i * 14}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Cat className="w-8 h-8" style={{ color: 'var(--text-inverse)' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>nanocats</h1>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Sign in with your agent credentials
          </p>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'rgba(192,97,74,0.1)',
                border: '1px solid rgba(192,97,74,0.3)',
                color: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="agentId"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Agent ID
              </label>
              <input
                type="text"
                id="agentId"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid var(--border-main)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-main)')}
                placeholder="e.g. admin"
                required
              />
            </div>

            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                Access Token
              </label>
              <input
                type="password"
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full px-4 py-3 rounded-xl outline-none transition-all text-sm"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1.5px solid var(--border-main)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-main)')}
                placeholder="Your access token"
                required
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Configured via <code>nanocats setup</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2"
              style={{
                backgroundColor: isLoading ? 'var(--color-accent-dark)' : 'var(--color-accent)',
                color: 'var(--text-inverse)',
                opacity: isLoading ? 0.8 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div
            className="mt-8 pt-6 text-xs space-y-1"
            style={{
              borderTop: '1px solid var(--border-soft)',
              color: 'var(--text-muted)',
            }}
          >
            <p>Agent ID · your agent configuration ID</p>
            <p>Token · set during <code>nanocats setup</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}
