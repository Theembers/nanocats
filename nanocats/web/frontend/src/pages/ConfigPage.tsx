import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Save, User, Bot, Wrench, FileText, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { AgentConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:15751';

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
    <div className="flex gap-6 h-full">
      {/* Sidebar file list */}
      <div className="w-52 shrink-0 space-y-1">
        {WORKSPACE_FILES.map(file => (
          <button
            key={file.filename}
            onClick={() => handleTabChange(file.filename)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors group ${
              activeFile === file.filename
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'hover:bg-gray-50 text-gray-700 border border-transparent'
            }`}
          >
            <span className="text-lg">{file.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.label}</p>
            </div>
            {dirty[file.filename] && (
              <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
            )}
            {activeFile === file.filename && (
              <ChevronRight className="w-4 h-4 shrink-0 text-blue-500" />
            )}
          </button>
        ))}
      </div>

      {/* Editor panel */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <h3 className="font-semibold text-gray-900">
              {currentFile.icon} {currentFile.label}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{currentFile.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {status === 'saved' && (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" /> Failed to save
              </span>
            )}
            <button
              onClick={() => handleSave(activeFile)}
              disabled={isSaving || !isDirty}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-4 h-4" /> Save</>
              )}
            </button>
          </div>
        </div>

        {/* Textarea */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <textarea
            value={contents[activeFile] ?? ''}
            onChange={e => handleChange(activeFile, e.target.value)}
            className="flex-1 resize-none p-6 font-mono text-sm text-gray-800 leading-relaxed outline-none focus:ring-0 border-none"
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
        <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
        <p className="text-gray-600 mt-1">Manage your agent settings and workspace files</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Agent Config ── */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.includes('success') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {message}
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent ID</label>
                <input
                  type="text"
                  value={config?.id || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Type</label>
                <input
                  type="text"
                  value={config?.type || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500 capitalize"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter agent name"
                />
              </div>
            </div>
          </div>

          {/* Model Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Model Settings</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Wrench className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">MCP & Skills</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">MCP Servers</p>
                  <p className="text-sm text-gray-500">Manage Model Context Protocol servers</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">Configure</button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Skills</p>
                  <p className="text-sm text-gray-500">Manage agent skills and capabilities</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">Manage</button>
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              {isSaving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <><Save className="w-5 h-5" /> Save Changes</>
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
