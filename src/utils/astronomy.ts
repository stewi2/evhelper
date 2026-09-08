// Astronomy utility functions

export function radecToAltAz(
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  date: Date,
): {alt: number; az: number} {
  const JD = date.getTime() / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525.0;
  let GMST =
    280.46061837 +
    360.98564736629 * (JD - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000;
  GMST = ((GMST % 360) + 360) % 360;
  const LST = ((GMST + lon) % 360 + 360) % 360;
  const HA = ((LST - raDeg) % 360 + 360) % 360;

  const ha = (HA * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;

  const sinAlt =
    Math.sin(dec) * Math.sin(phi) +
    Math.cos(dec) * Math.cos(phi) * Math.cos(ha);
  const alt = (Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180) / Math.PI;

  const cosAz =
    (Math.sin(dec) - Math.sin((alt * Math.PI) / 180) * Math.sin(phi)) /
    (Math.cos((alt * Math.PI) / 180) * Math.cos(phi));
  let az = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;
  if (Math.sin(ha) > 0) {
    az = 360 - az;
  }

  return {alt, az};
}

// Low-precision solar position (Astronomical Almanac), good to ~0.01° — plenty
// for classifying daylight vs. civil/astronomical twilight.
export function sunAltitude(date: Date, lat: number, lon: number): number {
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = (((280.46 + 0.9856474 * n) % 360) + 360) % 360;
  const g = ((((357.528 + 0.9856003 * n) % 360) + 360) % 360) * (Math.PI / 180);
  const lambda =
    (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * (Math.PI / 180);
  const eps = (23.439 - 0.0000004 * n) * (Math.PI / 180);
  const ra =
    (Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) * 180) /
    Math.PI;
  const dec = (Math.asin(Math.sin(eps) * Math.sin(lambda)) * 180) / Math.PI;
  return radecToAltAz(((ra % 360) + 360) % 360, dec, lat, lon, date).alt;
}

const DIRS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function compassDir(az: number): string {
  return DIRS[Math.round(az / 22.5) % 16];
}

export function parseRA(v: number | string): number {
  if (typeof v === 'number') {return v;}
  const s = String(v).trim();
  if (/^[\d.]+$/.test(s)) {return parseFloat(s);}
  const p = s
    .replace(/[hms°'"]/g, ' ')
    .split(/[\s:]+/)
    .filter(Boolean)
    .map(Number);
  if (p.length >= 3) {return (p[0] + p[1] / 60 + p[2] / 3600) * 15;}
  if (p.length === 2) {return (p[0] + p[1] / 60) * 15;}
  return parseFloat(s);
}

export function parseDec(v: number | string): number {
  if (typeof v === 'number') {return v;}
  const s = String(v).trim();
  if (/^-?[\d.]+$/.test(s)) {return parseFloat(s);}
  const sign = s.startsWith('-') ? -1 : 1;
  const p = s
    .replace(/^[+-]/, '')
    .replace(/[°'"dms]/g, ' ')
    .split(/[\s:]+/)
    .filter(Boolean)
    .map(Number);
  if (p.length >= 3) {return sign * (p[0] + p[1] / 60 + p[2] / 3600);}
  if (p.length === 2) {return sign * (p[0] + p[1] / 60);}
  return parseFloat(s);
}

export function formatRA(deg: number): string {
  const totalHours = deg / 15;
  const h = Math.floor(totalHours);
  const m = Math.floor((totalHours - h) * 60);
  const s = Math.round(((totalHours - h) * 60 - m) * 60);
  return `${h}h${m.toString().padStart(2, '0')}m${s.toString().padStart(2, '0')}s`;
}

export function formatDec(deg: number): string {
  const sign = deg >= 0 ? '+' : '-';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.round(((abs - d) * 60 - m) * 60);
  return `${sign}${d}°${m.toString().padStart(2, '0')}'${s.toString().padStart(2, '0')}"`;
}

export function altColor(alt: number): string {
  if (alt < 0) {return '#ff4d6d';}
  const hue = Math.round(160 - (90 - alt) * 0.5);
  return `hsl(${hue}, 80%, 60%)`;
}
