import { Download, X } from 'lucide-react'
import type { SessionExportFormat, SessionExportOptions } from '@/lib/export'
import { supportedExportFormats } from '@/lib/export'
import { Button } from '@/components/ui/button'

interface ExportModalProps {
  open: boolean
  format: SessionExportFormat
  options: SessionExportOptions
  isExporting: boolean
  onClose: () => void
  onFormatChange: (format: SessionExportFormat) => void
  onOptionChange: (key: keyof SessionExportOptions, value: boolean) => void
  onExport: () => void
}

const optionLabels: Record<keyof SessionExportOptions, string> = {
  includeTranscript: 'Include transcript',
  includeNotes: 'Include notes',
  includeOutputs: 'Include outputs',
  includeTimestamps: 'Include timestamps',
  includeMetadata: 'Include metadata',
  includeAttachmentReferences: 'Include attachment references'
}

export function ExportModal({
  open,
  format,
  options,
  isExporting,
  onClose,
  onFormatChange,
  onOptionChange,
  onExport
}: ExportModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Session export
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Download session package</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Generate a clean Markdown, HTML, or plain text export from the current local session.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Format
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {supportedExportFormats.map((supportedFormat) => (
                <button
                  key={supportedFormat}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    format === supportedFormat
                      ? 'bg-accent text-white'
                      : 'bg-surface-subtle text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => onFormatChange(supportedFormat)}
                >
                  {supportedFormat.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Include
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(optionLabels).map(([key, label]) => {
                const typedKey = key as keyof SessionExportOptions
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 rounded-[1.25rem] bg-surface-subtle px-4 py-3 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={options[typedKey]}
                      onChange={(event) => onOptionChange(typedKey, event.target.checked)}
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onExport} disabled={isExporting}>
            <Download data-icon="inline-start" />
            {isExporting ? 'Generating…' : `Export ${format.toUpperCase()}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
