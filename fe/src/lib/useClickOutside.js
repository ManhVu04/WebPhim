import { useEffect } from 'react'

/**
 * Calls handler when a mousedown occurs outside the given element.
 * @param {import('react').RefObject<HTMLElement> | (() => HTMLElement | null)} target — ref object or getter function
 * @param {() => void} handler
 * @param {any[]} [deps=[]] — additional deps for the effect
 */
export function useClickOutside(target, handler, deps = []) {
  useEffect(() => {
    function handlePointerDown(event) {
      const el = typeof target === 'function' ? target() : target.current
      if (el && !el.contains(event.target)) {
        handler()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [handler, ...deps])
}
