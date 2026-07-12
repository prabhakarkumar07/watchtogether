import { useCallback, useState } from 'react'
import { readStorage, writeStorage } from '../lib/storage.js'

// Simple useState-like hook that transparently persists to localStorage.
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage(key, initialValue))

  const setAndStore = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        writeStorage(key, resolved)
        return resolved
      })
    },
    [key]
  )

  return [value, setAndStore]
}
