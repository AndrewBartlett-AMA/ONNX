import { useEffect, useState } from 'react'
import type { RuntimeSnapshot } from '@/types/transcription'
import { getRuntimeSnapshot } from '@/lib/transcription/runtime-registry'

export function useRuntimeStatus() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRuntimeSnapshot() {
      const nextSnapshot = await getRuntimeSnapshot()

      if (!cancelled) {
        setSnapshot(nextSnapshot)
      }
    }

    void loadRuntimeSnapshot()

    return () => {
      cancelled = true
    }
  }, [])

  return snapshot
}
