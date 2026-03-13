import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Save, User, Bot, Wrench, FileText, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AgentConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

type TabId = 'basic' | 'workspace';

const WORKSPACE_FILES = [
  {
    filename: 'AGENTS.md',
    label: 'AGENTS.md',
    description: 'Agent instructions and behavior guidelines',
    icon: '🤖',
  },
  {
    filename: 'SOUL.md',
    label: 'SOUL.md',
    description: 'Agent personality and core values',
    icon: '✨',
  },
  {
    filename: 'USER.md',
    label: 'USER.md',
    description: 'User profile and preferences for the agent',
    icon: '👤',
  },
  {
    filename: 'TOOLS.md',
    label: 'TOOLS.md',
    description: 'Tool usage rules and restrictions',
    icon: '🔧',
  },
  {
    filename: 'HEARTBEAT.md',
    label: 'HEARTBEAT.md',
    description: 'Periodic heartbeat tasks configuration',
    icon: '💓',
  },
];

// ─── Workspace file editor ───────────────────────────────────────────────────
interface WorkspaceEditorProps {
  token: string | null;
}

function WorkspaceEditor({ token }: WorkspaceEditorProps) {
  const [activeFile, setActiveFile] = useState(WORKSPACE_FILES[0].filename);
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [savingFile, setSavingFile] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<Record<string, 'saved' | 'error' | null>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const loadFile = useCallback(async (filename: string) => {
    if (contents[filename] !== undefined) return; // already loaded
    setLoadingFile(filename);
    try {
      const res = await fetch(`${API_URL}/api/workspace/files/${filename}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContents(prev => ({ ...prev, [filename]: data.content }));
      }
    } catch (err) {
      console.error('Failed to load', filename, err);
    } finally {
      setLoadingFile(null);
    }
  }, [token, contents]);

  // Load initial file on mount
  useEffect(() => {
    loadFile(activeFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (filename: string) => {
    setActiveFile(filename);
    loadFile(filename);
  };

  const handleChange = (filename: string, value: string) => {
    setContents(prev => ({ ...prev, [filename]: value }));
    setDirty(prev => ({ ...prev, [filename]: true }));
    setFileStatus(prev => ({ ...prev, [filename]: null }));
  };

  const handleSave = async (filename: string) => {
    setSavingFile(filename);
    try {
      const res = await fetch(`${API_URL}/api/workspace/files/${filename}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: contents[filename] ?? '' }),
      });
      if (res.ok) {
        setFileStatus(prev => ({ ...prev, [filename]: 'saved' }));
        setDirty(prev => ({ ...prev, [filename]: false }));
        setTimeout(() => setFileStatus(prev => ({ ...prev, [filename]: null })), 3000);
      } else {
        setFileStatus(prev => ({ ...prev, [filename]: 'error' }));
      }
    } catch {
      setFileStatus(prev => ({ ...prev, [filename]: 'error' }));
    } finally {
      setSavingFile(null);
    }
  };

  const currentFile = WORKSPACE_FILES.find(f => f.filename === activeFile)!;
  const isLoading = loadingFile === activeFile;
  const isSaving = savingFile === activeFile;
  const status = fileStatus[activeFile];
  const isDirty = dirty[activeFile];

  return (
    <div className="flex gap-5 h-full">
      {/* Sidebar file list */}
      <div className="w-52 shrink-0 space-y-0.5">
        {WORKSPACE_FILES.map(file => (
          <button
            key={file.filename}
            onClick={() => handleTabChange(file.filename)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
            style={{
              backgroundColor: activeFile === file.filename ? 'var(--color-accent-light)' : 'transparent',
              border: activeFile === file.filename ? '1px solid rgba(196,149,106,0.3)' : '1px solid transparent',
              color: activeFile === file.filename ? 'var(--color-accent-dark)' : 'var(--text-secondary)',
            }}
          >
            <span className="text-base">{file.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.label}</p>
            </div>
            {dirty[file.filename] && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--color-accent)' }} title="Unsaved changes" />
            )}
            {activeFile === file.filename && (
              <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
            )}
          </button>
        ))}
      </div>

      {/* Editor panel */}
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--bg-base)' }}
        >
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {currentFile.icon} {currentFile.label}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{currentFile.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-success)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-error)' }}>
                <AlertCircle className="w-3.5 h-3.5" /> Failed to save
              </span>
            )}
            <button
              onClick={() => handleSave(activeFile)}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-inverse)',
                opacity: (isSaving || !isDirty) ? 0.4 : 1,
                cursor: (isSaving || !isDirty) ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-3.5 h-3.5" /> Save</>
              )}
            </button>
          </div>
        </div>

        {/* Textarea */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-accent)' }} />
          </div>
        ) : (
          <textarea
            value={contents[activeFile] ?? ''}
            onChange={e => handleChange(activeFile, e.target.value)}
            className="flex-1 resize-none p-6 font-mono text-sm leading-relaxed outline-none"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            placeholder={`# ${activeFile}\n\nAdd your content here...`}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}

// ─── Main ConfigPage ──────────────────────────────────────────────────────────
export default function ConfigPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [provider, setProvider] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/api/agent/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
        setName(data.name || '');
        setModel(data.model || '');
        setProvider(data.provider || '');
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/api/agent/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          model,
          provider,
        }),
      });
      setMessage(response.ok ? 'Configuration saved successfully!' : 'Failed to save configuration');
    } catch {
      setMessage('Error saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-accent)' }} />
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'basic', label: 'Agent Config', icon: <Bot className="w-4 h-4" /> },
    { id: 'workspace', label: 'Workspace Files', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Configuration</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your agent settings and workspace files</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-accent-dark)' : 'var(--text-muted)',
              marginBottom: '-1px',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Agent Config ── */}
      {activeTab === 'basic' && (
        <div className="space-y-5">
          {message && (
            <div
              className="p-4 rounded-xl flex items-center gap-2 text-sm"
              style={{
                backgroundColor: message.includes('success') ? 'rgba(94,158,110,0.1)' : 'rgba(192,97,74,0.1)',
                color: message.includes('success') ? 'var(--color-success)' : 'var(--color-error)',
                border: `1px solid ${message.includes('success') ? 'rgba(94,158,110,0.3)' : 'rgba(192,97,74,0.3)'}`,
              }}
            >
              {message.includes('success') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message}
            </div>
          )}

          {/* Basic Info */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-3 mb-5">
              <User className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Basic Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Agent ID</label>
                <input
                  type="text"
                  value={config?.id || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Agent Type</label>
                <input
                  type="text"
                  value={config?.type || ''}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl text-sm capitalize"
                  style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-main)', color: 'var(--text-primary)' }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-main)')}
                  placeholder="Enter agent name"
                />
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-3 mb-5">
              <Bot className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Model Settings</h2>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-main)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select model</option>
                  <option value="anthropic/claude-opus-4">Claude Opus 4</option>
                  <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                  <option value="openrouter/auto">OpenRouter Auto</option>
                  <option value="minimax/abab6.5-chat">MiniMax ABAB 6.5</option>
                  <option value="qwen/qwen-max">Qwen Max</option>
                  <option value="zhipuai/glm-4">Zhipu GLM-4</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Provider</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1.5px solid var(--border-main)', color: 'var(--text-primary)' }}
                >
                  <option value="">Auto-detect</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="minimax">MiniMax</option>
                  <option value="qwen">Qwen</option>
                  <option value="zhipuai">Zhipu AI</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* MCP & Skills */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-soft)' }}>
            <div className="flex items-center gap-3 mb-5">
              <Wrench className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>MCP &amp; Skills</h2>
            </div>
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-base)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>MCP Servers</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage Model Context Protocol servers</p>
                </div>
                <button
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}
                >Configure</button>
              </div>
              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{ backgroundColor: 'var(--bg-base)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Skills</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage agent skills and capabilities</p>
                </div>
                <button
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}
                >Manage</button>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-all text-sm"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--text-inverse)',
                opacity: isSaving ? 0.6 : 1,
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Workspace Files ── */}
      {activeTab === 'workspace' && (
        <div style={{ height: '600px' }}>
          <WorkspaceEditor token={token} />
        </div>
      )}
    </div>
  );
}
