import * as React from 'react';
import {useState, useMemo} from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import {Colors, SortKey, getClassColor} from '../utils/theme';
import {radecToAltAz} from '../utils/astronomy';
import {searchHorizonsByName} from '../utils/horizonsSearch';
import type {HorizonsCandidate} from '../utils/horizonsSearch';
import {fetchFreshDeeplink} from '../utils/customTargets';
import type {CustomTarget} from '../utils/customTargets';
import type {useCustomTargets} from '../hooks/useCustomTargets';
import {TargetCard} from '../components/TargetCard';
import {SortPanel} from '../components/SortPanel';
import {Toolbar} from '../components/Toolbar';

interface Obs {
  lat: number;
  lon: number;
}

type CustomHook = ReturnType<typeof useCustomTargets>;

interface Props {
  obs: Obs;
  altAzNow: Date;
  onToggleLocation: () => void;
  customHook: CustomHook;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  minAlt: number | null;
  onMinAltChange: (v: number | null) => void;
}

export function CustomScreen({
  obs, altAzNow, onToggleLocation, customHook,
  sortKey, onSortChange, minAlt, onMinAltChange,
}: Props) {
  const {targets, entries, failed, status, statusMsg, refreshing, refresh, addEntry, removeEntry} = customHook;
  const [showSort, setShowSort] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<HorizonsCandidate[] | null>(null);
  const [addingCommand, setAddingCommand] = useState<string | null>(null);

  type CustomRow = CustomTarget & {alt: number; az: number};

  const rows = useMemo<CustomRow[]>(() => {
    const computed: CustomRow[] = targets.map(t => ({
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
  }, [targets, obs, altAzNow, sortKey, minAlt]);

  async function runSearch() {
    if (!query.trim()) {return;}
    setSearching(true);
    setSearchError(null);
    setCandidates(null);
    try {
      const {candidates: found, error} = await searchHorizonsByName(query);
      if (error) {setSearchError(error);}
      else if (found.length === 0) {setSearchError('No matches found.');}
      else {setCandidates(found);}
    } catch (err: any) {
      setSearchError(err?.message ?? 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(candidate: HorizonsCandidate) {
    setAddingCommand(candidate.command);
    try {
      await addEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        command: candidate.command,
        label: candidate.label,
        kind: candidate.kind,
      });
      setShowSearch(false);
      setQuery('');
      setCandidates(null);
      setSearchError(null);
    } finally {
      setAddingCommand(null);
    }
  }

  async function handleOpen(item: CustomRow) {
    const entry = entries.find(e => e.id === item.entryId);
    if (!entry) {return;}
    const deeplink = await fetchFreshDeeplink(entry, obs);
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
        totalCount={targets.length}
        itemLabel="custom objects"
        onRefresh={refresh}
        onToggleSort={() => setShowSort(v => !v)}
        onToggleLocation={onToggleLocation}
        onMinAltChange={onMinAltChange}
      />

      <View style={styles.searchToggleRow}>
        <TouchableOpacity
          style={styles.searchToggleBtn}
          onPress={() => setShowSearch(v => !v)}
          activeOpacity={0.7}>
          <Text style={styles.searchToggleText}>{showSearch ? '▲ Hide search' : '+ Add object'}</Text>
        </TouchableOpacity>
      </View>

      {showSearch && (
        <View style={styles.searchPanel}>
          <Text style={styles.searchTitle}>SEARCH JPL HORIZONS</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Ceres, Halley, Jupiter"
              placeholderTextColor={Colors.dim}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={runSearch} disabled={searching} activeOpacity={0.7}>
              {searching
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Text style={styles.searchBtnText}>Search</Text>}
            </TouchableOpacity>
          </View>

          {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}

          {candidates && candidates.map(c => {
            const kindColor = getClassColor(c.kind);
            const alreadyAdded = entries.some(e => e.command === c.command);
            return (
              <View key={c.command} style={styles.candidateRow}>
                <View style={[styles.kindBadge, {backgroundColor: kindColor + '22', borderColor: kindColor + '66'}]}>
                  <Text style={[styles.kindBadgeText, {color: kindColor}]}>{c.kind.replace('-', ' ')}</Text>
                </View>
                <Text style={styles.candidateLabel} numberOfLines={1}>{c.label}</Text>
                <TouchableOpacity
                  style={[styles.candidateAddBtn, alreadyAdded && styles.candidateAddedBtn]}
                  onPress={() => handleAdd(c)}
                  disabled={alreadyAdded || addingCommand === c.command}
                  activeOpacity={0.7}>
                  {addingCommand === c.command
                    ? <ActivityIndicator size="small" color={Colors.bg} />
                    : <Text style={[styles.candidateAddText, alreadyAdded && styles.candidateAddedText]}>
                        {alreadyAdded ? 'Added' : 'Add'}
                      </Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {showSort && (
        <SortPanel
          current={sortKey}
          onChange={key => { onSortChange(key); setShowSort(false); }}
        />
      )}

      {failed.length > 0 && (
        <View style={styles.failedPanel}>
          <Text style={styles.failedTitle}>NO DATA AVAILABLE</Text>
          {failed.map(entry => (
            <View key={entry.id} style={styles.failedRow}>
              <Text style={styles.failedLabel} numberOfLines={1}>{entry.label}</Text>
              <TouchableOpacity
                style={styles.failedRemoveBtn}
                onPress={() => removeEntry(entry.id)}
                activeOpacity={0.7}>
                <Text style={styles.failedRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={item => item.entryId}
        renderItem={({item}) => (
          <TargetCard target={item} onOpen={() => handleOpen(item)} onDelete={() => removeEntry(item.entryId)} />
        )}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          status !== 'loading' ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No custom objects yet. Tap "+ Add object" to search JPL Horizons.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  root: {flex: 1},
  list: {paddingBottom: 40, paddingTop: 4},
  empty: {alignItems: 'center', paddingTop: 80, paddingHorizontal: 32},
  emptyText: {color: Colors.muted, fontFamily: MONO, fontSize: 13, textAlign: 'center'},
  searchToggleRow: {
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  searchToggleBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent + '66',
    backgroundColor: Colors.accent + '15',
    paddingVertical: 9,
    alignItems: 'center',
  },
  searchToggleText: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.accent,
    letterSpacing: 0.3,
  },
  searchPanel: {
    margin: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  searchTitle: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.muted,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.text,
    fontFamily: MONO,
    fontSize: 14,
  },
  searchBtn: {
    borderRadius: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.bg,
    fontWeight: '700',
  },
  searchError: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.danger,
    marginTop: 10,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  kindBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  kindBadgeText: {
    fontFamily: MONO,
    fontSize: 9,
    letterSpacing: 0.5,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  candidateLabel: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.text,
  },
  candidateAddBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.accent2 + '66',
    backgroundColor: Colors.accent2 + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 52,
    alignItems: 'center',
  },
  candidateAddText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.accent2,
  },
  candidateAddedBtn: {
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  candidateAddedText: {
    color: Colors.muted,
  },
  failedPanel: {
    margin: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '66',
    backgroundColor: Colors.danger + '15',
  },
  failedTitle: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.danger,
    marginBottom: 10,
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
  },
  failedLabel: {
    flex: 1,
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.text,
  },
  failedRemoveBtn: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.danger + '66',
    backgroundColor: Colors.danger + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  failedRemoveText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.danger,
  },
});
