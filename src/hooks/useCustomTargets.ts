import {useState, useEffect, useCallback} from 'react';
import {
  loadCustomEntries,
  saveCustomEntries,
  fetchCustomTargets,
} from '../utils/customTargets';
import type {CustomEntry, CustomTarget} from '../utils/customTargets';
import type {Obs} from '../utils/comets';
import type {FetchStatus} from './useTargets';

export function useCustomTargets(obs: Obs | null) {
  const [entries, setEntries] = useState<CustomEntry[]>([]);
  const [targets, setTargets] = useState<CustomTarget[]>([]);
  const [failed, setFailed] = useState<CustomEntry[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (list: CustomEntry[], isRefresh = false) => {
    if (list.length === 0) {
      setTargets([]);
      setFailed([]);
      setStatus('ok');
      setStatusMsg('0 custom objects');
      setLastUpdated(new Date());
      return;
    }
    if (!obs) {
      setStatus('idle');
      setStatusMsg('Waiting for location…');
      return;
    }
    if (isRefresh) {setRefreshing(true);}
    else {setStatus('loading'); setStatusMsg('Fetching positions…');}

    try {
      const {targets: fetched, failed: failedEntries} = await fetchCustomTargets(list, new Date(), obs);
      setTargets(fetched);
      setFailed(failedEntries);
      setStatus('ok');
      setStatusMsg(`${fetched.length} custom objects`);
      setLastUpdated(new Date());
    } catch (err) {
      setStatus('warn');
      setStatusMsg('Fetch failed');
    } finally {
      if (isRefresh) {setRefreshing(false);}
    }
  }, [obs]);

  useEffect(() => {
    (async () => {
      const stored = await loadCustomEntries();
      setEntries(stored);
      setLoaded(true);
      await load(stored);
    })();
  }, [load]);

  const refresh = useCallback(() => load(entries, true), [load, entries]);

  const addEntry = useCallback(async (entry: CustomEntry) => {
    if (entries.some(e => e.command === entry.command)) {return;}
    const next = [...entries, entry];
    setEntries(next);
    await saveCustomEntries(next);
    await load(next);
  }, [entries, load]);

  const removeEntry = useCallback(async (id: string) => {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    await saveCustomEntries(next);
    await load(next);
  }, [entries, load]);

  return {
    entries, targets, failed, status, statusMsg, lastUpdated, refreshing, loaded,
    refresh, addEntry, removeEntry,
  };
}
