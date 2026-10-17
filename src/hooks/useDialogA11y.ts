import { useEffect, useRef } from 'react'

export function useDialogA11y<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null

    const container = containerRef.current
    if (!container) return

    const getFocusable = () => {
      const selectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ]
      return Array.from(
        container.querySelectorAll<HTMLElement>(selectors.join(', '))
      ).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
    }

    const focusables = getFocusable()
    if (focusables.length > 0) {
      focusables[0].focus()
    } else {
      container.focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const currentFocusables = getFocusable()
      if (currentFocusables.length === 0) return

      const first = currentFocusables[0]
      const last = currentFocusables[currentFocusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first || !container.contains(document.activeElement)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last || !container.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus()
      }
    }
  }, [])

  return containerRef
}
