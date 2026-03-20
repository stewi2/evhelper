import * as React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import {Colors} from '../utils/theme';

export type Tab = 'transients' | 'comets';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: {key: Tab; label: string}[] = [
  {key: 'transients', label: 'TRANSIENTS'},
  {key: 'comets',     label: 'COMETS'},
];

export function TabBar({active, onChange}: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={styles.tab}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.7}>
          <Text style={[styles.label, active === tab.key && styles.labelActive]}>
            {tab.label}
          </Text>
          {active === tab.key && <View style={styles.underline} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
  },
  label: {
    fontFamily: MONO,
    fontSize: 12,
    letterSpacing: 2,
    color: Colors.muted,
  },
  labelActive: {
    color: Colors.accent,
    fontWeight: '700',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.accent,
  },
});
