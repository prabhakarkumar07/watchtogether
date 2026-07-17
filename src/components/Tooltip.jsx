import React, { useState, useRef, useEffect } from 'react'

export default function Tooltip({ children, content, position = 'top', className = '' }) {
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef(null)

  const show = () => {
    timerRef.current = setTimeout(() => setIsVisible(true), 300)
  }
  
  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!content) return children

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 px-2 py-1 text-[10px] font-medium text-white whitespace-nowrap bg-gray-900 border border-gray-700 rounded-md shadow-lg animate-float-in ${positionClasses[position]}`}>
          {content}
        </div>
      )}
    </div>
  )
}
