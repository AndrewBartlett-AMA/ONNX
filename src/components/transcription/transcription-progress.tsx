interface TranscriptionProgressProps {
  label: string
  detail: string
  progress?: number
}

function clampProgress(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return undefined
  }

  return Math.min(100, Math.max(0, value))
}

export function TranscriptionProgress({
  label,
  detail,
  progress
}: TranscriptionProgressProps) {
  const normalizedProgress = clampProgress(progress)

  return (
    <div className="rounded-[1.4rem] bg-[#eef4ff] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{label}</p>
        <span className="text-sm font-semibold text-accent">
          {normalizedProgress !== undefined ? `${Math.round(normalizedProgress)}%` : 'Working'}
        </span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2563eb_0%,#60a5fa_100%)] transition-[width] duration-300"
          style={{ width: `${normalizedProgress ?? 24}%` }}
        />
      </div>

      <p className="mt-3 text-sm leading-6 text-accent/90">{detail}</p>
    </div>
  )
}
