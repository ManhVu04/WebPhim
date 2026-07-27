import { useEffect, useRef } from 'react'

/**
 * Calls handler when a mousedown occurs outside the given element.
 * @param {import('react').RefObject<HTMLElement> | (() => HTMLElement | null)} target — ref object or getter function
 * @param {() => void} handler
 */
export function useClickOutside(target, handler) {
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    function handlePointerDown(event) {
      const el = typeof target === 'function' ? target() : target.current
      if (el && !el.contains(event.target)) {
        handlerRef.current()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [target])
}
