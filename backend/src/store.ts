import { randomUUID } from 'node:crypto';
import type { Alert, Node, Reading, Risk } from './types.js';

const nodes: Node[] = [];
const readings = new Map<string, Reading[]>();
const alerts: Alert[] = [];
let anomalyMode = false;

for (let index = 0; index < 24; index += 1) {
  const row = Math.floor(index / 6);
  const column = index % 6;
  const id = `MG-${String(index + 1).padStart(2, '0')}`;
  nodes.push({ id, name: `Mesh Node ${String(index + 1).padStart(2, '0')}`, lat: 23.742 + row * 0.0011, lng: 86.421 + column * 0.0013, panel: row < 2 ? 'Panel A' : 'Panel B', status: 'online', battery: 84 - (index % 5), signal: 86 - (index % 9), risk: 'NORMAL' });
  readings.set(id, []);
}

export const store = {
  get nodes() { return nodes; },
  get alerts() { return alerts; },
  get anomalyMode() { return anomalyMode; },
  setAnomalyMode(value: boolean) { anomalyMode = value; },
  getReadings(nodeId: string, limit = 40) { return (readings.get(nodeId) ?? []).slice(-limit); },
  addReading(reading: Reading) {
    const history = readings.get(reading.nodeId) ?? [];
    history.push(reading);
    if (history.length > 180) history.shift();
    readings.set(reading.nodeId, history);
    const node = nodes.find((item) => item.id === reading.nodeId);
    if (node) Object.assign(node, { lastReading: reading, battery: reading.battery, signal: reading.signal, risk: reading.risk });
  },
  addAlert(input: Omit<Alert, 'id'>) { const alert = { ...input, id: randomUUID() }; alerts.unshift(alert); return alert; },
  acknowledge(id: string) { const alert = alerts.find((item) => item.id === id); if (alert) alert.acknowledged = true; return alert; },
  setRisk(nodeId: string, risk: Risk) { const node = nodes.find((item) => item.id === nodeId); if (node) node.risk = risk; }
};