import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export function useRefreshOnFocus(fn: () => void) {
  useFocusEffect(
    useCallback(() => {
      fn();
    }, [])
  );
}
