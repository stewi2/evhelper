import * as React from 'react';
import {useState, useEffect} from 'react';
import {StyleSheet, View, Text, TouchableOpacity, Platform, ActivityIndicator, Modal, PermissionsAndroid} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import {Colors, SortKey} from './utils/theme';
import {useTargets} from './hooks/useTargets';
import {useComets} from './hooks/useComets';
import {useMovingTargets} from './hooks/useMovingTargets';
import {useCustomTargets} from './hooks/useCustomTargets';
import {useClock} from './hooks/useClock';
import {Header} from './components/Header';
import {TabBar} from './components/TabBar';
import {LocationPanel} from './components/LocationPanel';
import {TransientsScreen} from './screens/TransientsScreen';
import {CometsScreen} from './screens/CometsScreen';
import {MovingTargetsScreen} from './screens/MovingTargetsScreen';
import {CustomScreen} from './screens/CustomScreen';
import type {Tab} from './components/TabBar';

interface Obs {
  lat: number;
  lon: number;
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

export default function App() {
  const now = useClock(1000);
  const altAzNow = useClock(60000);
  const [obs, setObs] = useState<Obs | null>(null);
  const targetHook = useTargets();
  const cometHook = useComets(obs);
  const movingTargetsHook = useMovingTargets(obs);
  const customHook = useCustomTargets(obs);

  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('transients');
  const [showLocation, setShowLocation] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('alt_desc');
  const [minAlt, setMinAlt] = useState<number | null>(null);
  const [clsFilter, setClsFilter] = useState<string | null>(null);

  const toggleLocation = () => setShowLocation(v => !v);

  async function requestLocation() {
    setLocLoading(true);
    setLocError(null);

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'eVHelper needs your location to calculate altitude and azimuth for observation targets.',
          buttonPositive: 'Allow',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setLocError('Location permission denied. Please grant access in Settings.');
        setLocLoading(false);
        return;
      }
    } else {
      Geolocation.requestAuthorization();
    }

    Geolocation.getCurrentPosition(
      pos => {
        const lat = +pos.coords.latitude.toFixed(5);
        const lon = +pos.coords.longitude.toFixed(5);
        setObs({lat, lon});
        setLocLoading(false);
      },
      err => {
        setLocError(err.message);
        setLocLoading(false);
      },
      {enableHighAccuracy: false, timeout: 10000},
    );
  }

  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        const lat = +pos.coords.latitude.toFixed(5);
        const lon = +pos.coords.longitude.toFixed(5);
        setObs({lat, lon});
        setInitialCheckDone(true);
      },
      () => {
        setInitialCheckDone(true);
      },
      {enableHighAccuracy: false, timeout: 5000},
    );
  }, []);

  // Use a fallback location for rendering when obs is null (content hidden behind modal)
  const displayObs = obs ?? {lat: 0, lon: 0};

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      <Header now={now} />
      <TabBar
        active={activeTab}
        onChange={tab => { setActiveTab(tab); setShowLocation(false); }}
      />

      {showLocation && obs && (
        <LocationPanel
          obs={obs}
          onUpdate={newObs => { setObs(newObs); setShowLocation(false); }}
        />
      )}

      {activeTab === 'transients' && (
        <TransientsScreen
          obs={displayObs}
          now={now}
          altAzNow={altAzNow}
          onToggleLocation={toggleLocation}
          targetHook={targetHook}
          sortKey={sortKey}
          onSortChange={setSortKey}
          minAlt={minAlt}
          onMinAltChange={setMinAlt}
          clsFilter={clsFilter}
          onClsFilterChange={setClsFilter}
        />
      )}

      {activeTab === 'comets' && (
        <CometsScreen
          obs={displayObs}
          altAzNow={altAzNow}
          onToggleLocation={toggleLocation}
          cometHook={cometHook}
          sortKey={sortKey}
          onSortChange={setSortKey}
          minAlt={minAlt}
          onMinAltChange={setMinAlt}
        />
      )}

      {activeTab === 'moving' && (
        <MovingTargetsScreen
          obs={displayObs}
          altAzNow={altAzNow}
          onToggleLocation={toggleLocation}
          movingTargetsHook={movingTargetsHook}
          sortKey={sortKey}
          onSortChange={setSortKey}
          minAlt={minAlt}
          onMinAltChange={setMinAlt}
        />
      )}

      {activeTab === 'custom' && (
        <CustomScreen
          obs={displayObs}
          altAzNow={altAzNow}
          onToggleLocation={toggleLocation}
          customHook={customHook}
          sortKey={sortKey}
          onSortChange={setSortKey}
          minAlt={minAlt}
          onMinAltChange={setMinAlt}
        />
      )}

      <Modal
        visible={!obs && initialCheckDone}
        transparent
        animationType="fade"
        statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.locTitle}>LOCATION REQUIRED</Text>
            <Text style={styles.locDesc}>
              eVHelper needs your location to calculate altitude and azimuth for
              observation targets.
            </Text>
            {locLoading ? (
              <ActivityIndicator color={Colors.accent} size="large" style={styles.locSpinner} />
            ) : (
              <>
                {locError && (
                  <Text style={styles.locError}>{locError}</Text>
                )}
                <TouchableOpacity style={styles.locBtn} onPress={requestLocation} activeOpacity={0.8}>
                  <Text style={styles.locBtnText}>Grant Location Access</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  locTitle: {
    fontFamily: MONO,
    fontSize: 14,
    letterSpacing: 3,
    color: Colors.text,
    marginBottom: 16,
  },
  locDesc: {
    fontFamily: MONO,
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  locSpinner: {
    marginTop: 16,
  },
  locError: {
    fontFamily: MONO,
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 16,
  },
  locBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  locBtnText: {
    color: Colors.bg,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
