import {useState, useEffect, useCallback} from 'react';
import {fetchMovingTargets} from '../utils/movingTargets';
import type {MovingTarget} from '../utils/movingTargets';
import type {Obs} from '../utils/comets';
import type {FetchStatus} from './useTargets';

export function useMovingTargets(obs: Obs | null) {
  const [movingTargets, setMovingTargets] = useState<MovingTarget[]>([]);
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
    else {setStatus('loading'); setStatusMsg('Fetching moving targets…');}

    try {
      const targets = await fetchMovingTargets(new Date(), obs);
      setMovingTargets(targets);
      setStatus('ok');
      setStatusMsg(`${targets.length} moving targets`);
      setLastUpdated(new Date());
    } catch (err) {
      setStatus('warn');
      setStatusMsg('Fetch failed');
    } finally {
      if (isRefresh) {setRefreshing(false);}
    }
  }, [obs]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {movingTargets, status, statusMsg, lastUpdated, refreshing, refresh};
}
