import cors from 'cors';
import express from 'express';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { emitSimulation } from './simulator.js';
import { store } from './store.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN ?? '*' } });
const port = Number(process.env.PORT ?? 4000);
const secret = process.env.JWT_SECRET ?? 'mineguard-demo-secret';
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ service: 'mineguard-backend', status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/nodes', (_req, res) => res.json(store.nodes));
app.get('/api/nodes/:id/readings', (req, res) => res.json(store.getReadings(req.params.id, Number(req.query.limit ?? 40))));
app.get('/api/alerts', (_req, res) => res.json(store.alerts));
app.post('/api/alerts/:id/acknowledge', (req, res) => { const alert = store.acknowledge(req.params.id); return alert ? res.json(alert) : res.status(404).json({ error: 'Alert not found' }); });
app.post('/api/simulator/anomaly', (req, res) => { store.setAnomalyMode(Boolean(req.body.enabled)); io.emit('system:status', { anomalyMode: store.anomalyMode }); res.json({ anomalyMode: store.anomalyMode }); });
app.post('/api/simulator/ingest', (req, res) => { store.addReading(req.body); io.emit('reading', req.body); res.status(201).json(req.body); });
app.post('/api/auth/login', (req, res) => { const email = String(req.body.email ?? 'virtualthrone@sih.in'); const password = String(req.body.password ?? ''); if (email === 'virtualthrone@sih.in' && password && password !== 'virtualthrone123') return res.status(401).json({ error: 'Invalid demo credentials' }); const user = { name: 'AKSHARA B', email, role: req.body.role ?? 'operator' }; res.json({ token: jwt.sign(user, secret, { expiresIn: '8h' }), user }); });
app.post('/api/predict', (req, res) => { const node = store.nodes.find((item) => item.id === req.body.nodeId); const history = node ? store.getReadings(node.id, 12) : []; const latest = history.at(-1); const score = latest ? Math.min(0.99, latest.displacement / 10 + latest.tilt / 3) : 0.08; res.json({ nodeId: req.body.nodeId, risk: node?.risk ?? 'NORMAL', score: Number(score.toFixed(2)), confidence: Number((0.72 + score * 0.24).toFixed(2)), trend: latest && latest.displacement > 4 ? 'accelerating' : 'stable', timeToThresholdHours: latest ? Math.max(1, Math.round(18 - latest.displacement * 2)) : null }); });
io.on('connection', (socket) => socket.emit('snapshot', { nodes: store.nodes, alerts: store.alerts, anomalyMode: store.anomalyMode }));
setInterval(() => emitSimulation(io), Number(process.env.SIMULATOR_INTERVAL_MS ?? 3000));
server.listen(port, () => console.log(`MineGuard API listening on http://localhost:${port}`));