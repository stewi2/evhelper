import * as React from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {Colors} from '../utils/theme';

interface Props {
  now: Date;
}

export function Header({now}: Props) {
  const utc = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const local = now.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'});

  return (
    <View style={styles.header}>
      <Text style={styles.label}>UNISTELLAR CITIZEN SCIENCE</Text>
      <Text style={styles.title}>Target Tracker</Text>
      <Text style={styles.time}>{local}  ·  {utc}</Text>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  label: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.accent,
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  time: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.muted,
    marginTop: 5,
  },
});
