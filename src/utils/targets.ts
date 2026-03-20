import {parseRA, parseDec} from './astronomy';

export interface Target {
  name: string;
  cls: string;
  mag: string;
  discovered: string;
  exp: string;
  gain: string;
  duration: string;
  deeplink: string;
  ra: number;
  dec: number;
  priority: boolean;
}

export interface TargetWithAltAz extends Target {
  alt: number;
  az: number;
}

const DATA_URL =
  'https://alerts.unistellaroptics.com/transient/data/data.js';

async function fetchRaw(): Promise<string> {
  const res = await fetch(DATA_URL);
  if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
  return res.text();
}

function parseDataJS(text: string): Target[] {
  const s = text
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^\s*(var|let|const)\s+\w+\s*=\s*/, '')
    .replace(/;\s*$/, '')
    .trim();

  const rows: any[] = JSON.parse(s);

  return rows
    .map(r => ({
      name: r.name || '',
      cls: r.classification || '',
      mag: String(r.vmag ?? ''),
      discovered: String(r.date_discovery || ''),
      exp: String(r.exp ?? ''),
      gain: String(r.gain ?? ''),
      duration: String(r.dur ?? ''),
      deeplink: r.deeplink || '',
      ra: parseRA(r.ra ?? ''),
      dec: parseDec(r.dec ?? ''),
      priority: false,
    }))
    .filter(r => r.name && !isNaN(r.ra) && !isNaN(r.dec) && r.ra !== 0);
}

export async function fetchTargets(): Promise<{targets: Target[]}> {
  const text = await fetchRaw();
  return {targets: parseDataJS(text)};
}
