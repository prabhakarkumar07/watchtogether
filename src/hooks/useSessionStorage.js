import { useCallback, useState } from 'react'
import { readSession, writeSession } from '../lib/storage.js'

// Simple useState-like hook that transparently persists to sessionStorage.
export function useSessionStorage(key, initialValue, maxAgeMs = null) {
  const [value, setValue] = useState(() => readSession(key, initialValue))

  const setAndStore = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        writeSession(key, resolved, maxAgeMs)
        return resolved
      })
    },
    [key, maxAgeMs]
  )

  return [value, setAndStore]
}
