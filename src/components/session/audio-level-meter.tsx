import { Badge } from '@/components/ui/badge'

interface AudioLevelMeterProps {
  active: boolean
  levels: number[]
  sourceLabel: string
}

export function AudioLevelMeter({
  active,
  levels,
  sourceLabel
}: AudioLevelMeterProps) {
  const peakLevel = levels.reduce((max, level) => Math.max(max, level), 0)
  const signalState = active ? (peakLevel > 0.12 ? 'Signal detected' : 'Listening') : 'Standby'

  return (
    <div className="rounded-[1.5rem] bg-surface-subtle p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Input monitor
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{sourceLabel}</p>
        </div>
        <Badge variant={active ? 'secondary' : 'outline'}>{signalState}</Badge>
      </div>

      <div className="mt-4 flex h-16 items-end gap-1.5">
        {levels.map((level, index) => (
          <span
            key={`${index}-${level.toFixed(3)}`}
            className="flex-1 rounded-full bg-[linear-gradient(180deg,#60a5fa_0%,#2563eb_100%)] transition-[height,opacity] duration-150"
            style={{
              height: `${Math.max(10, 10 + Math.round(level * 46))}px`,
              opacity: active ? 0.3 + level * 0.7 : 0.18
            }}
          />
        ))}
      </div>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {active
          ? 'Speak or play system audio and watch the bars move to confirm the app is hearing the source.'
          : 'Start a recording to monitor incoming audio before transcription finishes.'}
      </p>
    </div>
  )
}
