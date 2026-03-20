export const Colors = {
  bg:      '#05070f',
  surface: '#0c1020',
  border:  '#1a2240',
  accent:  '#3ef0c0',
  accent2: '#7b8fff',
  danger:  '#ff4d6d',
  warn:    '#f5a623',
  text:    '#e2eaff',
  muted:   '#a0b0d0',
  dim:     '#7a8aaa',
};

export const ClassColors: Record<string, string> = {
  SN:    '#ff9632',
  GRB:   '#ff4d6d',
  CV:    '#7b8fff',
  VS:    '#3ef0c0',
  AGN:   '#c46dff',
  COMET: '#3dd6f5',
};

export function getClassColor(cls: string): string {
  const upper = (cls || '').toUpperCase();
  for (const key of Object.keys(ClassColors)) {
    if (upper.includes(key)) {return ClassColors[key];}
  }
  return Colors.muted;
}

export type SortKey =
  | 'alt_desc'
  | 'az'
  | 'name'
  | 'mag'
  | 'discovered';

export const SORT_OPTIONS: {key: SortKey; label: string}[] = [
  {key: 'alt_desc',   label: 'Altitude (highest first)'},
  {key: 'az',         label: 'Azimuth'},
  {key: 'name',       label: 'Name A–Z'},
  {key: 'mag',        label: 'Magnitude (brightest first)'},
  {key: 'discovered', label: 'Newest first'},
];
