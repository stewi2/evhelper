import {parseRA, parseDec} from './astronomy';
import {fetchHorizonsJson} from './horizonsClient';
import type {Obs} from './comets';

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';

// Geocentric coordinates are fine for anything far from Earth, but
// meaningless for near-Earth satellites (e.g. the ISS) — see comets.ts's
// centerParams for the full explanation. Custom targets can be anything,
// including near-Earth objects, so apply the same observer-site correction.
function centerParams(obs: Obs): string {
  const site = encodeURIComponent(`'${obs.lon},${obs.lat},0'`);
  return `CENTER=coord%40399&COORD_TYPE=GEODETIC&SITE_COORD=${site}`;
}

export type HorizonsBodyKind =
  | 'planet' | 'spacecraft' | 'comet' | 'minor-planet' | 'asteroid'
  | 'satellite' | 'barycenter' | 'other';

export interface HorizonsCandidate {
  command: string; // exact value to place in COMMAND= (unquoted, unencoded)
  label: string;
  kind: HorizonsBodyKind;
  id?: string; // Horizons spkid — used to dedupe
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
  // Topocentric queries insert a one-character rise/set/twilight flag (e.g.
  // "*") right after the datetime, which survives trim() and would
  // otherwise block the RA match below — see comets.ts's parseHorizonsLine.
  const rest = line.slice(18).trim();
  // Magnitude can be negative for very bright objects (Jupiter, Venus, ...).
  const raMatch = rest.match(/^[A-Za-z*]?\s*(\d{2} \d{2} \d{2,}\.\d+)\s+([+-]\d{2} \d{2} \d{2,}\.\d+)\s+([+-]?[\d.]+|n\.a\.)/);
  if (!raMatch) {return null;}
  const ra = parseRA(raMatch[1]);
  const dec = parseDec(raMatch[2]);
  if (isNaN(ra) || isNaN(dec)) {return null;}
  const mag = raMatch[3] === 'n.a.' ? '' : parseFloat(raMatch[3]).toFixed(1);
  return {ra, dec, mag};
}

const LOOKUP_URL = 'https://ssd.jpl.nasa.gov/api/horizons_lookup.api';

interface LookupResult {
  name: string;
  type: string;
  pdes: string | null;
  spkid: string;
}

// A numbered periodic/dead comet's pdes is just its number ("427P"); an
// unnumbered one's is a provisional designation ("C/2015 X7").
const NUMBERED_COMET_PDES = /^\d+[PD]$/;

// Builds the COMMAND= value that uniquely resolves this candidate on the
// separate (plaintext) horizons.api ephemeris endpoint, verified live for
// each case: a bare major-body spkid works directly; a numbered small body
// resolves via its number/designation plus a trailing ";" to force the
// small-body catalog; an unnumbered one additionally needs quoting or the
// ";" alone matches the wrong record.
function buildCandidate(entry: LookupResult): HorizonsCandidate {
  const {name, type, pdes, spkid} = entry;

  // These two exact strings are the small (numerically-integrated) body
  // catalog — the only types whose command needs the quoted-pdes-plus-";"
  // treatment. Matching on a prefix here is a trap: dwarf planets with
  // known satellites (Haumea, ...) also return major-body-index entries
  // like "asteroid barycenter" and "asteroidal system primary/satellite",
  // which start with the substring "asteroid" but are a completely
  // different (bare-spkid) kind of record, and have no "pdes" at all.
  if (type === 'comet (integrated barycenter)') {
    const numbered = pdes !== null && NUMBERED_COMET_PDES.test(pdes);
    if (numbered) {
      return {command: `${pdes};`, label: `${pdes}/${name}`, kind: 'comet', id: spkid};
    }
    // Unnumbered comet names already come back like "ATLAS (C/2015 X7)".
    return {command: `'${pdes}';`, label: name, kind: 'comet', id: spkid};
  }

  if (type === 'asteroid (integrated barycenter)') {
    return {command: `'${pdes}';`, label: name, kind: 'asteroid', id: spkid};
  }

  // Everything else is major-body-index-side, where the spkid works
  // directly as COMMAND= with no quoting. The lookup API's own "type"
  // already says exactly what this is — surface it directly as the kind.
  const kind: HorizonsBodyKind =
    type === 'spacecraft' ? 'spacecraft' :
    type === 'planet' ? 'planet' :
    type === 'natural satellite' || type === 'asteroidal system satellite' ? 'satellite' :
    type === 'barycenter' || type === 'asteroid barycenter' ? 'barycenter' :
    type === 'asteroidal system primary' ? 'asteroid' :
    'other';
  // The lookup API appends "(spacecraft)" to the name itself; redundant
  // once we already show a SPACECRAFT badge from `kind`.
  const label = kind === 'spacecraft' ? name.replace(/\s*\(spacecraft\)\s*$/i, '') : name;
  return {command: spkid, label, kind, id: spkid};
}

// Searches JPL Horizons' lookup service — a separate, structured-JSON API
// from the ephemeris endpoint below — for objects matching a free-text
// name across both the major-body (planets/moons/spacecraft) and
// small-body (asteroid/comet) catalogs in one call. Its "id"/"name" fields
// aren't directly usable as ephemeris COMMAND values (see buildCandidate);
// fetchHorizonsPosition still hits the plaintext horizons.api for that.
export async function searchHorizonsByName(query: string): Promise<{candidates: HorizonsCandidate[]; error?: string}> {
  const trimmed = query.trim();
  if (!trimmed) {return {candidates: []};}

  const url = `${LOOKUP_URL}?sstr=${encodeURIComponent(trimmed)}`;
  let json: any;
  try {
    json = await fetchHorizonsJson(url);
  } catch {
    return {candidates: [], error: 'Search request failed.'};
  }

  const results: LookupResult[] = Number(json.count ?? 0) > 0 ? (json.result ?? []) : [];
  if (results.length === 0) {return {candidates: []};}

  // A handful of heavily-studied numbered asteroids (Vesta, Ceres, ...) have
  // a second, more precise major-body-index entry (type "other") — a
  // precomputed spacecraft-tracking trajectory file — alongside their usual
  // numerically-integrated small-body entry. Prefer the precomputed one
  // (its spkid resolves directly with no quoting, unlike the bare IAU
  // number, which collides with unrelated major-body ids) and drop the
  // redundant small-body entry for the same object rather than showing both.
  const others = results.filter(r => r.type === 'other');
  const rest = results.filter(r => r.type !== 'other');
  const merged = new Set<string>();

  const candidates: HorizonsCandidate[] = [];
  for (const other of others) {
    const core = other.name.trim().toLowerCase();
    const match = rest.find(r => r.type === 'asteroid (integrated barycenter)' && r.name.toLowerCase().endsWith(core));
    if (match) {
      candidates.push({command: other.spkid, label: match.name, kind: 'asteroid', id: other.spkid});
      merged.add(match.name);
    } else {
      candidates.push({command: other.spkid, label: other.name, kind: 'other', id: other.spkid});
    }
  }
  for (const entry of rest) {
    if (merged.has(entry.name)) {continue;}
    candidates.push(buildCandidate(entry));
  }

  return {candidates: await excludeWithoutCurrentEphemeris(candidates)};
}

// Comets/asteroids/planets/barycenters are numerically integrated or
// precomputed far into the future, so they're always safe to show. But the
// major-body index also carries spacecraft (and the odd historical special
// case) whose mission has ended and whose ephemeris file simply stops at
// some past date — e.g. India's Mars Orbiter Mission, which resolves fine
// by name but has had no ephemeris since 2022. Check those specifically
// against today's date before surfacing them as addable.
const EPHEMERIS_RISK_KINDS: HorizonsBodyKind[] = ['spacecraft', 'satellite', 'other'];

async function excludeWithoutCurrentEphemeris(candidates: HorizonsCandidate[]): Promise<HorizonsCandidate[]> {
  const checked = await Promise.all(candidates.map(async c => {
    if (!EPHEMERIS_RISK_KINDS.includes(c.kind)) {return c;}
    const available = await hasCurrentEphemeris(c.command, new Date());
    return available ? c : null;
  }));
  return checked.filter((c): c is HorizonsCandidate => c !== null);
}

// Checks whether a resolved COMMAND value has any ephemeris data at all for
// the given date — e.g. a defunct spacecraft's file may simply stop at some
// past date. This is a pure existence check, not a position: it's always
// geocentric and takes no observer location, since a real site coordinate
// wouldn't change whether the object has current data, only where exactly
// it'd appear.
async function hasCurrentEphemeris(command: string, date: Date): Promise<boolean> {
  const start = toHorizonsDate(date);
  const stop = toHorizonsDate(new Date(date.getTime() + 86400000));
  const url =
    `${HORIZONS_URL}?format=json&COMMAND=${encodeURIComponent(command)}&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER` +
    `&CENTER=500%40399&START_TIME=${start}&STOP_TIME=${stop}` +
    `&STEP_SIZE=1d&QUANTITIES=%271%2C9%27&OBJ_DATA=NO`;
  try {
    const json = await fetchHorizonsJson(url);
    if (json.error) {return false;}
    return parseHorizonsLine(json.result ?? '') !== null;
  } catch (err: any) {
    console.warn(`[horizonsSearch] hasCurrentEphemeris failed for ${command}:`, err?.message ?? err);
    return false;
  }
}

// Fetches current RA/Dec/mag for a resolved Horizons COMMAND value.
export async function fetchHorizonsPosition(
  command: string,
  date: Date,
  obs: Obs,
): Promise<{ra: number; dec: number; mag: string} | null> {
  const start = toHorizonsDate(date);
  const stop = toHorizonsDate(new Date(date.getTime() + 86400000));
  const url =
    `${HORIZONS_URL}?format=json&COMMAND=${encodeURIComponent(command)}&MAKE_EPHEM=YES&EPHEM_TYPE=OBSERVER` +
    `&${centerParams(obs)}&START_TIME=${start}&STOP_TIME=${stop}` +
    `&STEP_SIZE=1d&QUANTITIES=%271%2C9%27&OBJ_DATA=NO`;
  try {
    const json = await fetchHorizonsJson(url);
    if (json.error) {return null;}
    return parseHorizonsLine(json.result ?? '');
  } catch (err: any) {
    console.warn(`[horizonsSearch] fetchHorizonsPosition failed for ${command}:`, err?.message ?? err);
    return null;
  }
}
