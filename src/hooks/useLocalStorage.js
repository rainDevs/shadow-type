import { useCallback, useState } from 'react';
import { loadJSON, saveJSON } from '../utils/storage.js';

// useState persisted to LocalStorage.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = loadJSON(key, undefined);
    return stored === undefined ? initialValue : stored;
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        saveJSON(key, resolved);
        return resolved;
      });
    },
    [key],
  );

  return [value, set];
}
