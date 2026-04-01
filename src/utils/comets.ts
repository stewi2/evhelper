import {parseRA, parseDec} from './astronomy';
import type {Target} from './targets';

export interface CometTarget extends Target {
  objectName: string; // JPL Horizons object_name for re-fetching ephemeris
}

const UNISTELLAR_URL =
  'https://get-comet-target-978674542724.us-east1.run.app/?type=get_comet_target&target_date=';

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

interface UnistellarComet {
  object_name: string;
  comet_name: string;
  exp_time: number;
  gain_db: number;
  duration: string;
  date_comet: [string, string];
}

function toYYMMDD(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return yy + mm + dd;
}

function toHorizonsDate(date: Date): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const y = date.getFullYear();
  const m = months[date.getMonth()];
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseHorizonsLine(result: string): {ra: number; dec: number; mag: string} | null {
  const soe = result.indexOf('$SOE');
  const eoe = result.indexOf('$EOE');
  if (soe < 0 || eoe < 0) {return null;}
  const block = result.slice(soe + 4, eoe);
  const line = block.split('\n').find(l => l.trim().length > 0);
  if (!line) {return null;}
  // Format: " 2026-Mar-18 00:00     16 55 57.00 -16 55 24.1   8.23   n.a."
  // Datetime prefix is 18 chars (" YYYY-Mon-DD HH:MM"), then spaces, then RA/Dec, then APmag
  const rest = line.slice(18).trim();
  const raMatch = rest.match(/^(\d{2} \d{2} \d{2,}\.\d+)\s+([+-]\d{2} \d{2} \d{2,}\.\d+)\s+([\d.]+|n\.a\.)/);
  if (!raMatch) {return null;}
  const ra = parseRA(raMatch[1]);
  const dec = parseDec(raMatch[2]);
  if (isNaN(ra) || isNaN(dec)) {return null;}
  const mag = raMatch[3] === 'n.a.' ? '' : parseFloat(raMatch[3]).toFixed(1);
  return {ra, dec, mag};
}

function buildHorizonsUrl(command: string, start: string, stop: string): string {
  return (
    `${HORIZONS_URL}?format=json&COMMAND=${command}&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER` +
    `&CENTER=500%40399&START_TIME=${start}&STOP_TIME=${stop}` +
    `&STEP_SIZE=1d&QUANTITIES=%271%2C9%27&OBJ_DATA=NO`
  );
}

// When Horizons returns a disambiguation table, extract the most recent
// non-fragment record number (fragments have "-" in their designation).
function extractBestRecord(result: string): string | null {
  const rows = Array.from(result.matchAll(/^\s*(\d{3,})\s+(\d{4})\s+(\S+)/gm));
  const mainBody = rows.filter(m => !m[3].includes('-'));
  if (mainBody.length === 0) {return null;}
  // Sort descending by epoch year, pick most recent.
  mainBody.sort((a, b) => parseInt(b[2], 10) - parseInt(a[2], 10));
  return mainBody[0][1];
}

async function fetchHorizons(objectName: string, date: Date): Promise<{ra: number; dec: number; mag: string} | null> {
  const start = toHorizonsDate(date);
  const stop = toHorizonsDate(new Date(date.getTime() + 86400000));

  const command = encodeURIComponent(`'${objectName}'`);
  const url = buildHorizonsUrl(command, start, stop);
  console.log(`[horizons] fetching: ${url}`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let res: Response;
  try {
    res = await fetch(url, {signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {return null;}
  const json = await res.json();
  if (json.error) {
    console.warn(`[horizons:${objectName}] API error:`, json.error);
    return null;
  }
  const result = json.result ?? '';
  const parsed = parseHorizonsLine(result);
  if (parsed) {return parsed;}

  // Horizons returned a disambiguation table — retry with the best record number + semicolon.
  const recordId = extractBestRecord(result);
  if (!recordId) {
    console.warn(`[horizons:${objectName}] parse failed (no record ID):`, result.slice(0, 400));
    return null;
  }
  console.log(`[horizons:${objectName}] retrying with record ${recordId}`);
  // Horizons requires "integer;" format for direct record selection (no quotes).
  const controller2 = new AbortController();
  const timer2 = setTimeout(() => controller2.abort(), 15000);
  let res2: Response;
  try {
    res2 = await fetch(buildHorizonsUrl(`${recordId}%3B`, start, stop), {signal: controller2.signal});
  } finally {
    clearTimeout(timer2);
  }
  if (!res2.ok) {return null;}
  const json2 = await res2.json();
  if (json2.error) {
    console.warn(`[horizons:${objectName}] retry error:`, json2.error);
    return null;
  }
  const parsed2 = parseHorizonsLine(json2.result ?? '');
  if (!parsed2) {
    console.warn(`[horizons:${objectName}] retry parse failed:`, (json2.result ?? '').slice(0, 300));
  }
  return parsed2;
}

function buildDeeplink(
  ra: number,
  dec: number,
  expTime: number,
  gainDb: number,
  duration: string,
  objectName: string,
  date: Date,
): string {
  const t = Math.floor(Date.now() / 1000);
  const yymmdd = toYYMMDD(date);
  const stripped = objectName.replace(/[/ ]/g, '');
  const suffix = stripped.startsWith('C') ? stripped.slice(1) : 'DES' + stripped;
  const tag = 'c' + yymmdd + suffix + '1';
  return (
    `unistellar://science/comet?ra=${ra.toFixed(5)}&dec=${dec.toFixed(5)}` +
    `&et=${Math.round(expTime)}&g=${Math.round(gainDb)}&d=${Math.round(parseFloat(duration))}` +
    `&t=${t}&scitag=${tag}`
  );
}

export async function fetchComets(date: Date): Promise<CometTarget[]> {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const res = await fetch(UNISTELLAR_URL + dateStr);
  if (!res.ok) {throw new Error(`Unistellar API HTTP ${res.status}`);}
  const list: UnistellarComet[] = await res.json();

  // Filter to active comets (today within date_comet range)
  const active = list.filter(c => {
    const [start, end] = c.date_comet;
    return dateStr >= start && dateStr <= end;
  });
  console.log(`[comets] ${list.length} total, ${active.length} active on ${dateStr}:`, active.map(c => c.object_name));

  const results: (CometTarget | null)[] = [];
  for (const c of active) {
    const pos = await fetchHorizons(c.object_name, date).catch(err => {
      console.warn(`[comets] fetchHorizons threw for ${c.object_name}:`, err?.message ?? err);
      return null;
    });
    if (!pos) {
      console.warn(`[comets] Horizons failed for ${c.object_name}`);
      results.push(null);
      continue;
    }
    const deeplink = buildDeeplink(pos.ra, pos.dec, c.exp_time, c.gain_db, c.duration, c.object_name, date);
    results.push({
      name: c.comet_name,
      cls: 'COMET',
      mag: pos.mag,
      discovered: '',
      exp: String(Math.round(c.exp_time)),
      gain: String(Math.round(c.gain_db)),
      duration: c.duration,
      deeplink,
      ra: pos.ra,
      dec: pos.dec,
      priority: false,
      objectName: c.object_name,
    });
  }

  return results.filter((t): t is CometTarget => t !== null);
}

// Fetches a fresh ephemeris for a comet and returns a new deeplink with current t.
// Used when the user taps Open on a comet card.
export async function fetchFreshDeeplink(
  objectName: string,
  expTime: number,
  gainDb: number,
  duration: string,
): Promise<string | null> {
  const now = new Date();
  const pos = await fetchHorizons(objectName, now);
  if (!pos) {return null;}
  return buildDeeplink(pos.ra, pos.dec, expTime, gainDb, duration, objectName, now);
}
