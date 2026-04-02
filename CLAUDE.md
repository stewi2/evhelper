# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

eVHelper is a React Native mobile application (iOS/Android) that serves as a real-time altitude/azimuth calculator for Unistellar citizen science targets (transients and comets). It fetches live data from Unistellar's Science Site and computes ephemerides from JPL Horizons.

## Build & Run Commands

### Prerequisites
```bash
brew install node watchman
npm install
```

### iOS Setup
```bash
cd ios && pod install && cd ..
```

### Development
```bash
npm run ios    # iOS simulator/device
npm run android # Android emulator/device
```

### Release Builds
```bash
npm run ios -- --mode Release --no-packager
npm run android -- --mode release --no-packager
```

### Lint & Test
```bash
npm run lint
npm run test
```

## Architecture Overview

### Project Structure
```
src/
├── App.tsx                    # Root app component with state management
├── screens/
│   ├── TransientsScreen.tsx   # Transient targets list view
│   └── CometsScreen.tsx       # Comet targets list view
├── components/
│   ├── Header.tsx             # App header with UTC/local time
│   ├── TabBar.tsx             # Transients/Comets tab navigation
│   ├── Toolbar.tsx            # Filter toolbar (refresh, sort, location, altitude filter)
│   ├── SortPanel.tsx          # Sort options panel
│   ├── LocationPanel.tsx      # Observer location input (GPS/manual)
│   └── TargetCard.tsx         # Individual target card component
├── hooks/
│   ├── useTargets.ts          # Transient targets data hook
│   ├── useComets.ts           # Comet targets data hook
│   └── useClock.ts            # Periodic date ticker hook
├── utils/
│   ├── astronomy.ts           # RA/Dec to Alt/Az conversion, formatting
│   ├── targets.ts             # Transient data fetching from Unistellar
│   ├── comets.ts              # Comet data fetching + JPL Horizons API
│   └── theme.ts               # Colors, sort options, type definitions
```

### Key Data Flow

1. **App.tsx** is the root component managing:
   - Observer location (`obs`: lat/lon)
   - Active tab (`transients` | `comets`)
   - Sort key, altitude filter, class filter state
   - Clock ticks via `useClock` hook

2. **useTargets()** and **useComets()** hooks handle data fetching:
   - `useTargets`: Fetches from `https://alerts.unistellaroptics.com/transient/data/data.js`
   - `useComets`: Fetches from Unistellar API + JPL Horizons for ephemerides
   - Both return `{targets/comets, status, statusMsg, lastUpdated, refreshing, refresh}`

3. **astronomy.ts** provides core calculations:
   - `radecToAltAz()`: Converts RA/Dec to altitude/azimuth for observer location/time
   - `parseRA()`, `parseDec()`: Parse various coordinate formats
   - `formatRA()`, `formatDec()`: Format coordinates for display
   - `compassDir()`: Convert azimuth to compass direction (N, NE, E, etc.)
   - `altColor()`: Color-code altitude (red below horizon, green/blue above)

4. **Screens** render lists using:
   - `FlatList` with `TargetCard` components
   - Computed alt/az via `radecToAltAz()`
   - Sorting/filtering based on toolbar state

5. **Deep linking**: Targets have deeplinks that open the Unistellar app directly:
   - Transients: `unistellar://science/transient?...`
   - Comets: `unistellar://science/comet?...`

## iOS Configuration

- Bundle ID: `com.evhelper` (needs unique identifier)
- Requires location permission for alt/az calculations
- `LSApplicationQueriesSchemes` includes `unistellar` for deeplinks
- New Architecture enabled (`RCTNewArchEnabled`: true)

## Android Configuration

- Namespace: `com.evhelper`
- Min SDK: configured in `android/build.gradle`
- Compile SDK / Build Tools: 36 (Java 21 required per feedback memory)

## Development Notes

- The app uses React Native 0.84.1 with TypeScript
- No existing test files present - Jest configured but not used
- ESLint configured with React Native config
- No CLAUDE.md, Cursor rules, or Copilot rules previously existed
- All data fetching is done via HTTP fetch to Unistellar APIs
- JPL Horizons API has 15s timeout for ephemeris queries
