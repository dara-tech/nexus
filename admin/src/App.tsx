import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Sliders, 
  Send,
  Lock,
  LogOut,
  Clock,
  Zap,
  Mail
} from 'lucide-react';
import { 
  TelegramBrandIcon, 
  RssBrandIcon, 
  MongoDbBrandIcon, 
  AuditLogBrandIcon 
} from './components/RealIcons';

interface SourceConfig {
  id: string;
  name: string;
  url?: string;
  rssUrl?: string;
  category: string;
  active?: boolean;
}

interface BroadcastLog {
  _id: string;
  articleId?: string;
  title: string;
  channelId: string;
  status: 'success' | 'failed';
  messageId?: number;
  telegramMessageId?: number;
  createdAt?: string;
  timestamp?: string;
  error?: string;
}

interface DbHealth {
  status: string;
  uriMasked: string;
  database: string;
  collections: {
    sourcesCount: number;
    broadcastsCount: number;
    settingsFound: boolean;
  };
}

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('nexus_admin_token'));
  });
  const [loginEmail, setLoginEmail] = useState('admin@nexusnews.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Dashboard Navigation
  const [activeTab, setActiveTab] = useState<'telegram' | 'sources' | 'logs' | 'database'>('telegram');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telegram Configuration State
  const [botToken, setBotToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [autoBroadcast, setAutoBroadcast] = useState(true);
  const [showToken, setShowToken] = useState(false);
  const [botMeta, setBotMeta] = useState<{ id: number; username: string; first_name: string } | null>(null);
  const [verifyingBot, setVerifyingBot] = useState(false);

  // 1-Minute Auto-Push State
  const [autoPushCountdown, setAutoPushCountdown] = useState<number>(60);
  const [autoPushRunning, setAutoPushRunning] = useState<boolean>(true);
  const [autoPushingNow, setAutoPushingNow] = useState<boolean>(false);
  const [lastAutoPushResult, setLastAutoPushResult] = useState<string | null>(null);

  // Test Message State
  const [testPayload, setTestPayload] = useState('🚨 Test notification from Nexus News Admin Control Center');
  const [sendingTest, setSendingTest] = useState(false);
  const [lastDispatchResult, setLastDispatchResult] = useState<string | null>(null);

  // RSS Sources State
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNode, setNewNode] = useState({
    id: '',
    name: '',
    url: '',
    category: 'Technology',
    active: true
  });

  // Broadcast Logs State
  const [auditLogs, setAuditLogs] = useState<BroadcastLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Database State
  const [clusterInfo, setClusterInfo] = useState<DbHealth | null>(null);
  const [rawConfig, setRawConfig] = useState<any>(null);

  // Initialize data on login
  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemTelemetry();
      fetchIngestionNodes();
      fetchAuditLogs();
    }
  }, [isAuthenticated]);

  // 1-Minute Auto-Push Countdown & Interval Loop
  useEffect(() => {
    if (!isAuthenticated || !autoPushRunning) return;

    const timer = setInterval(() => {
      setAutoPushCountdown((prev) => {
        if (prev <= 1) {
          triggerAutoPushJob();
          return 60; // reset to 1 minute (60 seconds)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, autoPushRunning]);

  // Authentication Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      setLoggingIn(true);
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword.trim()
        }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('nexus_admin_token', data.token);
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Connection error authenticating administrator');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_admin_token');
    setIsAuthenticated(false);
    setLoginPassword('');
  };

  // Trigger 1-Minute Auto-Push Job
  const triggerAutoPushJob = async () => {
    try {
      setAutoPushingNow(true);
      const res = await fetch('/api/admin/telegram/autopush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.pushed && data.article) {
        setLastAutoPushResult(`Pushed "${data.article.title}" to ${channelId || '@nexussnew'}`);
        fetchAuditLogs();
      } else if (data.message) {
        setLastAutoPushResult(data.message);
      }
    } catch (err: any) {
      console.warn('Auto-push check error:', err.message);
    } finally {
      setAutoPushingNow(false);
    }
  };

  const fetchSystemTelemetry = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      if (data.success && data.telegram) {
        setBotToken(data.telegram.botToken || '');
        setChannelId(data.telegram.channelId || '');
        setAutoBroadcast(Boolean(data.telegram.autoPush ?? data.telegram.autoBroadcast));
        setRawConfig(data.telegram);
        if (data.telegram.botUsername) {
          const derivedId = (data.telegram.botToken && data.telegram.botToken.includes(':'))
            ? parseInt(data.telegram.botToken.split(':')[0], 10)
            : 0;
          setBotMeta({ id: derivedId, username: data.telegram.botUsername, first_name: 'Nexus News Bot' });
        }
      }
      if (data.stats) {
        setClusterInfo({
          status: data.stats.connected ? 'Connected' : 'Disconnected',
          uriMasked: 'cluster0.nujcngn.mongodb.net/nexus_news',
          database: data.stats.databaseName || 'nexus_news',
          collections: {
            sourcesCount: data.stats.sourcesCount ?? 0,
            broadcastsCount: data.stats.broadcastsCount ?? 0,
            settingsFound: Boolean(data.stats.telegramConfigured)
          }
        });
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIngestionNodes = async () => {
    try {
      setSourcesLoading(true);
      const res = await fetch('/api/admin/sources');
      const data = await res.json();
      if (data.success && Array.isArray(data.sources)) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await fetch('/api/admin/broadcasts');
      const data = await res.json();
      const logsArray = data.broadcasts || data.logs;
      if (data.success && Array.isArray(logsArray)) {
        setAuditLogs(logsArray);
      }
    } catch (err) {
      console.error('Failed to load broadcast logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCommitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      setLoading(true);
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: botToken.trim(),
          channelId: channelId.trim(),
          autoPush: autoBroadcast,
          autoBroadcast
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Configuration saved successfully to MongoDB Atlas.' });
        setTimeout(() => setStatusMessage(null), 3500);
        fetchSystemTelemetry();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to save configuration.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error saving settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBotToken = async () => {
    setStatusMessage(null);
    if (!botToken.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Bot API Token first.' });
      return;
    }
    try {
      setVerifyingBot(true);
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_bot',
          botToken: botToken.trim()
        })
      });
      const data = await res.json();
      if (data.success && data.bot) {
        setBotMeta(data.bot);
        setStatusMessage({ type: 'success', text: `Verified successfully! Connected as @${data.bot.username} (${data.bot.first_name})` });
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Bot token verification failed with Telegram.' });
        setBotMeta(null);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error connecting to Telegram API.' });
    } finally {
      setVerifyingBot(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!channelId.trim()) {
      setStatusMessage({ type: 'error', text: 'Please specify a target channel username or ID.' });
      return;
    }
    try {
      setSendingTest(true);
      setLastDispatchResult(null);
      setStatusMessage(null);
      const res = await fetch('/api/admin/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          botToken: botToken.trim(),
          channelId: channelId.trim(),
          message: testPayload
        })
      });
      const data = await res.json();
      if (data.success) {
        setLastDispatchResult(`Delivered successfully! Telegram Message ID: #${data.result?.message_id || data.messageId}`);
        fetchAuditLogs();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to deliver message to Telegram channel.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error sending test message.' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleToggleNode = async (node: SourceConfig) => {
    try {
      const activeState = node.active !== false;
      const updated = { ...node, active: !activeState };
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data.success) {
        setSources(prev => prev.map(s => s.id === node.id ? { ...s, active: !activeState } : s));
      }
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm(`Are you sure you want to remove the source "${id}" from MongoDB?`)) return;
    try {
      const res = await fetch(`/api/admin/sources?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSources(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNode.name || !newNode.url) return;
    const generatedId = newNode.id.trim() || newNode.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    try {
      const payload = { ...newNode, id: generatedId, rssUrl: newNode.url };
      const res = await fetch('/api/admin/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        fetchIngestionNodes();
        setShowAddModal(false);
        setNewNode({ id: '', name: '', url: '', category: 'Technology', active: true });
        setStatusMessage({ type: 'success', text: `Source "${newNode.name}" added successfully.` });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to add source:', err);
    }
  };

  // -------------------------------------------------------------
  // RENDER: ADMIN LOGIN SCREEN (When Not Authenticated)
  // -------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--sys-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div className="ctrl-panel" style={{ width: '400px', maxWidth: '100%', padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#0f172a',
              border: '1px solid #1e293b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <Lock size={20} color="#38bdf8" />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
              Admin Login
            </h1>
          </div>

          {loginError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              padding: '9px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertTriangle size={14} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  className="sys-input"
                  style={{ paddingLeft: '36px', height: '38px' }}
                  placeholder="admin@nexusnews.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="password"
                  className="sys-input"
                  style={{ paddingLeft: '36px', height: '38px' }}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="sys-btn sys-btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 16px', height: '38px', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
            >
              {loggingIn ? <RefreshCw size={14} className="animate-spin" /> : null}
              <span>{loggingIn ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--sys-border)', textAlign: 'center' }}>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: '12px',
                color: 'var(--sys-text-muted)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>← Return to Public Site</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED ADMIN CONTROL CENTER
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--sys-bg)' }}>
      {/* Top Header Bar */}
      <header style={{
        background: '#0a0f1d',
        borderBottom: '1px solid var(--sys-border)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand & System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#131e33',
            border: '1px solid var(--sys-border-bright)',
            padding: '5px 10px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Terminal size={15} color="#38bdf8" />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              Nexus News Control Center
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--sys-text-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-led led-green led-pulse"></span>
              <strong style={{ color: '#34d399' }}>Operational</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <MongoDbBrandIcon size={14} />
              Cluster: <strong style={{ color: '#f1f5f9' }} className="font-mono">cluster0.nujcngn.mongodb.net</strong>
            </span>
            <span>Database: <strong style={{ color: '#f1f5f9' }} className="font-mono">nexus_news</strong></span>
          </div>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => {
              fetchSystemTelemetry();
              fetchIngestionNodes();
              fetchAuditLogs();
            }}
            disabled={loading}
            className="sys-btn"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>

          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="sys-btn"
            style={{ textDecoration: 'none' }}
          >
            <span>Public Portal :3000</span>
            <ExternalLink size={13} />
          </a>

          <button
            onClick={handleLogout}
            className="sys-btn sys-btn-danger"
            title="Log out of admin console"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 51px)' }}>
        {/* Left Sidebar Navigation */}
        <aside style={{
          width: '260px',
          background: '#0b101c',
          borderRight: '1px solid var(--sys-border)',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 0'
        }}>
          <div style={{
            padding: '0 16px 12px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: 'var(--sys-text-dim)',
            textTransform: 'uppercase'
          }}>
            System Modules
          </div>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`sys-nav-item ${activeTab === 'telegram' ? 'active' : ''}`}
          >
            <TelegramBrandIcon size={18} />
            <span>Telegram Dispatch</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`sys-nav-item ${activeTab === 'sources' ? 'active' : ''}`}
          >
            <RssBrandIcon size={18} />
            <span>RSS Sources ({sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`sys-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
          >
            <AuditLogBrandIcon size={18} />
            <span>Broadcast Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`sys-nav-item ${activeTab === 'database' ? 'active' : ''}`}
          >
            <MongoDbBrandIcon size={18} />
            <span>MongoDB Atlas</span>
          </button>

          {/* Auto-Push Status Widget in Sidebar */}
          <div style={{
            margin: '16px 12px 0',
            padding: '12px',
            background: '#070b13',
            border: '1px solid var(--sys-border)',
            borderRadius: '5px',
            fontSize: '11px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} color="#38bdf8" />
                1-Min Auto-Push
              </span>
              <span className={`sys-badge ${autoPushRunning ? 'sys-badge-green' : 'sys-badge-amber'}`}>
                {autoPushRunning ? `${autoPushCountdown}s` : 'Paused'}
              </span>
            </div>
            <div style={{ color: 'var(--sys-text-dim)', fontSize: '10px' }}>
              {autoPushRunning ? `Next push in ${autoPushCountdown} seconds` : 'Auto-dispatch paused'}
            </div>
          </div>

          {/* Sidebar Footer Diagnostics */}
          <div style={{
            marginTop: 'auto',
            padding: '14px 16px',
            borderTop: '1px solid var(--sys-border)',
            fontSize: '11px',
            color: 'var(--sys-text-dim)'
          }}>
            <div>Storage: WiredTiger / v7.0</div>
            <div style={{ marginTop: '5px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MongoDbBrandIcon size={14} />
              <span>Connected to Atlas</span>
            </div>
          </div>
        </aside>

        {/* Content Panel Area */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* Notification Banner */}
          {statusMessage && (
            <div style={{
              background: statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${statusMessage.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: statusMessage.type === 'success' ? '#34d399' : '#f87171',
              padding: '10px 14px',
              borderRadius: '5px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: TELEGRAM BOT DISPATCH */}
          {activeTab === 'telegram' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '960px' }}>
              {/* 1-Minute Automated Dispatch Controller */}
              <div className="ctrl-panel" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="ctrl-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={16} color="#10b981" />
                    <span>Automated 1-Minute Telegram Dispatcher</span>
                  </div>
                  <span className="sys-badge sys-badge-green">Interval: 60 Seconds</span>
                </div>
                <div className="ctrl-panel-body">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="status-led led-green led-pulse"></span>
                        <strong style={{ fontSize: '13px', color: '#f1f5f9' }}>
                          Auto-Pushing Top Stories to {channelId || '@nexussnew'}
                        </strong>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--sys-text-muted)', marginTop: '4px' }}>
                        Next automated headline check in: <strong style={{ color: '#38bdf8' }} className="font-mono">{autoPushCountdown}s</strong>
                        {lastAutoPushResult && (
                          <span style={{ marginLeft: '12px', color: '#34d399' }}>• {lastAutoPushResult}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={triggerAutoPushJob}
                        disabled={autoPushingNow}
                        className="sys-btn sys-btn-primary"
                      >
                        <RefreshCw size={13} className={autoPushingNow ? 'animate-spin' : ''} />
                        Trigger Auto-Push Now
                      </button>

                      <button
                        type="button"
                        onClick={() => setAutoPushRunning(!autoPushRunning)}
                        className="sys-btn"
                      >
                        {autoPushRunning ? 'Pause Loop' : 'Resume Loop'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="ctrl-panel">
                <div className="ctrl-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TelegramBrandIcon size={18} />
                    <span>Telegram Bot & Channel Settings</span>
                  </div>
                  <span className="sys-badge sys-badge-cyan">MongoDB Atlas Synced</span>
                </div>

                <div className="ctrl-panel-body">
                  <form onSubmit={handleCommitConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Bot Token Input */}
                    <div>
                      <div className="sys-label">
                        <span>Telegram Bot API Token</span>
                        {botToken && botToken.includes(':') && (
                          <span style={{ fontSize: '11px', color: 'var(--sys-text-dim)' }} className="font-mono">
                            Bot ID: {botToken.split(':')[0]}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type={showToken ? 'text' : 'password'}
                            className="sys-input font-mono"
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                          />
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--sys-text-muted)',
                              cursor: 'pointer'
                            }}
                          >
                            {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyBotToken}
                          disabled={verifyingBot}
                          className="sys-btn"
                        >
                          {verifyingBot ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                          Verify Token
                        </button>
                      </div>
                    </div>

                    {/* Target Channel */}
                    <div>
                      <div className="sys-label">
                        <span>Target Channel Username or ID</span>
                        <span style={{ fontSize: '11px', color: 'var(--sys-text-dim)' }} className="font-mono">e.g. @nexussnew</span>
                      </div>
                      <input
                        type="text"
                        className="sys-input font-mono"
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        placeholder="@nexussnew or -1001234567890"
                      />
                    </div>

                    {/* Auto-Broadcast Toggle */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: '#090d16',
                      border: '1px solid var(--sys-border)',
                      borderRadius: '5px'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#f1f5f9' }}>Auto-Broadcast New Headlines</div>
                        <div style={{ fontSize: '11px', color: 'var(--sys-text-muted)' }}>Automatically publish breaking news to your channel every 1 minute</div>
                      </div>
                      <label className="sys-switch">
                        <input
                          type="checkbox"
                          checked={autoBroadcast}
                          onChange={(e) => setAutoBroadcast(e.target.checked)}
                        />
                        <span className="sys-slider"></span>
                      </label>
                    </div>

                    {/* Save Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '10px', marginTop: '4px' }}>
                      <button
                        type="submit"
                        disabled={loading}
                        className="sys-btn sys-btn-primary"
                      >
                        {loading ? <RefreshCw size={13} className="animate-spin" /> : <Sliders size={14} />}
                        Save Configuration
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Bot Identity & Permissions */}
              <div className="ctrl-panel">
                <div className="ctrl-panel-header">
                  <span>Bot Identity & Permissions</span>
                  <span className={`sys-badge ${botMeta ? 'sys-badge-green' : 'sys-badge-amber'}`}>
                    {botMeta ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <div className="ctrl-panel-body" style={{ padding: 0 }}>
                  <table className="sys-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '220px', color: 'var(--sys-text-muted)' }}>Bot Username</td>
                        <td className="font-mono" style={{ color: '#38bdf8' }}>{botMeta?.username ? `@${botMeta.username}` : (botToken ? 'Configured' : '—')}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Bot ID</td>
                        <td className="font-mono">{botToken && botToken.includes(':') ? botToken.split(':')[0] : '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Assigned Target Channel</td>
                        <td className="font-mono" style={{ color: '#34d399' }}>{channelId || '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Administrator Privileges</td>
                        <td>Channel Administrator (Post Messages with HTML formatting)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Send Test Broadcast Message */}
              <div className="ctrl-panel">
                <div className="ctrl-panel-header">
                  <span>Send Test Channel Message</span>
                  <span className="sys-badge sys-badge-cyan">Live Broadcast Test</span>
                </div>
                <div className="ctrl-panel-body">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea
                      className="sys-input"
                      rows={2}
                      value={testPayload}
                      onChange={(e) => setTestPayload(e.target.value)}
                      placeholder="Enter test message content..."
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={sendingTest}
                        className="sys-btn"
                      >
                        {sendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                        Send Test Message
                      </button>

                      {lastDispatchResult && (
                        <span style={{ fontSize: '12px', color: '#34d399', fontWeight: 600 }}>
                          {lastDispatchResult}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RSS SOURCES */}
          {activeTab === 'sources' && (
            <div className="ctrl-panel">
              <div className="ctrl-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RssBrandIcon size={18} />
                  <span>RSS News Sources ({sources.length} Feeds)</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={fetchIngestionNodes}
                    disabled={sourcesLoading}
                    className="sys-btn"
                  >
                    <RefreshCw size={12} className={sourcesLoading ? 'animate-spin' : ''} />
                    Refresh Feeds
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="sys-btn sys-btn-primary"
                  >
                    <Plus size={13} />
                    Add Source
                  </button>
                </div>
              </div>

              <div className="ctrl-panel-body" style={{ padding: 0 }}>
                <table className="sys-table">
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>Source ID</th>
                      <th style={{ width: '160px' }}>Publication Name</th>
                      <th style={{ width: '130px' }}>Category</th>
                      <th>RSS Feed URL</th>
                      <th style={{ width: '90px' }}>Active</th>
                      <th style={{ width: '80px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sources.map((node) => {
                      const isActive = node.active !== false;
                      return (
                        <tr key={node.id}>
                          <td style={{ fontWeight: 600, color: '#38bdf8' }} className="font-mono">
                            {node.id}
                          </td>
                          <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                            {node.name}
                          </td>
                          <td>
                            <span className="sys-badge sys-badge-cyan">
                              {node.category}
                            </span>
                          </td>
                          <td style={{ color: 'var(--sys-text-muted)', wordBreak: 'break-all' }} className="font-mono">
                            {node.rssUrl || node.url}
                          </td>
                          <td>
                            <label className="sys-switch">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleToggleNode(node)}
                              />
                              <span className="sys-slider"></span>
                            </label>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleDeleteNode(node.id)}
                              className="sys-btn sys-btn-danger"
                              style={{ padding: '4px 8px' }}
                              title="Remove source"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Source Modal */}
              {showAddModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.75)',
                  backdropFilter: 'blur(4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100
                }}>
                  <div className="ctrl-panel" style={{ width: '480px' }}>
                    <div className="ctrl-panel-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RssBrandIcon size={16} />
                        <span>Add New RSS Feed Publication</span>
                      </div>
                      <span className="sys-badge sys-badge-cyan">MongoDB Atlas</span>
                    </div>
                    <div className="ctrl-panel-body">
                      <form onSubmit={handleAddSource} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <div className="sys-label">Publication Name</div>
                          <input
                            type="text"
                            className="sys-input"
                            placeholder="e.g. Ars Technica"
                            value={newNode.name}
                            onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <div className="sys-label">RSS Feed URL</div>
                          <input
                            type="url"
                            className="sys-input font-mono"
                            placeholder="https://example.com/feed.xml"
                            value={newNode.url}
                            onChange={(e) => setNewNode({ ...newNode, url: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <div className="sys-label">Category</div>
                          <select
                            className="sys-input"
                            value={newNode.category}
                            onChange={(e) => setNewNode({ ...newNode, category: e.target.value })}
                          >
                            <option value="Technology">Technology</option>
                            <option value="Artificial Intelligence">Artificial Intelligence</option>
                            <option value="Business">Business</option>
                            <option value="Cybersecurity">Cybersecurity</option>
                            <option value="World">World</option>
                            <option value="General">General</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                          <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
                            className="sys-btn"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="sys-btn sys-btn-primary"
                          >
                            Save Source to Atlas
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BROADCAST LOGS */}
          {activeTab === 'logs' && (
            <div className="ctrl-panel">
              <div className="ctrl-panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AuditLogBrandIcon size={18} />
                  <span>Telegram Broadcast History & Logs</span>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  disabled={auditLoading}
                  className="sys-btn"
                >
                  <RefreshCw size={12} className={auditLoading ? 'animate-spin' : ''} />
                  Refresh Logs
                </button>
              </div>

              <div className="ctrl-panel-body" style={{ padding: 0 }}>
                {auditLogs.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--sys-text-dim)' }}>
                    No broadcast events recorded yet in MongoDB Atlas. Test a broadcast from the Telegram tab!
                  </div>
                ) : (
                  <table className="sys-table">
                    <thead>
                      <tr>
                        <th style={{ width: '160px' }}>Timestamp (UTC)</th>
                        <th style={{ width: '140px' }}>Target Channel</th>
                        <th>Article Headline</th>
                        <th style={{ width: '100px' }}>Status</th>
                        <th style={{ width: '120px' }}>Message ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => {
                        const dateStr = log.createdAt || log.timestamp || new Date().toISOString();
                        const msgId = log.messageId || log.telegramMessageId;
                        return (
                          <tr key={log._id}>
                            <td style={{ color: 'var(--sys-text-muted)' }} className="font-mono">
                              {new Date(dateStr).toISOString().replace('T', ' ').substring(0, 19)}
                            </td>
                            <td style={{ color: '#38bdf8', fontWeight: 600 }} className="font-mono">
                              {log.channelId}
                            </td>
                            <td style={{ fontWeight: 600, color: '#f1f5f9' }}>
                              {log.title}
                            </td>
                            <td>
                              <span className={log.status === 'success' ? 'sys-badge sys-badge-green' : 'sys-badge sys-badge-red'}>
                                {log.status === 'success' ? 'Delivered' : 'Failed'}
                              </span>
                            </td>
                            <td style={{ color: 'var(--sys-text-dim)' }} className="font-mono">
                              {msgId ? `#${msgId}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: MONGODB ATLAS */}
          {activeTab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '960px' }}>
              <div className="ctrl-panel">
                <div className="ctrl-panel-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MongoDbBrandIcon size={18} />
                    <span>MongoDB Atlas Cluster Information</span>
                  </div>
                  <span className="sys-badge sys-badge-green">Connected</span>
                </div>
                <div className="ctrl-panel-body" style={{ padding: 0 }}>
                  <table className="sys-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '220px', color: 'var(--sys-text-muted)' }}>Cluster Endpoint</td>
                        <td style={{ color: '#38bdf8', fontWeight: 600 }} className="font-mono">cluster0.nujcngn.mongodb.net</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Database Name</td>
                        <td className="font-mono">{clusterInfo?.database || 'nexus_news'}</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Storage Engine</td>
                        <td>WiredTiger (Primary Replica Set)</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Sources Collection</td>
                        <td><strong style={{ color: '#38bdf8' }}>{clusterInfo?.collections.sourcesCount ?? sources.length}</strong> feeds registered</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Broadcast History Collection</td>
                        <td><strong style={{ color: '#34d399' }}>{clusterInfo?.collections.broadcastsCount ?? auditLogs.length}</strong> events logged</td>
                      </tr>
                      <tr>
                        <td style={{ color: 'var(--sys-text-muted)' }}>Settings Registry</td>
                        <td><span className="sys-badge sys-badge-green">Active</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw Parameter Inspection */}
              <div className="ctrl-panel">
                <div className="ctrl-panel-header">
                  <span>Active Configuration Snapshot</span>
                  <span className="sys-badge sys-badge-cyan">JSON Preview</span>
                </div>
                <div className="ctrl-panel-body">
                  <pre style={{
                    background: '#070a10',
                    border: '1px solid var(--sys-border)',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#94a3b8',
                    overflowX: 'auto'
                  }} className="font-mono">
                    {JSON.stringify(rawConfig || { status: 'Awaiting configuration' }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
