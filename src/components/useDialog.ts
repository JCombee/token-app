import { useEffect, useRef } from 'react'

// Keeps a native <dialog> in sync with React state; the dialog's onClose reports dismissals back.
export function useDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return ref
}
