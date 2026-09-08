import {useState, useEffect, useCallback} from 'react';
import {fetchComets} from '../utils/comets';
import type {CometTarget, Obs} from '../utils/comets';
import type {FetchStatus} from './useTargets';

export function useComets(obs: Obs | null) {
  const [comets, setComets] = useState<CometTarget[]>([]);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!obs) {
      setStatus('idle');
      setStatusMsg('Waiting for location…');
      return;
    }
    if (isRefresh) {setRefreshing(true);}
    else {setStatus('loading'); setStatusMsg('Fetching comets…');}

    try {
      const targets = await fetchComets(new Date(), obs);
      setComets(targets);
      setStatus('ok');
      setStatusMsg(`${targets.length} comets`);
      setLastUpdated(new Date());
    } catch {
      setStatus('warn');
      setStatusMsg('Fetch failed');
    } finally {
      if (isRefresh) {setRefreshing(false);}
    }
  }, [obs]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {comets, status, statusMsg, lastUpdated, refreshing, refresh};
}
