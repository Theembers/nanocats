import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgent, listAgents } from '../api/agents';
import apiClient from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import { Bot, Settings, FileText, Save, Loader2, CheckCircle2, AlertCircle, ChevronRight, Wrench, BookOpen } from 'lucide-react';
import './Config.css';

const WORKSPACE_FILES = [
  { filename: 'AGENTS.md', label: 'AGENTS.md', icon: '🤖', description: 'Agent instructions and behavior guidelines' },
  { filename: 'SOUL.md', label: 'SOUL.md', icon: '✨', description: 'Agent personality and core values' },
  { filename: 'USER.md', label: 'USER.md', icon: '👤', description: 'User profile and preferences' },
  { filename: 'TOOLS.md', label: 'TOOLS.md', icon: '🔧', description: 'Tool usage rules and restrictions' },
  { filename: 'HEARTBEAT.md', label: 'HEARTBEAT.md', icon: '💓', description: 'Periodic heartbeat tasks' },
];

function Config() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('basic');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [provider, setProvider] = useState('');

  const [activeFile, setActiveFile] = useState(WORKSPACE_FILES[0].filename);
  const [contents, setContents] = useState({});
  const [loadingFile, setLoadingFile] = useState(null);
  const [savingFile, setSavingFile] = useState(null);
  const [fileStatus, setFileStatus] = useState({});
  const [dirty, setDirty] = useState({});

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: listAgents,
  });

  const currentAgentId = agentId || (agents && agents.length > 0 ? agents[0].id : null);

  useEffect(() => {
    if (!agentId && currentAgentId) {
      navigate(`/config/${currentAgentId}`, { replace: true });
    }
  }, [agentId, currentAgentId, navigate]);

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', currentAgentId],
    queryFn: () => getAgent(currentAgentId),
    enabled: !!currentAgentId,
  });

  useEffect(() => {
    if (agent) {
      setName(agent.name || '');
      setModel(agent.model || '');
      setProvider(agent.provider || '');
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: (updates) => apiClient.patch(`/agents/${currentAgentId}`, updates),
    onSuccess: () => {
      setMessage('success:Configuration saved successfully');
      queryClient.invalidateQueries(['agent', currentAgentId]);
      setTimeout(() => setMessage(''), 3000);
    },
    onError: () => {
      setMessage('error:Failed to save configuration');
      setTimeout(() => setMessage(''), 3000);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ name, model, provider });
  };

  const loadFile = async (filename) => {
    if (contents[filename] !== undefined) return;
    setLoadingFile(filename);
    try {
      const response = await apiClient.get(`/agents/${currentAgentId}/workspace/${filename}`);
      setContents(prev => ({ ...prev, [filename]: response.data.content || '' }));
    } catch (err) {
      setContents(prev => ({ ...prev, [filename]: '' }));
    }
    setLoadingFile(null);
  };

  useEffect(() => {
    loadFile(activeFile);
  }, [activeFile, currentAgentId]);

  const handleFileChange = (filename, value) => {
    setDirty(prev => ({ ...prev, [filename]: true }));
    setContents(prev => ({ ...prev, [filename]: value }));
  };

  const handleSaveFile = async (filename) => {
    setSavingFile(filename);
    try {
      await apiClient.put(`/agents/${currentAgentId}/workspace/${filename}`, {
        content: contents[filename],
      });
      setFileStatus(prev => ({ ...prev, [filename]: 'saved' }));
      setDirty(prev => ({ ...prev, [filename]: false }));
      setTimeout(() => setFileStatus(prev => ({ ...prev, [filename]: null })), 3000);
    } catch (err) {
      setFileStatus(prev => ({ ...prev, [filename]: 'error' }));
    }
    setSavingFile(null);
  };

  if (!currentAgentId) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="config-page">
      <div className="config-header">
        <h1>Configuration</h1>
        <p>Manage your agent settings and workspace files</p>
      </div>

      <div className="config-tabs">
        <button
          className={`config-tab ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          <Bot size={16} />
          Agent Config
        </button>
        <button
          className={`config-tab ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <FileText size={16} />
          Workspace Files
        </button>
      </div>

      {message && (
        <div className={`config-message ${message.startsWith('success') ? 'success' : 'error'}`}>
          {message.startsWith('success') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.split(':')[1]}
        </div>
      )}

      {activeTab === 'basic' && (
        <div className="config-content">
          <div className="config-card">
            <div className="config-card-header">
              <Settings size={18} />
              <h3>Basic Information</h3>
            </div>
            <div className="config-form-grid">
              <div className="config-form-group">
                <label>Agent ID</label>
                <input type="text" value={agent?.id || ''} disabled />
              </div>
              <div className="config-form-group">
                <label>Agent Type</label>
                <input type="text" value={agent?.type || ''} disabled />
              </div>
              <div className="config-form-group full-width">
                <label>Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter agent name"
                />
              </div>
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-header">
              <Bot size={18} />
              <h3>Model Settings</h3>
            </div>
            <div className="config-form-grid">
              <div className="config-form-group">
                <label>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. anthropic/claude-sonnet-4"
                />
              </div>
              <div className="config-form-group">
                <label>Provider</label>
                <input
                  type="text"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g. anthropic"
                />
              </div>
            </div>
          </div>

          <div className="config-card">
            <div className="config-card-header">
              <Wrench size={18} />
              <h3>MCP & Skills</h3>
            </div>
            <div className="config-mcp-skills">
              <div className="config-mcp-skills-item">
                <div>
                  <h4>MCP Servers</h4>
                  <p>Manage Model Context Protocol servers</p>
                </div>
                <button className="config-btn-secondary">Configure</button>
              </div>
              <div className="config-mcp-skills-item">
                <div>
                  <h4>Skills</h4>
                  <p>Manage agent skills and capabilities</p>
                </div>
                <button className="config-btn-secondary">Manage</button>
              </div>
            </div>
          </div>

          <button
            className="config-save-btn"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === 'workspace' && (
        <div className="config-workspace">
          <div className="workspace-file-list">
            {WORKSPACE_FILES.map((file) => (
              <button
                key={file.filename}
                className={`workspace-file-item ${activeFile === file.filename ? 'active' : ''}`}
                onClick={() => setActiveFile(file.filename)}
              >
                <span className="workspace-file-icon">{file.icon}</span>
                <span className="workspace-file-name">{file.label}</span>
                {dirty[file.filename] && (
                  <span className="workspace-file-dirty" />
                )}
                {activeFile === file.filename && (
                  <ChevronRight size={16} className="workspace-file-arrow" />
                )}
              </button>
            ))}
          </div>

          <div className="workspace-editor">
            <div className="workspace-editor-header">
              <div>
                <h3>
                  {WORKSPACE_FILES.find(f => f.filename === activeFile)?.icon}{' '}
                  {activeFile}
                </h3>
                <p>{WORKSPACE_FILES.find(f => f.filename === activeFile)?.description}</p>
              </div>
              <div className="workspace-editor-actions">
                {fileStatus[activeFile] === 'saved' && (
                  <span className="workspace-status saved">
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
                {fileStatus[activeFile] === 'error' && (
                  <span className="workspace-status error">
                    <AlertCircle size={14} /> Failed to save
                  </span>
                )}
                <button
                  className="config-btn-primary"
                  onClick={() => handleSaveFile(activeFile)}
                  disabled={savingFile || !dirty[activeFile]}
                >
                  {savingFile ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {savingFile ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <textarea
              className="workspace-editor-textarea"
              value={contents[activeFile] || ''}
              onChange={(e) => handleFileChange(activeFile, e.target.value)}
              placeholder={`# ${activeFile}\n\nAdd your content here...`}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Config;
