import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {Colors} from '../utils/theme';

interface Obs {
  lat: number;
  lon: number;
}

interface Props {
  obs: Obs;
  onUpdate: (obs: Obs) => void;
}

export function LocationPanel({obs, onUpdate}: Props) {
  const [latText, setLatText] = useState(String(obs.lat));
  const [lonText, setLonText] = useState(String(obs.lon));
  const [locMsg, setLocMsg] = useState('');

  function applyManual() {
    const lat = parseFloat(latText);
    const lon = parseFloat(lonText);
    if (isNaN(lat) || isNaN(lon)) {
      Alert.alert('Invalid coordinates', 'Please enter valid lat/lon values.');
      return;
    }
    onUpdate({lat, lon});
    setLocMsg(`✓ Set to ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }

  function geolocate() {
    setLocMsg('Requesting location…');
    Geolocation.requestAuthorization();
    Geolocation.getCurrentPosition(
      pos => {
        const lat = +pos.coords.latitude.toFixed(5);
        const lon = +pos.coords.longitude.toFixed(5);
        setLatText(String(lat));
        setLonText(String(lon));
        onUpdate({lat, lon});
        setLocMsg(`✓ ${lat.toFixed(4)}°, ${lon.toFixed(4)}°`);
      },
      err => {
        setLocMsg('Error: ' + err.message);
      },
      {enableHighAccuracy: false, timeout: 10000},
    );
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>OBSERVER LOCATION</Text>

      <TouchableOpacity style={styles.geoBtn} onPress={geolocate} activeOpacity={0.8}>
        <Text style={styles.geoBtnText}>📍 Use GPS Location</Text>
      </TouchableOpacity>

      {!!locMsg && <Text style={styles.locMsg}>{locMsg}</Text>}

      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>LATITUDE</Text>
          <TextInput
            style={styles.input}
            value={latText}
            onChangeText={setLatText}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={Colors.muted}
            returnKeyType="next"
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>LONGITUDE</Text>
          <TextInput
            style={styles.input}
            value={lonText}
            onChangeText={setLonText}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={Colors.muted}
            returnKeyType="done"
            onSubmitEditing={applyManual}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.applyBtn} onPress={applyManual} activeOpacity={0.8}>
        <Text style={styles.applyBtnText}>Apply Coordinates</Text>
      </TouchableOpacity>

      <Text style={styles.current}>
        Current: {obs.lat.toFixed(4)}°N, {obs.lon.toFixed(4)}°E
      </Text>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  panel: {
    margin: 10,
    marginTop: 6,
    padding: 16,
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
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  geoBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  geoBtnText: {
    color: Colors.bg,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  locMsg: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputWrap: {flex: 1},
  inputLabel: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.muted,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    fontFamily: MONO,
    fontSize: 15,
    padding: 12,
  },
  applyBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  applyBtnText: {
    fontFamily: MONO,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  current: {
    fontFamily: MONO,
    fontSize: 12,
    color: Colors.muted,
    textAlign: 'center',
  },
});
