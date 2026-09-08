import * as React from 'react';
import {useMemo} from 'react';
import {View, Text, StyleSheet, Platform} from 'react-native';
import {radecToAltAz, altColor, sunAltitude} from '../utils/astronomy';
import {Colors} from '../utils/theme';

interface Props {
  ra: number;
  dec: number;
  lat: number;
  lon: number;
  start: Date;
  minAlt?: number | null;
}

const HOURS = 24;
const STEPS_PER_HOUR = 2;
const CHART_HEIGHT = 96;
const HALF = CHART_HEIGHT / 2;
const GUTTER = 26;

const DAY_SHADE = 'rgba(255,255,255,0.09)';
const TWILIGHT_SHADE = 'rgba(255,255,255,0.035)';
const NIGHT_SHADE = 'transparent';

function hhmm(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function skyShade(sunAlt: number): string {
  if (sunAlt > 0) {return DAY_SHADE;}
  if (sunAlt > -18) {return TWILIGHT_SHADE;}
  return NIGHT_SHADE;
}

function altToY(alt: number): number {
  return HALF - (Math.max(-90, Math.min(90, alt)) / 90) * HALF;
}

export function AltitudeChart({ra, dec, lat, lon, start, minAlt}: Props) {
  const {samples, peak} = useMemo(() => {
    const pts: {alt: number; sunAlt: number; date: Date}[] = [];
    const stepMs = 3600000 / STEPS_PER_HOUR;
    for (let i = 0; i < HOURS * STEPS_PER_HOUR; i++) {
      const date = new Date(start.getTime() + i * stepMs);
      pts.push({
        alt: radecToAltAz(ra, dec, lat, lon, date).alt,
        sunAlt: sunAltitude(date, lat, lon),
        date,
      });
    }
    const best = pts.reduce((a, b) => (b.alt > a.alt ? b : a), pts[0]);
    return {samples: pts, peak: best};
  }, [ra, dec, lat, lon, start]);

  const ticks = [0, 6, 12, 18, 24].map(h =>
    h === 0 ? 'now' : hhmm(new Date(start.getTime() + h * 3600000)),
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>NEXT 24H</Text>
        <Text style={styles.peak}>
          peak{' '}
          <Text style={{color: altColor(peak.alt)}}>
            {peak.alt >= 0 ? '+' : ''}{peak.alt.toFixed(1)}°
          </Text>
          {' '}at {hhmm(peak.date)}
        </Text>
      </View>

      <View style={styles.chart}>
        <View style={styles.bands}>
          {samples.map((p, i) => (
            <View key={i} style={[styles.band, {backgroundColor: skyShade(p.sunAlt)}]} />
          ))}
        </View>

        <View style={[styles.gridLine, styles.gridTop]} />
        <View style={[styles.horizon, {top: HALF}]} />
        <View style={[styles.gridLine, {top: CHART_HEIGHT - 1}]} />

        {minAlt != null && (
          <View style={[styles.minAltLine, {top: altToY(minAlt)}]} />
        )}

        <View style={styles.bars}>
          {samples.map((p, i) => {
            const h = Math.min(HALF, (Math.abs(p.alt) / 90) * HALF);
            return (
              <View key={i} style={styles.col}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(1, h),
                      marginTop: p.alt >= 0 ? HALF - h : HALF,
                      backgroundColor: altColor(p.alt),
                      opacity: p.alt >= 0 ? 1 : 0.5,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        <Text style={[styles.axisLabel, styles.axisTop]}>+90°</Text>
        <Text style={[styles.axisLabel, {top: HALF - 6}]}>0°</Text>
        {minAlt != null && (
          <Text style={[styles.axisLabel, styles.minAltLabel, {top: altToY(minAlt) - 6}]}>
            {minAlt}°
          </Text>
        )}
      </View>

      <View style={styles.ticksRow}>
        {ticks.map((t, i) => (
          <Text key={i} style={styles.tick}>{t}</Text>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.swatch, {backgroundColor: DAY_SHADE}]} />
        <Text style={styles.legendText}>day</Text>
        <View style={[styles.swatch, {backgroundColor: TWILIGHT_SHADE}]} />
        <Text style={styles.legendText}>twilight</Text>
        <View style={[styles.swatch, styles.swatchNight]} />
        <Text style={styles.legendText}>night</Text>
      </View>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.muted,
  },
  peak: {
    fontFamily: MONO,
    fontSize: 11,
    color: Colors.dim,
  },
  chart: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  bands: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  band: {flex: 1},
  bars: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    alignItems: 'flex-start',
    paddingLeft: GUTTER,
  },
  col: {flex: 1, alignItems: 'center'},
  bar: {width: '65%', borderRadius: 1},
  horizon: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gridLine: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gridTop: {top: 0},
  minAltLine: {
    position: 'absolute',
    left: GUTTER,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.accent2 + '99',
  },
  axisTop: {top: -2},
  axisLabel: {
    position: 'absolute',
    left: 0,
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.muted,
  },
  minAltLabel: {color: Colors.accent2},
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginLeft: GUTTER,
  },
  tick: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.muted,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: GUTTER,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginLeft: 8,
    marginRight: 4,
  },
  swatchNight: {backgroundColor: NIGHT_SHADE},
  legendText: {
    fontFamily: MONO,
    fontSize: 9,
    color: Colors.muted,
  },
});
