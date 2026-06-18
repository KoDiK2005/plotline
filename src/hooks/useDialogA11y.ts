import { useEffect, useRef } from 'react'

/**
 * Wires up baseline modal accessibility for a fixed-overlay dialog: moves
 * focus into the dialog on mount, restores it to the previously focused
 * element on unmount, and closes on Escape. Attach the returned ref to the
 * dialog's outer element (with `tabIndex={-1}`).
 */
export function useDialogA11y(onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => {
      previouslyFocused?.focus()
    }
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return dialogRef
}
