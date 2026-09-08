import {fetchHorizons, toYYMMDD} from './comets';
import type {Obs} from './comets';
import {mapWithConcurrency} from './concurrency';
import type {Target} from './targets';

const HORIZONS_CONCURRENCY = 4;

export interface MovingTarget extends Target {
  astNumber: string; // JPL Horizons name/id for re-fetching ephemeris
  objectName: string; // fallback Horizons name (used when astNumber isn't the right one to query)
}

const UNISTELLAR_URL =
  'https://get-comet-target-978674542724.us-east1.run.app/?type=get_moving_target&target_date=';

interface UnistellarMovingTarget {
  ast_name: string;
  ast_number: string;
  object_name: string;
  exp_time: number;
  gain_db: number;
  duration: string;
  date_defense: [string, string];
}

// Spacecraft are catalogued with a negative JPL major-body id in ast_number
// (e.g. "-170" for JWST); everything else is an asteroid identified by name.
function isSpacecraft(astNumber: string): boolean {
  const n = parseInt(astNumber, 10);
  return !isNaN(n) && n < 0;
}

// The name/id to query JPL Horizons with — mirrors the logic on
// science.unistellar.com/ephemeris/: spacecraft use the numeric id directly,
// asteroids use their (possibly provisional) designation.
function horizonsName(astNumber: string, objectName: string): string {
  return isSpacecraft(astNumber) ? astNumber : objectName;
}

// Matches the scitag the Unistellar ephemeris backend builds server-side:
// 'p' + yymmdd + (spacecraft: "JPL<abs id>" | asteroid: designation with
// spaces stripped) + '1'.
function buildScitag(astNumber: string, date: Date): string {
  const yymmdd = toYYMMDD(date);
  const suffix = isSpacecraft(astNumber)
    ? `JPL${Math.abs(parseInt(astNumber, 10))}`
    : astNumber.replace(/\s+/g, '');
  return `p${yymmdd}${suffix}1`;
}

function buildDeeplink(
  ra: number,
  dec: number,
  expTime: number,
  gainDb: number,
  duration: string,
  astNumber: string,
  date: Date,
): string {
  const t = Math.floor(Date.now() / 1000);
  const scitag = buildScitag(astNumber, date);
  return (
    `unistellar://science/defense?ra=${ra.toFixed(5)}&dec=${dec.toFixed(5)}` +
    `&et=${Math.round(expTime)}&g=${Math.round(gainDb)}&d=${Math.round(parseFloat(duration))}` +
    `&t=${t}&scitag=${scitag}`
  );
}

export async function fetchMovingTargets(date: Date, obs: Obs): Promise<MovingTarget[]> {
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const res = await fetch(UNISTELLAR_URL + dateStr);
  if (!res.ok) {throw new Error(`Unistellar API HTTP ${res.status}`);}
  const list: UnistellarMovingTarget[] = await res.json();

  const active = list.filter(t => {
    const [start, end] = t.date_defense;
    return dateStr >= start && dateStr <= end;
  });
  console.log(`[movingTargets] ${list.length} total, ${active.length} active on ${dateStr}:`, active.map(t => t.ast_name));

  const results = await mapWithConcurrency(active, HORIZONS_CONCURRENCY, async t => {
    const name = horizonsName(t.ast_number, t.object_name);
    const pos = await fetchHorizons(name, date, obs).catch(err => {
      console.warn(`[movingTargets] fetchHorizons threw for ${t.ast_name}:`, err?.message ?? err);
      return null;
    });
    if (!pos) {
      console.warn(`[movingTargets] Horizons failed for ${t.ast_name}`);
      return null;
    }
    const deeplink = buildDeeplink(pos.ra, pos.dec, t.exp_time, t.gain_db, t.duration, t.ast_number, date);
    return {
      name: t.ast_name,
      cls: isSpacecraft(t.ast_number) ? 'SPACECRAFT' : 'ASTEROID',
      mag: pos.mag,
      discovered: '',
      exp: String(Math.round(t.exp_time)),
      gain: String(Math.round(t.gain_db)),
      duration: t.duration,
      deeplink,
      ra: pos.ra,
      dec: pos.dec,
      priority: false,
      astNumber: t.ast_number,
      objectName: t.object_name,
    } as MovingTarget;
  });

  return results.filter((t): t is MovingTarget => t !== null);
}

// Fetches a fresh ephemeris for a moving target and returns a new deeplink
// with current t. Used when the user taps Open on a moving target card.
export async function fetchFreshDeeplink(
  astNumber: string,
  objectName: string,
  expTime: number,
  gainDb: number,
  duration: string,
  obs: Obs,
): Promise<string | null> {
  const now = new Date();
  const pos = await fetchHorizons(horizonsName(astNumber, objectName), now, obs);
  if (!pos) {return null;}
  return buildDeeplink(pos.ra, pos.dec, expTime, gainDb, duration, astNumber, now);
}
