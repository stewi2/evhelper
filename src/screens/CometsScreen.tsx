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
import {fetchFreshDeeplink} from '../utils/comets';
import type {CometTarget} from '../utils/comets';
import type {useComets} from '../hooks/useComets';
import {TargetCard} from '../components/TargetCard';
import {useExpandedCard} from '../hooks/useExpandedCard';
import {SortPanel} from '../components/SortPanel';
import {Toolbar} from '../components/Toolbar';

interface Obs {
  lat: number;
  lon: number;
}

type CometHook = ReturnType<typeof useComets>;

interface Props {
  obs: Obs;
  altAzNow: Date;
  onToggleLocation: () => void;
  cometHook: CometHook;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  minAlt: number | null;
  onMinAltChange: (v: number | null) => void;
}

export function CometsScreen({
  obs, altAzNow, onToggleLocation, cometHook,
  sortKey, onSortChange, minAlt, onMinAltChange,
}: Props) {
  const {comets, status, statusMsg, refreshing, refresh} = cometHook;
  const [showSort, setShowSort] = useState(false);
  const {listRef, expandedKey, toggle} = useExpandedCard<(typeof rows)[number]>();

  type CometRow = CometTarget & {alt: number; az: number};

  const rows = useMemo<CometRow[]>(() => {
    const computed: CometRow[] = comets.map(t => ({
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
  }, [comets, obs, altAzNow, sortKey, minAlt]);

  async function handleCometOpen(item: CometRow) {
    const deeplink = await fetchFreshDeeplink(
      item.objectName,
      parseFloat(item.exp),
      parseFloat(item.gain),
      item.duration,
      obs,
    );

    console.log('deeplink', deeplink);

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
        totalCount={comets.length}
        itemLabel="comets"
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
        ref={listRef}
        onScrollToIndexFailed={() => {}}
        data={rows}
        keyExtractor={(item, i) => item.name + i}
        renderItem={({item, index}) => (
          <TargetCard
            target={item}
            obs={obs}
            now={altAzNow}
            minAlt={minAlt}
            expanded={expandedKey === item.name}
            onToggle={() => toggle(item.name, index)}
            onOpen={() => handleCometOpen(item)}
          />
        )}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          status !== 'loading' ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {status === 'warn' ? statusMsg : 'No active comets.'}
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
