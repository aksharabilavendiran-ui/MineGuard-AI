import type { Server } from 'socket.io';
import { store } from './store.js';
import type { Reading, Risk } from './types.js';

function riskFor(tilt: number, displacement: number, crackDetected: boolean): Risk {
  if (crackDetected || displacement > 7 || tilt > 1.3) return 'CRITICAL';
  if (displacement > 4.5 || tilt > 0.85) return 'WARNING';
  if (displacement > 2.5 || tilt > 0.55) return 'WATCH';
  return 'NORMAL';
}

export function emitSimulation(io: Server) {
  const now = Date.now();
  store.nodes.forEach((node, index) => {
    const clusterPulse = store.anomalyMode && index >= 7 && index <= 13 ? Math.min(1, (now % 90000) / 90000) : 0;
    const noise = (Math.sin(now / 17000 + index) + 1) / 2;
    const tilt = Number((0.18 + noise * 0.12 + clusterPulse * 1.2).toFixed(3));
    const displacement = Number((0.8 + noise * 0.65 + clusterPulse * 8.2).toFixed(2));
    const vibration = Number((0.09 + noise * 0.1 + clusterPulse * 0.55).toFixed(3));
    const crackStrain = Number((0.08 + clusterPulse * 0.9 + noise * 0.06).toFixed(3));
    const crackDetected = crackStrain > 0.72;
    const risk = riskFor(tilt, displacement, crackDetected);
    const reading: Reading = { nodeId: node.id, timestamp: new Date().toISOString(), tilt, vibration, displacement, crackStrain, crackDetected, battery: Math.max(18, node.battery - 0.01), signal: Math.max(42, node.signal + Math.sin(now / 30000 + index) * 0.4), risk };
    store.addReading(reading);
    io.emit('reading', reading);
    if (risk === 'WARNING' || risk === 'CRITICAL') {
      const message = `${node.name} reports ${risk.toLowerCase()} deformation indicators`;
      if (!store.alerts.some((alert) => alert.nodeId === node.id && alert.message === message && !alert.acknowledged)) store.addAlert({ severity: risk, nodeId: node.id, message, recommendation: risk === 'CRITICAL' ? 'Evacuate the affected panel and dispatch an inspection team.' : 'Increase inspection frequency and review panel stability.', timestamp: reading.timestamp, acknowledged: false });
    }
  });
  io.emit('snapshot', { nodes: store.nodes, alerts: store.alerts, anomalyMode: store.anomalyMode });
}