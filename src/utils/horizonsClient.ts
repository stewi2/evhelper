// Single choke point for every JPL Horizons request in the app. Comets,
// moving targets, and custom objects each used to run their own independent
// concurrency pool, so on launch the app could burst ~12 simultaneous
// requests at Horizons (3 tabs x 4 in flight each) — enough to trip JPL's
// rate limiting and come back with intermittent 503s. Routing every request
// through one shared gate keeps the whole app's concurrent request count
// bounded regardless of how many tabs are fetching at once, and retries
// 503/429 (explicitly transient — "try again") with backoff instead of
// treating a rate-limit blip as a permanent failure.

const GLOBAL_CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 800;
const REQUEST_TIMEOUT_MS = 15000;

let active = 0;
const queue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (active < GLOBAL_CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  return new Promise(resolve => queue.push(resolve));
}

function releaseSlot(): void {
  active--;
  const next = queue.shift();
  if (next) {
    active++;
    next();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchOnce(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

// Fetches a Horizons API URL and returns the parsed JSON body, globally
// rate-limited and retrying transient 503/429 responses with backoff.
export async function fetchHorizonsJson(url: string): Promise<any> {
  await acquireSlot();
  try {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
      try {
        const res = await fetchOnce(url);
        if (res.status === 503 || res.status === 429) {
          lastError = new Error(`HTTP ${res.status}`);
          continue;
        }
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        return await res.json();
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Horizons request failed');
  } finally {
    releaseSlot();
  }
}
