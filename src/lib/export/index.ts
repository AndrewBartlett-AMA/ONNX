import type { OutputFormat } from '@/types/domain'

export const supportedExportFormats: OutputFormat[] = ['txt', 'md', 'json', 'srt']

export function getExportMimeType(format: OutputFormat) {
  switch (format) {
    case 'txt':
      return 'text/plain;charset=utf-8'
    case 'md':
      return 'text/markdown;charset=utf-8'
    case 'json':
      return 'application/json;charset=utf-8'
    case 'srt':
      return 'application/x-subrip;charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

export function buildExportFilename(title: string, format: OutputFormat) {
  const safeTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  return `${safeTitle || 'quiet-scribe-session'}.${format}`
}
