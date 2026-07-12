import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage.js'
import { STORAGE_KEYS } from '../lib/storage.js'

export function useTheme() {
  const [theme, setTheme] = useLocalStorage(STORAGE_KEYS.THEME, 'dark')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))

  return { theme, toggleTheme }
}
