import * as React from 'react';
import {useState, useMemo} from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {Colors, SortKey} from '../utils/theme';
import {radecToAltAz} from '../utils/astronomy';
import {fetchFreshDeeplink} from '../utils/movingTargets';
import type {MovingTarget} from '../utils/movingTargets';
import type {useMovingTargets} from '../hooks/useMovingTargets';
import {TargetCard} from '../components/TargetCard';
import {SortPanel} from '../components/SortPanel';
import {Toolbar} from '../components/Toolbar';

interface Obs {
  lat: number;
  lon: number;
}

type MovingTargetsHook = ReturnType<typeof useMovingTargets>;

interface Props {
  obs: Obs;
  altAzNow: Date;
  onToggleLocation: () => void;
  movingTargetsHook: MovingTargetsHook;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  minAlt: number | null;
  onMinAltChange: (v: number | null) => void;
}

export function MovingTargetsScreen({
  obs, altAzNow, onToggleLocation, movingTargetsHook,
  sortKey, onSortChange, minAlt, onMinAltChange,
}: Props) {
  const {movingTargets, status, statusMsg, refreshing, refresh} = movingTargetsHook;
  const [showSort, setShowSort] = useState(false);

  type MovingRow = MovingTarget & {alt: number; az: number};

  const rows = useMemo<MovingRow[]>(() => {
    const computed: MovingRow[] = movingTargets.map(t => ({
      ...t,
      ...radecToAltAz(t.ra, t.dec, obs.lat, obs.lon, altAzNow),
    }));
    computed.sort((a, b) => {
      switch (sortKey) {
        case 'alt_desc': return b.alt - a.alt;
        case 'az':       return a.az - b.az;
        case 'name':     return a.name.localeCompare(b.name);
        case 'mag':      return parseFloat(a.mag || '99') - parseFloat(b.mag || '99');
        default:         return b.alt - a.alt;
      }
    });
    return minAlt !== null ? computed.filter(r => r.alt >= minAlt) : computed;
  }, [movingTargets, obs, altAzNow, sortKey, minAlt]);

  async function handleOpen(item: MovingRow) {
    const deeplink = await fetchFreshDeeplink(
      item.astNumber,
      item.objectName,
      parseFloat(item.exp),
      parseFloat(item.gain),
      item.duration,
      obs,
    );

    if (!deeplink) {
      Alert.alert('Position Unavailable', 'Could not fetch current ephemeris from JPL Horizons.');
      return;
    }
    const canOpen = await Linking.canOpenURL(deeplink);
    if (canOpen) {
      await Linking.openURL(deeplink);
    } else {
      Alert.alert('Unistellar App Not Found', 'Install the Unistellar app to open this target directly.');
    }
  }

  return (
    <View style={styles.root}>
      <Toolbar
        status={status}
        statusMsg={statusMsg}
        minAlt={minAlt}
        visibleCount={rows.length}
        totalCount={movingTargets.length}
        itemLabel="moving targets"
        onRefresh={refresh}
        onToggleSort={() => setShowSort(v => !v)}
        onToggleLocation={onToggleLocation}
        onMinAltChange={onMinAltChange}
      />

      {showSort && (
        <SortPanel
          current={sortKey}
          onChange={key => { onSortChange(key); setShowSort(false); }}
        />
      )}

      <FlatList
        data={rows}
        keyExtractor={(item, i) => item.name + i}
        renderItem={({item}) => (
          <TargetCard target={item} onOpen={() => handleOpen(item)} />
        )}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          status !== 'loading' ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {status === 'warn' ? statusMsg : 'No active moving targets.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  list: {paddingBottom: 40, paddingTop: 4},
  empty: {alignItems: 'center', paddingTop: 80},
  emptyText: {color: Colors.muted, fontSize: 13},
});
