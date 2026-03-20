import * as React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {Colors, ClassColors} from '../utils/theme';
import type {FetchStatus} from '../hooks/useTargets';

const DETENTS = [0, 10, 20, 30, 45, 60];
const CLASSES = Object.keys(ClassColors);

interface Props {
  status: FetchStatus;
  statusMsg: string;
  minAlt: number | null;
  visibleCount: number;
  totalCount: number;
  itemLabel?: string;
  onRefresh: () => void;
  onToggleSort: () => void;
  onToggleLocation: () => void;
  onMinAltChange: (v: number | null) => void;
  // Optional — omit to hide the class filter row
  clsFilter?: string | null;
  availableClasses?: string[];
  onClsFilterChange?: (v: string | null) => void;
}

export function Toolbar({
  status,
  statusMsg,
  minAlt,
  clsFilter,
  availableClasses,
  visibleCount,
  totalCount,
  itemLabel = 'targets',
  onRefresh,
  onToggleSort,
  onToggleLocation,
  onMinAltChange,
  onClsFilterChange,
}: Props) {
  const statusColor = {
    ok:      Colors.accent,
    warn:    Colors.warn,
    error:   Colors.danger,
    loading: Colors.accent2,
    idle:    Colors.muted,
  }[status];

  return (
    <View>
      <View style={styles.toolbar}>
        <ToolBtn onPress={onRefresh}>
          {status === 'loading' ? (
            <ActivityIndicator size="small" color={Colors.bg} />
          ) : (
            <Text style={[styles.toolText]}>↻ Refresh</Text>
          )}
        </ToolBtn>
        <ToolBtn onPress={onToggleSort}>
          <Text style={styles.toolText}>⇅ Sort</Text>
        </ToolBtn>
        <ToolBtn onPress={onToggleLocation}>
          <Text style={styles.toolText}>⌖ Location</Text>
        </ToolBtn>
      </View>

      <View style={styles.altRow}>
        <Text style={styles.altLabel}>Alt</Text>
        <TouchableOpacity
          style={[styles.detent, minAlt === null && styles.detentActive]}
          onPress={() => onMinAltChange(null)}>
          <Text style={[styles.detentText, minAlt === null && styles.detentTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {DETENTS.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.detent, minAlt === d && styles.detentActive]}
            onPress={() => onMinAltChange(d)}>
            <Text style={[styles.detentText, minAlt === d && styles.detentTextActive]}>
              {'>'}{d}°
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {availableClasses && onClsFilterChange && (
        <View style={styles.altRow}>
          <Text style={styles.altLabel}>Type</Text>
          <TouchableOpacity
            style={[styles.detent, clsFilter === null && styles.detentActive]}
            onPress={() => onClsFilterChange(null)}>
            <Text style={[styles.detentText, clsFilter === null && styles.detentTextActive]}>All</Text>
          </TouchableOpacity>
          {CLASSES.filter(cls => availableClasses.includes(cls)).map(cls => {
            const color = ClassColors[cls];
            const active = clsFilter === cls;
            return (
              <TouchableOpacity
                key={cls}
                style={[styles.detent, {borderColor: color + '66'}, active && {backgroundColor: color, borderColor: color}]}
                onPress={() => onClsFilterChange(active ? null : cls)}>
                <Text style={[styles.detentText, {color}, active && {color: Colors.bg, fontWeight: '700'}]}>
                  {cls}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={[styles.statusBar, {borderColor: statusColor + '44'}]}>
        <View style={[styles.statusDot, {backgroundColor: statusColor}]} />
        <Text style={[styles.statusText, {color: statusColor}]} numberOfLines={1}>
          {status === 'ok' || status === 'warn'
            ? `Showing ${visibleCount} / ${totalCount} ${itemLabel}.`
            : statusMsg}
        </Text>
      </View>
    </View>
  );
}

function ToolBtn({
  children,
  onPress,
  accent,
}: React.PropsWithChildren<{
  onPress: () => void;
  accent?: boolean;
}>) {
  return (
    <TouchableOpacity
      style={[styles.toolBtn, accent && styles.toolBtnAccent]}
      onPress={onPress}
      activeOpacity={0.7}>
      {children}
    </TouchableOpacity>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnAccent: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  toolText: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  altLabel: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.muted,
    marginRight: 2,
  },
  detent: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  detentActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  detentText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.dim,
  },
  detentTextActive: {
    color: Colors.bg,
    fontWeight: '700',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 1,
    letterSpacing: 0.3,
  },
});
