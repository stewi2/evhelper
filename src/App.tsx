import * as React from 'react';
import {useState} from 'react';
import {StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {Colors, SortKey} from './utils/theme';
import {useTargets} from './hooks/useTargets';
import {useComets} from './hooks/useComets';
import {useClock} from './hooks/useClock';
import {Header} from './components/Header';
import {TabBar} from './components/TabBar';
import {LocationPanel} from './components/LocationPanel';
import {TransientsScreen} from './screens/TransientsScreen';
import {CometsScreen} from './screens/CometsScreen';
import type {Tab} from './components/TabBar';

interface Obs {
  lat: number;
  lon: number;
}

export default function App() {
  const now = useClock(1000);
  const altAzNow = useClock(60000);
  const targetHook = useTargets();
  const cometHook = useComets();

  const [obs, setObs] = useState<Obs>({lat: 35.807, lon: -78.677});
  const [activeTab, setActiveTab] = useState<Tab>('transients');
  const [showLocation, setShowLocation] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('alt_desc');
  const [minAlt, setMinAlt] = useState<number | null>(null);
  const [clsFilter, setClsFilter] = useState<string | null>(null);

  const toggleLocation = () => setShowLocation(v => !v);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.root}>
      <Header now={now} />
      <TabBar
        active={activeTab}
        onChange={tab => { setActiveTab(tab); setShowLocation(false); }}
      />

      {showLocation && (
        <LocationPanel
          obs={obs}
          onUpdate={newObs => { setObs(newObs); setShowLocation(false); }}
        />
      )}

      {activeTab === 'transients' && (
        <TransientsScreen
          obs={obs}
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
          obs={obs}
          altAzNow={altAzNow}
          onToggleLocation={toggleLocation}
          cometHook={cometHook}
          sortKey={sortKey}
          onSortChange={setSortKey}
          minAlt={minAlt}
          onMinAltChange={setMinAlt}
        />
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},
});
