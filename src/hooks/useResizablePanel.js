import { useState, useEffect, useCallback, useRef } from 'react'

export function useResizablePanel({ defaultWidth, minWidth, maxWidth, storageKey, side }) {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? parseInt(saved, 10) : defaultWidth
  })

  useEffect(() => {
    localStorage.setItem(storageKey, width)
  }, [width, storageKey])

  const startResizing = useCallback((e) => {
    e.preventDefault()
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (mouseEvent) => {
      let newWidth
      if (side === 'left') {
        newWidth = mouseEvent.clientX
      } else {
        newWidth = window.innerWidth - mouseEvent.clientX
      }
      setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth))
    }

    const handleMouseUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [minWidth, maxWidth, side])

  // Cleanup listeners if component unmounts while resizing
  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [])

  return { width, startResizing }
}
