import * as React from 'react';
import {useState, useMemo} from 'react';
import {View, FlatList, Text, StyleSheet, Platform} from 'react-native';
import {Colors, SortKey} from '../utils/theme';
import {radecToAltAz} from '../utils/astronomy';
import {Toolbar} from '../components/Toolbar';
import {SortPanel} from '../components/SortPanel';
import {TargetCard} from '../components/TargetCard';
import type {useTargets} from '../hooks/useTargets';
import type {TargetWithAltAz} from '../utils/targets';

type TargetHook = ReturnType<typeof useTargets>;

interface Obs {
  lat: number;
  lon: number;
}

interface Props {
  obs: Obs;
  now: Date;
  altAzNow: Date;
  onToggleLocation: () => void;
  targetHook: TargetHook;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  minAlt: number | null;
  onMinAltChange: (v: number | null) => void;
  clsFilter: string | null;
  onClsFilterChange: (v: string | null) => void;
}

export function TransientsScreen({
  obs, now, altAzNow, onToggleLocation, targetHook,
  sortKey, onSortChange, minAlt, onMinAltChange, clsFilter, onClsFilterChange,
}: Props) {
  const {targets, status, statusMsg, lastUpdated, refreshing, refresh} = targetHook;
  const [showSort, setShowSort] = useState(false);

  const rows = useMemo<TargetWithAltAz[]>(() => {
    const computed = targets.map(t => ({
      ...t,
      ...radecToAltAz(t.ra, t.dec, obs.lat, obs.lon, altAzNow),
    }));

    computed.sort((a, b) => {
      switch (sortKey) {
        case 'alt_desc':   return b.alt - a.alt;
        case 'az':         return a.az - b.az;
        case 'name':       return a.name.localeCompare(b.name);
        case 'mag':        return parseFloat(a.mag || '99') - parseFloat(b.mag || '99');
        case 'discovered': return (b.discovered || '').localeCompare(a.discovered || '');
        default:           return b.alt - a.alt;
      }
    });

    let result = minAlt !== null ? computed.filter(r => r.alt >= minAlt) : computed;
    if (clsFilter) {result = result.filter(r => r.cls.toUpperCase().includes(clsFilter));}
    return result;
  }, [targets, obs, altAzNow, sortKey, minAlt, clsFilter]);

  const availableClasses = useMemo(
    () => Array.from(new Set(targets.map(t => t.cls.toUpperCase()).filter(Boolean))),
    [targets],
  );

  return (
    <>
      <Toolbar
        status={status}
        statusMsg={statusMsg}
        minAlt={minAlt}
        clsFilter={clsFilter}
        availableClasses={availableClasses}
        visibleCount={rows.length}
        totalCount={targets.length}
        onRefresh={refresh}
        onToggleSort={() => setShowSort(v => !v)}
        onToggleLocation={onToggleLocation}
        onMinAltChange={onMinAltChange}
        onClsFilterChange={onClsFilterChange}
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
        renderItem={({item}) => <TargetCard target={item} />}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Loading targets…</Text>
          </View>
        }
        ListFooterComponent={
          <Text style={styles.footer}>
            alerts.unistellaroptics.com
            {lastUpdated ? (() => {
              const s = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
              const h = Math.floor(s / 3600);
              const m = Math.floor((s % 3600) / 60);
              const sec = s % 60;
              const parts: string[] = [];
              if (h > 0) {parts.push(`${h}h`);}
              if (h > 0 || m > 0) {parts.push(`${m}m`);}
              parts.push(`${sec}s`);
              return `\nRefreshed ${parts.join(' ')} ago`;
            })() : ''}
          </Text>
        }
      />
    </>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  list: {paddingBottom: 40, paddingTop: 4},
  empty: {alignItems: 'center', paddingTop: 80},
  emptyText: {color: Colors.muted, fontFamily: MONO, fontSize: 13},
  footer: {
    textAlign: 'center',
    color: Colors.muted,
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.5,
    marginTop: 24,
    paddingHorizontal: 20,
  },
});
