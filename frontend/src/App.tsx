import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BatteryMedium,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Download,
  Gauge,
  Layers3,
  LocateFixed,
  LockKeyhole,
  Menu,
  Radio,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { io } from 'socket.io-client';

type Risk = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
type Reading = {
  timestamp: string;
  tilt: number;
  vibration: number;
  displacement: number;
  crackDetected: boolean;
  battery: number;
  signal: number;
  risk: Risk;
};
type SensorNode = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  panel: string;
  status: string;
  battery: number;
  signal: number;
  risk: Risk;
  lastReading?: Reading;
};
type Alert = {
  id: string;
  severity: Risk;
  nodeId: string;
  message: string;
  recommendation: string;
  timestamp: string;
  acknowledged: boolean;
};
type User = { name: string; email: string; role: string };
type AuthState = { token: string; user: User };

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const riskMeta: Record<Risk, { label: string; color: string }> = {
  NORMAL: { label: 'Normal', color: '#46c58a' },
  WATCH: { label: 'Watch', color: '#eac45b' },
  WARNING: { label: 'Warning', color: '#ef8b4e' },
  CRITICAL: { label: 'Critical', color: '#ef5c63' },
};
const DEMO_USER = {
  email: 'virtualthrone@sih.in',
  password: 'virtualthrone123',
};

function App() {
  const [auth, setAuth] = useState<AuthState | null>(() => {
    try {
      const raw = localStorage.getItem('mineguard-auth');
      return raw ? (JSON.parse(raw) as AuthState) : null;
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({
    email: DEMO_USER.email,
    password: DEMO_USER.password,
    role: 'operator',
  });
  const [loginError, setLoginError] = useState('');
  const [nodes, setNodes] = useState<SensorNode[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedId, setSelectedId] = useState('MG-08');
  const [role, setRole] = useState('Mine Operator');
  const [anomalyMode, setAnomalyMode] = useState(false);
  const [offline, setOffline] = useState(false);
  const [panel, setPanel] = useState<'overview' | 'alerts' | 'analytics'>('overview');
  const [history, setHistory] = useState<Reading[]>([]);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  useEffect(() => {
    if (!auth) return;
    const map: Record<string, string> = {
      operator: 'Mine Operator',
      planner: 'Planner',
      admin: 'Regulator / Admin',
      regulator: 'Regulator / Admin',
    };
    setRole(map[auth.user.role] ?? 'Mine Operator');
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    const load = async () => {
      const [nodeResponse, alertResponse] = await Promise.all([
        fetch(`${API}/api/nodes`),
        fetch(`${API}/api/alerts`),
      ]);
      setNodes(await nodeResponse.json());
      setAlerts(await alertResponse.json());
    };

    void load().catch(() => setOffline(true));

    const socket = io(import.meta.env.VITE_SOCKET_URL ?? API, { autoConnect: true });
    socket.on('snapshot', (data: { nodes: SensorNode[]; alerts: Alert[]; anomalyMode: boolean }) => {
      setNodes(data.nodes);
      setAlerts(data.alerts);
      setAnomalyMode(data.anomalyMode);
      setOffline(false);
    });
    socket.on('reading', (reading: Reading & { nodeId: string }) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === reading.nodeId
            ? { ...node, lastReading: reading, battery: reading.battery, signal: reading.signal, risk: reading.risk }
            : node,
        ),
      );
    });
    socket.on('system:status', (data: { anomalyMode: boolean }) => setAnomalyMode(data.anomalyMode));
    socket.on('connect_error', () => setOffline(true));

    return () => {
      socket.disconnect();
    };
  }, [auth]);

  useEffect(() => {
    if (!auth || !selected) return;
    fetch(`${API}/api/nodes/${selected.id}/readings?limit=24`)
      .then((response) => response.json())
      .then(setHistory)
      .catch(() => undefined);
  }, [auth, selected?.id]);

  const metrics = useMemo(
    () => ({
      online: nodes.filter((node) => node.status === 'online').length,
      critical: nodes.filter((node) => node.risk === 'CRITICAL').length,
      warning: nodes.filter((node) => node.risk === 'WARNING').length,
      watch: nodes.filter((node) => node.risk === 'WATCH').length,
    }),
    [nodes],
  );

  const toggleAnomaly = async () => {
    const response = await fetch(`${API}/api/simulator/anomaly`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !anomalyMode }),
    });
    const data = await response.json();
    setAnomalyMode(data.anomalyMode);
  };

  const acknowledge = async (id: string) => {
    await fetch(`${API}/api/alerts/${id}/acknowledge`, { method: 'POST' });
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert)));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
          role: loginForm.role,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        setLoginError(data.error ?? 'Unable to sign in.');
        return;
      }

      const authState = { token: data.token, user: data.user as User };
      localStorage.setItem('mineguard-auth', JSON.stringify(authState));
      setAuth(authState);
      setLoginError('');
    } catch {
      setLoginError('Authentication service unavailable.');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('mineguard-auth');
    setAuth(null);
    setLoginError('');
  };

  if (!auth) {
    return (
      <div className="landing-page">
        <header className="landing-header">
          <div className="brand">
            <div className="brand-mark">
              <Layers3 size={20} />
            </div>
            <div>
              <strong>
                MineGuard<span> AI</span>
              </strong>
              <small>SUBSIDENCE INTELLIGENCE</small>
            </div>
          </div>
          <nav className="landing-nav">
            <a href="#overview">Overview</a>
            <a href="#solution">Solution</a>
            <a href="#impact">Impact</a>
          </nav>
          <button
            className="button primary small"
            onClick={() => document.getElementById('signin')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Sign in
          </button>
        </header>

        <main className="landing-main">
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">WIRELESS SURFACE MESH FOR COAL MINE SAFETY</span>
              <h1>AI-powered mine subsidence monitoring for safer operations.</h1>
              <p>
                MineGuard AI detects deformation patterns, flags early instability, and helps mine operators protect life,
                asset integrity, and production continuity.
              </p>
              <div className="cta-row">
                <button
                  className="button primary"
                  onClick={() => document.getElementById('signin')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Launch demo
                </button>
                <button className="button ghost">View architecture</button>
              </div>
              <div className="hero-stats">
                <div>
                  <strong>24</strong>
                  <span>mesh nodes</span>
                </div>
                <div>
                  <strong>4</strong>
                  <span>risk states</span>
                </div>
                <div>
                  <strong>94%</strong>
                  <span>model confidence</span>
                </div>
              </div>
            </div>

            <div className="auth-panel" id="signin">
              <div className="auth-header">
                <div className="pill">
                  <LockKeyhole size={14} /> Secure access
                </div>
                <h2>Sign in</h2>
              </div>

              <form className="login-form" onSubmit={handleLogin}>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select
                    value={loginForm.role}
                    onChange={(event) => setLoginForm((current) => ({ ...current, role: event.target.value }))}
                  >
                    <option value="operator">Mine Operator</option>
                    <option value="planner">Planner</option>
                    <option value="admin">Regulator / Admin</option>
                  </select>
                </label>

                {loginError && <div className="login-error">{loginError}</div>}

                <button className="button primary full" type="submit">
                  Continue to dashboard
                </button>
                <div className="demo-note">
                  Demo credentials: <strong>{DEMO_USER.email}</strong> / <strong>{DEMO_USER.password}</strong>
                </div>
              </form>
            </div>
          </section>

          <section className="feature-grid" id="overview">
            <div className="feature-card">
              <span>01</span>
              <h3>Mesh intelligence</h3>
              <p>Collects tilt, displacement, crack strain, vibration, and signal quality from each sensor node in near real time.</p>
            </div>
            <div className="feature-card">
              <span>02</span>
              <h3>AI risk scoring</h3>
              <p>Applies anomaly detection to predict subsidence progression and classify risk zones from Normal to Critical.</p>
            </div>
            <div className="feature-card">
              <span>03</span>
              <h3>Actionable alerts</h3>
              <p>Flags at-risk clusters, recommends mitigation paths, and dispatches alert logs to operators and regulators.</p>
            </div>
          </section>

          <section className="impact-panel" id="solution">
            <div>
              <span className="eyebrow">WHY IT MATTERS</span>
              <h2>Built for Indian coal mines and risk-prone panels.</h2>
            </div>
            <ul>
              <li>Surface mesh monitoring above active underground panels</li>
              <li>Low-cost monitoring without heavy infrastructure</li>
              <li>Supports early warning and safe extraction planning</li>
            </ul>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Layers3 size={21} />
          </div>
          <div>
            <strong>
              MineGuard<span> AI</span>
            </strong>
            <small>SUBSIDENCE INTELLIGENCE</small>
          </div>
        </div>

        <nav>
          <button className={panel === 'overview' ? 'active' : ''} onClick={() => setPanel('overview')}>
            <Gauge size={17} /> Mission control
          </button>
          <button className={panel === 'alerts' ? 'active' : ''} onClick={() => setPanel('alerts')}>
            <ShieldAlert size={17} /> Alert center <b>{alerts.filter((alert) => !alert.acknowledged).length}</b>
          </button>
          <button className={panel === 'analytics' ? 'active' : ''} onClick={() => setPanel('analytics')}>
            <Layers3 size={17} /> Zone analytics
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="operator-card">
            <div className="avatar">AB</div>
            <div>
              <strong>{auth.user.name}</strong>
              <small>{role}</small>
            </div>
            <ChevronDown size={15} />
          </div>
          <button className="signout-button" onClick={handleSignOut}>
            Sign out
          </button>
          <div className="made-in">
            <span>●</span> Built for safer mines in India
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="mobile-title">
            <Menu size={19} />
            <strong>MINEGUARD AI</strong>
          </div>
          <div className="breadcrumb">
            <span>JHARIA FIELD</span>
            <i>/</i>
            <strong>WEST BLOCK · PANEL A/B</strong>
          </div>
          <div className="top-actions">
            <div className="live-pill">
              <span /> LIVE NETWORK
            </div>
            <button className="icon-button" title="Help">
              <CircleHelp size={18} />
            </button>
            <button className="icon-button notification" title="Notifications" onClick={() => setPanel('alerts')}>
              <Bell size={18} />
              <em>{alerts.filter((alert) => !alert.acknowledged).length}</em>
            </button>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              <option>Mine Operator</option>
              <option>Planner</option>
              <option>Regulator / Admin</option>
            </select>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">FRIDAY · 18 SEP 2026 · 09:42 IST</p>
              <h1>Good morning, {auth.user.name.split(' ')[0]}.</h1>
              <p className="subhead">
                Your network is watching over <strong>1,240 hectares</strong> of active surface.
              </p>
            </div>
            <div className="heading-actions">
              <button className="button outline" onClick={() => setOffline(!offline)}>
                {offline ? <WifiOff size={16} /> : <Wifi size={16} />}
                {offline ? 'Offline mode' : 'Cloud synced'}
              </button>
              <button className="button primary" onClick={toggleAnomaly}>
                <Radio size={16} />
                {anomalyMode ? 'Stop anomaly test' : 'Trigger anomaly test'}
              </button>
            </div>
          </div>

          <div className="stat-grid">
            <Stat
              label="Nodes online"
              value={`${metrics.online} / ${nodes.length || 24}`}
              detail="mesh connectivity"
              icon={<Wifi size={18} />}
              tone="green"
            />
            <Stat
              label="Active warnings"
              value={String(metrics.warning + metrics.critical)}
              detail={`${metrics.critical} critical · ${metrics.watch} watch`}
              icon={<ShieldAlert size={18} />}
              tone={metrics.critical ? 'red' : 'amber'}
            />
            <Stat
              label="Network health"
              value="96.4%"
              detail="signal + battery average"
              icon={<BatteryMedium size={18} />}
              tone="blue"
            />
            <Stat
              label="Subsidence index"
              value={anomalyMode ? '0.78' : '0.12'}
              detail={anomalyMode ? 'accelerating trend' : 'within baseline'}
              icon={<LocateFixed size={18} />}
              tone={anomalyMode ? 'orange' : 'green'}
            />
          </div>

          {panel === 'overview' && (
            <>
              <section className="dashboard-grid">
                <div className="map-panel panel-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">SURFACE MESH / 3.8 KM²</p>
                      <h2>Live deformation map</h2>
                    </div>
                    <div className="map-tools">
                      <button className="small-icon" title="Refresh map">
                        <RefreshCw size={15} />
                      </button>
                      <button className="small-icon" title="Download report">
                        <Download size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="map-canvas">
                    <div className="map-label north">N</div>
                    <div className="mine-boundary boundary-a">
                      <span>PANEL A</span>
                    </div>
                    <div className="mine-boundary boundary-b">
                      <span>PANEL B</span>
                    </div>
                    <div className="risk-zone zone-one" />
                    <div className="risk-zone zone-two" />
                    {nodes.map((node) => (
                      <button
                        key={node.id}
                        className={`map-node risk-${node.risk.toLowerCase()} ${selectedId === node.id ? 'selected' : ''}`}
                        style={{
                          left: `${12 + ((node.lng - 86.421) / 0.0065) * 76}%`,
                          top: `${19 + ((node.lat - 23.742) / 0.0038) * 60}%`,
                        }}
                        onClick={() => setSelectedId(node.id)}
                        title={`${node.name} · ${riskMeta[node.risk].label}`}
                      >
                        <span>{node.id.slice(-2)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="map-footer">
                    <div className="legend">
                      <span>
                        <i className="dot normal" /> Normal
                      </span>
                      <span>
                        <i className="dot watch" /> Watch
                      </span>
                      <span>
                        <i className="dot warning" /> Warning
                      </span>
                      <span>
                        <i className="dot critical" /> Critical
                      </span>
                    </div>
                    <span className="map-updated">
                      <span /> Updated 3 sec ago
                    </span>
                  </div>
                </div>

                <NodeDetail node={selected} history={history} />
              </section>

              <section className="bottom-grid">
                <div className="panel-card table-card">
                  <div className="panel-header">
                    <div>
                      <p className="eyebrow">NETWORK STATUS</p>
                      <h2>Mesh node health</h2>
                    </div>
                    <button className="text-button">
                      View all <ChevronDown size={14} />
                    </button>
                  </div>
                  <div className="node-table">
                    <div className="table-row table-head">
                      <span>NODE</span>
                      <span>ZONE</span>
                      <span>RISK</span>
                      <span>BATTERY</span>
                      <span>SIGNAL</span>
                    </div>
                    {nodes.slice(0, 6).map((node) => (
                      <button className="table-row" key={node.id} onClick={() => setSelectedId(node.id)}>
                        <span>
                          <strong>{node.id}</strong>
                          <small>{node.name}</small>
                        </span>
                        <span>{node.panel}</span>
                        <span className={`risk-text ${node.risk.toLowerCase()}`}>
                          <i /> {riskMeta[node.risk].label}
                        </span>
                        <span>{Math.round(node.battery)}%</span>
                        <span>{Math.round(node.signal)}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Alerts alerts={alerts} onAcknowledge={acknowledge} />
              </section>
            </>
          )}

          {panel === 'alerts' && (
            <section className="single-panel panel-card">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">RESPONSE QUEUE</p>
                  <h2>Alert center</h2>
                </div>
                <span className="count-label">{alerts.length} events</span>
              </div>
              <Alerts alerts={alerts} onAcknowledge={acknowledge} expanded />
            </section>
          )}

          {panel === 'analytics' && (
            <section className="single-panel panel-card analytics-view">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">PREDICTIVE INTELLIGENCE</p>
                  <h2>Zone analytics</h2>
                </div>
              </div>
              <div className="analytics-copy">
                <div>
                  <strong>{anomalyMode ? '0.78' : '0.12'}</strong>
                  <span>Current risk index</span>
                </div>
                <div>
                  <strong>{anomalyMode ? '02:16' : '18:42'}</strong>
                  <span>Time to threshold · Panel A</span>
                </div>
                <div>
                  <strong>94%</strong>
                  <span>Model confidence</span>
                </div>
              </div>
              <div className="wide-chart">
                <TrendChart history={history} />
              </div>
            </section>
          )}

          <footer>
            © Virtual Throne · AHINA ROBERT · AKSHARA · DANI JOSHUA · HARIHARAN · POORANI{' '}
            <span>SIH 2025 · Wireless Surface Mesh Network</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function NodeDetail({ node, history }: { node?: SensorNode; history: Reading[] }) {
  if (!node) {
    return (
      <div className="panel-card detail-panel">
        <p>Waiting for sensor network...</p>
      </div>
    );
  }

  const reading = node.lastReading ?? history.at(-1);

  return (
    <div className="panel-card detail-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">SELECTED NODE</p>
          <h2>
            {node.id}{' '}
            <span className={`status-badge ${node.risk.toLowerCase()}`}>{riskMeta[node.risk].label}</span>
          </h2>
          <small>
            {node.name} · {node.panel}
          </small>
        </div>
        <button className="small-icon">
          <X size={16} />
        </button>
      </div>

      <div className="reading-grid">
        <ReadingMetric label="Tilt" value={`${reading?.tilt.toFixed(2) ?? '--'}°`} />
        <ReadingMetric label="Displacement" value={`${reading?.displacement.toFixed(2) ?? '--'} mm`} />
        <ReadingMetric label="Vibration" value={`${reading?.vibration.toFixed(2) ?? '--'} g`} />
        <ReadingMetric label="Crack strain" value={reading?.crackDetected ? 'Detected' : 'Clear'} />
      </div>

      <div className="chart-title">
        <span>24-hour deformation trend</span>
        <small>LIVE</small>
      </div>
      <TrendChart history={history} />

      <div className="health-row">
        <span>
          <BatteryMedium size={15} /> {Math.round(node.battery)}% battery
        </span>
        <span>
          <Wifi size={15} /> {Math.round(node.signal)}% signal
        </span>
        <span>
          <Cloud size={15} /> synced
        </span>
      </div>
    </div>
  );
}

function ReadingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrendChart({ history }: { history: Reading[] }) {
  const values = history.length ? history.map((item) => item.displacement) : [0.8, 1, 0.9, 1.1, 1.2, 1.05, 1.3, 1.4];
  const max = Math.max(...values, 2);
  const points = values
    .map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${100 - (value / max) * 82}`)
    .join(' ');

  return (
    <div className="chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#50bca0" stopOpacity=".3" />
            <stop offset="1" stopColor="#50bca0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#area)" />
        <polyline points={points} fill="none" stroke="#56c4aa" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Alerts({
  alerts,
  onAcknowledge,
  expanded = false,
}: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  expanded?: boolean;
}) {
  const shown = expanded ? alerts : alerts.slice(0, 4);

  return (
    <div className="panel-card alerts-card">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AUTOMATED RESPONSE</p>
          <h2>Recent alerts</h2>
        </div>
        <span className="count-label">{alerts.filter((alert) => !alert.acknowledged).length} open</span>
      </div>

      <div className="alerts-list">
        {shown.length ? (
          shown.map((alert) => (
            <div className={`alert-item ${alert.severity.toLowerCase()}`} key={alert.id}>
              <div className="alert-icon">
                <ShieldAlert size={16} />
              </div>
              <div className="alert-body">
                <strong>{alert.message}</strong>
                <small>
                  {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                  {alert.recommendation}
                </small>
              </div>
              {!alert.acknowledged && (
                <button className="ack-button" title="Acknowledge alert" onClick={() => onAcknowledge(alert.id)}>
                  <Check size={15} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <Check size={20} /> All clear. No active alerts.
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
