import {useRef, useState, useCallback} from 'react';
import {FlatList, LayoutAnimation, Platform, UIManager} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// Matches the LayoutAnimation duration so the card has finished growing before
// we scroll it into view.
const EXPAND_MS = 300;

export function useExpandedCard<T>() {
  const listRef = useRef<FlatList<T>>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggle = useCallback(
    (key: string, index: number) => {
      const next = expandedKey === key ? null : key;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedKey(next);
      if (next) {
        setTimeout(() => {
          listRef.current?.scrollToIndex({index, viewPosition: 0, animated: true});
        }, EXPAND_MS);
      }
    },
    [expandedKey],
  );

  return {listRef, expandedKey, toggle};
}
