export type Risk = 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface Reading {
  nodeId: string;
  timestamp: string;
  tilt: number;
  vibration: number;
  displacement: number;
  crackStrain: number;
  crackDetected: boolean;
  battery: number;
  signal: number;
  risk: Risk;
}

export interface Node { id: string; name: string; lat: number; lng: number; panel: string; status: 'online' | 'offline'; battery: number; signal: number; risk: Risk; lastReading?: Reading; }
export interface Alert { id: string; severity: Risk; nodeId: string; message: string; recommendation: string; timestamp: string; acknowledged: boolean; }