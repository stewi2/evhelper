import {useState, useEffect, useCallback} from 'react';
import {fetchTargets} from '../utils/targets';
import type {Target} from '../utils/targets';

export type FetchStatus = 'idle' | 'loading' | 'ok' | 'warn' | 'error';

export function useTargets() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);}
    else {setStatus('loading'); setStatusMsg('Fetching targets…');}

    try {
      const {targets: t} = await fetchTargets();
      setTargets(t);
      setStatus('ok');
      setStatusMsg(`${t.length} targets`);
      setLastUpdated(new Date());
    } catch (err) {
      setStatus('warn');
      setStatusMsg('Fetch failed');
    } finally {
      if (isRefresh) {setRefreshing(false);}
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {targets, status, statusMsg, lastUpdated, refreshing, refresh};
}
