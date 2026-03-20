import * as React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {Colors, SORT_OPTIONS, SortKey} from '../utils/theme';

interface Props {
  current: SortKey;
  onChange: (key: SortKey) => void;
}

export function SortPanel({current, onChange}: Props) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>SORT BY</Text>
      {SORT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.row, current === opt.key && styles.rowActive]}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}>
          <View style={[styles.radio, current === opt.key && styles.radioActive]}>
            {current === opt.key && <View style={styles.radioDot} />}
          </View>
          <Text style={[styles.label, current === opt.key && styles.labelActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  panel: {
    margin: 10,
    marginTop: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  title: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.muted,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: Colors.accent + '15',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  label: {
    fontFamily: MONO,
    fontSize: 14,
    color: Colors.dim,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
