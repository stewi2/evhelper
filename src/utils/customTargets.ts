import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchHorizonsPosition} from './horizonsSearch';
import type {HorizonsBodyKind} from './horizonsSearch';
import {toYYMMDD} from './comets';
import type {Obs} from './comets';
import {mapWithConcurrency} from './concurrency';
import type {Target} from './targets';

const HORIZONS_CONCURRENCY = 4;

const STORAGE_KEY = 'evhelper.customTargets.v1';

// Custom targets aren't part of any real Unistellar citizen-science
// campaign, so unlike comets.ts/movingTargets.ts there's no per-target
// exposure profile from Unistellar's own backend to carry through the
// deeplink. These are generic placeholder capture settings — the app lets
// the user adjust exposure/gain/duration before actually capturing.
const DEFAULT_EXP_MS = 3971;
const DEFAULT_GAIN_DB = 25;
const DEFAULT_DURATION_SEC = '600'; // 10 minutes — TargetCard displays duration/60

// Routes to the same campaign type the object would naturally belong to:
// comets go through science/comet (comets.ts's scheme), everything else
// (asteroids, spacecraft, planets, ...) through science/defense
// (movingTargets.ts's scheme, which already covers both asteroids and
// spacecraft) — there's no third route for the remaining kinds, and
// "defense" is the more general-purpose non-comet one.
function buildDeeplink(ra: number, dec: number, entry: CustomEntry, date: Date): string {
  const t = Math.floor(Date.now() / 1000);
  const yymmdd = toYYMMDD(date);

  if (entry.kind === 'comet') {
    const stripped = entry.label.replace(/[^A-Za-z0-9]/g, '');
    const tag = `c${yymmdd}DES${stripped}1`;
    return (
      `unistellar://science/comet?ra=${ra.toFixed(5)}&dec=${dec.toFixed(5)}` +
      `&et=${DEFAULT_EXP_MS}&g=${DEFAULT_GAIN_DB}&d=${DEFAULT_DURATION_SEC}` +
      `&t=${t}&scitag=${tag}`
    );
  }

  // Spacecraft commands are the bare JPL major-body id (e.g. "-211");
  // everything else's command is quoted/semicolon-decorated for Horizons,
  // so derive the designation from the display label instead.
  const suffix = entry.kind === 'spacecraft'
    ? `JPL${Math.abs(parseInt(entry.command, 10))}`
    : entry.label.replace(/[^A-Za-z0-9]/g, '');
  const tag = `p${yymmdd}${suffix}1`;
  return (
    `unistellar://science/defense?ra=${ra.toFixed(5)}&dec=${dec.toFixed(5)}` +
    `&et=${DEFAULT_EXP_MS}&g=${DEFAULT_GAIN_DB}&d=${DEFAULT_DURATION_SEC}` +
    `&t=${t}&scitag=${tag}`
  );
}

export interface CustomEntry {
  id: string; // stable local id
  command: string; // Horizons COMMAND value for this body
  label: string; // user-facing name
  kind: HorizonsBodyKind;
}

export interface CustomTarget extends Target {
  entryId: string;
}

export async function loadCustomEntries(): Promise<CustomEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {return [];}
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomEntries(entries: CustomEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

// Fetches current positions for all saved custom entries. Entries whose
// Horizons lookup fails (e.g. a defunct spacecraft with no more ephemeris
// data) are reported separately rather than silently vanishing — otherwise
// they'd stay in storage forever with no card, and thus no way to remove them.
export async function fetchCustomTargets(
  entries: CustomEntry[],
  date: Date,
  obs: Obs,
): Promise<{targets: CustomTarget[]; failed: CustomEntry[]}> {
  const results = await mapWithConcurrency(entries, HORIZONS_CONCURRENCY, async entry => {
    try {
      const pos = await fetchHorizonsPosition(entry.command, date, obs);
      if (!pos) {return {entry, target: null};}
      return {
        entry,
        target: {
          entryId: entry.id,
          name: entry.label,
          cls: (entry.kind ?? 'other').replace('-', ' ').toUpperCase(),
          mag: pos.mag,
          discovered: '',
          exp: String(DEFAULT_EXP_MS),
          gain: String(DEFAULT_GAIN_DB),
          duration: DEFAULT_DURATION_SEC,
          deeplink: buildDeeplink(pos.ra, pos.dec, entry, date),
          ra: pos.ra,
          dec: pos.dec,
          priority: false,
        } as CustomTarget,
      };
    } catch (err: any) {
      console.warn(`[custom] failed to fetch/build target for ${entry.label}:`, err?.message ?? err);
      return {entry, target: null};
    }
  });
  return {
    targets: results.filter((r): r is {entry: CustomEntry; target: CustomTarget} => r.target !== null).map(r => r.target),
    failed: results.filter(r => r.target === null).map(r => r.entry),
  };
}

// Fetches a fresh position for one custom entry and returns a new deeplink
// with a current timestamp. Used when the user taps Open on a custom card.
export async function fetchFreshDeeplink(entry: CustomEntry, obs: Obs): Promise<string | null> {
  const now = new Date();
  const pos = await fetchHorizonsPosition(entry.command, now, obs);
  if (!pos) {return null;}
  return buildDeeplink(pos.ra, pos.dec, entry, now);
}
