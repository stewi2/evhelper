import * as React from 'react';
import {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import type {TargetWithAltAz} from '../utils/targets';
import {compassDir, altColor, formatRA, formatDec} from '../utils/astronomy';
import {Colors, getClassColor} from '../utils/theme';

interface Props {
  target: TargetWithAltAz;
  onOpen?: () => Promise<void>;
}

export function TargetCard({target: r, onOpen}: Props) {
  const [opening, setOpening] = useState(false);
  const abv = r.alt >= 0;
  const ac = altColor(r.alt);
  const cc = getClassColor(r.cls);
  const pct = Math.max(0, Math.min(100, ((r.alt + 90) / 180) * 100));

  async function openDeeplink() {
    if (onOpen) {
      setOpening(true);
      try { await onOpen(); } finally { setOpening(false); }
      return;
    }
    if (!r.deeplink) {return;}
    const canOpen = await Linking.canOpenURL(r.deeplink);
    if (canOpen) {
      await Linking.openURL(r.deeplink);
    } else {
      Alert.alert(
        'Unistellar App Not Found',
        'Install the Unistellar app to open this target directly.',
      );
    }
  }

  return (
    <View style={[styles.card, r.priority && styles.cardPriority]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.dot, {backgroundColor: abv ? Colors.accent : Colors.danger, shadowColor: abv ? Colors.accent : 'transparent'}]} />
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            {r.priority && <Text style={styles.star}>★ </Text>}
            <Text style={styles.name}>{r.name}</Text>
            <View style={[styles.badge, {backgroundColor: cc + '22', borderColor: cc + '66'}]}>
              <Text style={[styles.badgeText, {color: cc}]}>
                {(r.cls || '??').toUpperCase()}
              </Text>
            </View>
          </View>
          {!!r.discovered && (
            <Text style={styles.disc}>Discovered {new Date(r.discovered).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}</Text>
          )}
        </View>
        {(!!r.deeplink || !!onOpen) && (
          <TouchableOpacity style={styles.openBtn} onPress={openDeeplink} activeOpacity={0.7} disabled={opening}>
            {opening
              ? <ActivityIndicator size="small" color={Colors.accent2} />
              : <Text style={styles.openBtnText}>▶ Open</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Altitude bar */}
      <View style={styles.altRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, {width: `${pct}%`, backgroundColor: ac}]} />
        </View>
        <Text style={[styles.altText, {color: ac}]}>
          {r.alt >= 0 ? '+' : ''}{r.alt.toFixed(1)}°
        </Text>
        <Text style={styles.azText}>
          {r.az.toFixed(1)}°{' '}
          <Text style={styles.azDir}>{compassDir(r.az)}</Text>
        </Text>
      </View>

      {/* Detail row */}
      <View style={styles.detailRow}>
        <DetailCell label="RA"   value={formatRA(r.ra)} />
        <DetailCell label="Dec"  value={formatDec(r.dec)} />
        <DetailCell label="Mag"  value={r.mag || '—'} />
        <DetailCell label="Exp"  value={r.exp || '—'} />
        <DetailCell label="Gain" value={r.gain || '—'} />
        <DetailCell label="Dur"  value={r.duration ? `${Math.round(Number(r.duration) / 60)}m` : '—'} />
      </View>
    </View>
  );
}

function DetailCell({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardPriority: {
    borderColor: Colors.accent + '55',
    backgroundColor: '#0e1828',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 5,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 0},
    elevation: 3,
  },
  nameBlock: {flex: 1},
  nameRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6},
  star: {color: Colors.accent, fontSize: 15, fontWeight: '700'},
  name: {fontSize: 18, fontWeight: '700', color: Colors.text, letterSpacing: -0.2, flexShrink: 1},
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '700',
  },
  disc: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.muted,
    marginTop: 3,
  },
  openBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent2 + '66',
    backgroundColor: Colors.accent2 + '15',
  },
  openBtnText: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.accent2,
    letterSpacing: 0.5,
  },
  altRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  altText: {
    fontFamily: MONO,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  azText: {
    fontFamily: MONO,
    fontSize: 14,
    color: Colors.dim,
    textAlign: 'right',
  },
  azDir: {
    color: Colors.accent,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  detailCell: {alignItems: 'center'},
  detailLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.muted,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.dim,
  },
});
