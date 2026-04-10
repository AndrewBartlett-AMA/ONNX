import type { SessionDetail } from '@/app/app-data-provider'
import { formatSessionDate, formatTime } from '@/lib/format'
import type { Attachment, OutputFormat } from '@/types/domain'

export type SessionExportFormat = 'txt' | 'md' | 'html'

export interface SessionExportOptions {
  includeTranscript: boolean
  includeNotes: boolean
  includeOutputs: boolean
  includeTimestamps: boolean
  includeMetadata: boolean
  includeAttachmentReferences: boolean
}

export interface SessionExportPayload {
  content: string
  filename: string
  mimeType: string
  preview: string
}

export const supportedExportFormats: SessionExportFormat[] = ['md', 'html', 'txt']

export const defaultExportOptions: SessionExportOptions = {
  includeTranscript: true,
  includeNotes: true,
  includeOutputs: true,
  includeTimestamps: true,
  includeMetadata: true,
  includeAttachmentReferences: true
}

function sanitizeFilename(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getExportMimeType(format: SessionExportFormat) {
  switch (format) {
    case 'txt':
      return 'text/plain;charset=utf-8'
    case 'md':
      return 'text/markdown;charset=utf-8'
    case 'html':
      return 'text/html;charset=utf-8'
    default:
      return 'application/octet-stream'
  }
}

function buildExportFilename(title: string, format: SessionExportFormat) {
  return `${sanitizeFilename(title) || 'quiet-scribe-session'}.${format}`
}

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function previewText(text: string) {
  return text.length > 180 ? `${text.slice(0, 177)}...` : text
}

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}

async function resolveAttachmentHref(attachment: Attachment) {
  if (attachment.previewUrl) {
    return attachment.previewUrl
  }

  if (attachment.blob) {
    return blobToDataUrl(attachment.blob)
  }

  return undefined
}

async function buildAttachmentReferences(
  attachments: SessionDetail['attachments'],
  format: SessionExportFormat
) {
  const references = await Promise.all(
    attachments.map(async (attachment) => ({
      attachment,
      href: await resolveAttachmentHref(attachment)
    }))
  )

  if (format === 'md') {
    return references
      .map(({ attachment, href }) => {
        if (attachment.kind === 'image' && href) {
          return `- ${attachment.name}\n\n  ![${attachment.name}](${href})`
        }

        if (href) {
          return `- [${attachment.name}](${href})`
        }

        return `- ${attachment.name} (${attachment.kind})`
      })
      .join('\n')
  }

  if (format === 'html') {
    const items = references
      .map(({ attachment, href }) => {
        if (attachment.kind === 'image' && href) {
          return `<li><p><strong>${escapeHtml(attachment.name)}</strong></p><img src="${href}" alt="${escapeHtml(
            attachment.name
          )}" style="max-width:100%;border-radius:18px;margin-top:12px;" /></li>`
        }

        if (href) {
          return `<li><a href="${href}" target="_blank" rel="noreferrer">${escapeHtml(
            attachment.name
          )}</a> <span style="color:#667085;">(${attachment.kind})</span></li>`
        }

        return `<li>${escapeHtml(attachment.name)} <span style="color:#667085;">(${attachment.kind})</span></li>`
      })
      .join('')

    return `<ul style="display:grid;gap:16px;padding-left:18px;">${items}</ul>`
  }

  return references
    .map(({ attachment }) => `- ${attachment.name} (${attachment.kind})`)
    .join('\n')
}

function buildTranscriptText(detail: SessionDetail, includeTimestamps: boolean, format: SessionExportFormat) {
  if (format === 'html') {
    return detail.transcriptItems
      .map((item) => {
        const timestamp = includeTimestamps ? `<span style="color:#667085;">${formatTime(item.occurredAt)}</span>` : ''
        return `<div style="padding:16px 18px;border-radius:22px;background:#ffffff;margin-bottom:14px;box-shadow:0 10px 30px rgba(15,23,42,0.04);">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
            <strong>${escapeHtml(item.speakerLabel ?? 'Speaker')}</strong>
            ${timestamp}
          </div>
          <p style="margin:12px 0 0;line-height:1.7;">${escapeHtml(item.text)}</p>
        </div>`
      })
      .join('')
  }

  return detail.transcriptItems
    .map((item) => {
      const prefix = includeTimestamps ? `${item.speakerLabel ?? 'Speaker'} · ${formatTime(item.occurredAt)}` : item.speakerLabel ?? 'Speaker'
      return `${prefix}\n${item.text}`
    })
    .join('\n\n')
}

export async function buildSessionExport(
  detail: SessionDetail,
  format: SessionExportFormat,
  options: SessionExportOptions
): Promise<SessionExportPayload> {
  const { project, session, workspace } = detail
  const attachmentSection = options.includeAttachmentReferences
    ? await buildAttachmentReferences(detail.attachments, format)
    : ''

  if (format === 'md') {
    const sections = [
      `# ${session.title}`,
      options.includeMetadata
        ? [
            '## Metadata',
            `- Workspace: ${workspace?.name ?? 'Unassigned'}`,
            `- Project: ${project?.name ?? 'Unassigned'}`,
            `- Participants: ${session.participantNames.join(', ') || 'None'}`,
            `- Audio sources: ${session.audioSources.join(', ') || 'None'}`,
            `- Runtime: ${session.runtime.toUpperCase()}`,
            `- Model: ${session.modelId ?? 'None'}`,
            `- Updated: ${formatSessionDate(session.updatedAt)}`
          ].join('\n')
        : '',
      session.summary ? `## Summary\n${session.summary}` : '',
      session.taskList.length > 0
        ? ['## Tasks', ...session.taskList.map((task) => `- [${task.completed ? 'x' : ' '}] ${task.label}`)].join('\n')
        : '',
      options.includeNotes && detail.notes.length > 0
        ? [
            '## Notes',
            ...detail.notes.map((note) =>
              `- ${options.includeTimestamps ? `${formatTime(note.occurredAt)} · ` : ''}${note.title}: ${note.content || 'Empty'}`
            )
          ].join('\n')
        : '',
      options.includeOutputs && detail.outputs.length > 0
        ? [
            '## Outputs',
            ...detail.outputs.map((output) => `- ${output.name}${output.contentPreview ? ` — ${output.contentPreview}` : ''}`)
          ].join('\n')
        : '',
      options.includeTranscript ? `## Transcript\n${buildTranscriptText(detail, options.includeTimestamps, format)}` : '',
      options.includeAttachmentReferences && detail.attachments.length > 0 ? `## Attachments\n${attachmentSection}` : ''
    ].filter(Boolean)

    const content = sections.join('\n\n')
    return {
      content,
      filename: buildExportFilename(session.title, format),
      mimeType: getExportMimeType(format),
      preview: previewText(content)
    }
  }

  if (format === 'html') {
    const content = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(session.title)}</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; background: #f6f7f9; color: #0f1720; }
      main { max-width: 960px; margin: 0 auto; padding: 48px 24px 72px; }
      h1, h2, h3 { font-family: "Plus Jakarta Sans", Inter, Arial, sans-serif; }
      section { background: white; border-radius: 28px; padding: 24px; margin-top: 20px; box-shadow: 0 18px 48px rgba(15,23,42,0.06); }
      ul { line-height: 1.7; }
      .eyebrow { display: inline-flex; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #2563eb; font-weight: 700; }
      .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
      .muted { color: #667085; }
    </style>
  </head>
  <body>
    <main>
      <span class="eyebrow">Quiet Scribe Export</span>
      <h1>${escapeHtml(session.title)}</h1>
      ${session.summary ? `<p class="muted" style="font-size:18px;line-height:1.7;">${escapeHtml(session.summary)}</p>` : ''}
      ${
        options.includeMetadata
          ? `<section><h2>Metadata</h2><div class="meta-grid">
              <div><strong>Workspace</strong><div class="muted">${escapeHtml(workspace?.name ?? 'Unassigned')}</div></div>
              <div><strong>Project</strong><div class="muted">${escapeHtml(project?.name ?? 'Unassigned')}</div></div>
              <div><strong>Participants</strong><div class="muted">${escapeHtml(session.participantNames.join(', ') || 'None')}</div></div>
              <div><strong>Audio sources</strong><div class="muted">${escapeHtml(session.audioSources.join(', ') || 'None')}</div></div>
              <div><strong>Runtime</strong><div class="muted">${escapeHtml(session.runtime.toUpperCase())}</div></div>
              <div><strong>Updated</strong><div class="muted">${escapeHtml(formatSessionDate(session.updatedAt))}</div></div>
            </div></section>`
          : ''
      }
      ${
        session.taskList.length > 0
          ? `<section><h2>Tasks</h2><ul>${session.taskList
              .map((task) => `<li>${task.completed ? 'Completed' : 'Open'} — ${escapeHtml(task.label)}</li>`)
              .join('')}</ul></section>`
          : ''
      }
      ${
        options.includeNotes && detail.notes.length > 0
          ? `<section><h2>Notes</h2><ul>${detail.notes
              .map((note) => `<li><strong>${escapeHtml(note.title)}</strong>${options.includeTimestamps ? ` <span class="muted">${escapeHtml(formatTime(note.occurredAt))}</span>` : ''}<div style="margin-top:6px;">${escapeHtml(note.content || 'Empty')}</div></li>`)
              .join('')}</ul></section>`
          : ''
      }
      ${
        options.includeOutputs && detail.outputs.length > 0
          ? `<section><h2>Outputs</h2><ul>${detail.outputs
              .map((output) => `<li><strong>${escapeHtml(output.name)}</strong><div class="muted">${escapeHtml(output.contentPreview ?? output.content ?? 'Generated artifact')}</div></li>`)
              .join('')}</ul></section>`
          : ''
      }
      ${options.includeTranscript ? `<section><h2>Transcript</h2>${buildTranscriptText(detail, options.includeTimestamps, format)}</section>` : ''}
      ${
        options.includeAttachmentReferences && detail.attachments.length > 0
          ? `<section><h2>Attachments</h2>${attachmentSection}</section>`
          : ''
      }
    </main>
  </body>
</html>`

    return {
      content,
      filename: buildExportFilename(session.title, format),
      mimeType: getExportMimeType(format),
      preview: previewText(session.summary || session.title)
    }
  }

  const sections = [
    session.title,
    options.includeMetadata
      ? [
          `Workspace: ${workspace?.name ?? 'Unassigned'}`,
          `Project: ${project?.name ?? 'Unassigned'}`,
          `Participants: ${session.participantNames.join(', ') || 'None'}`,
          `Audio sources: ${session.audioSources.join(', ') || 'None'}`,
          `Runtime: ${session.runtime.toUpperCase()}`,
          `Updated: ${formatSessionDate(session.updatedAt)}`
        ].join('\n')
      : '',
    session.summary ? `Summary\n${session.summary}` : '',
    session.taskList.length > 0
      ? ['Tasks', ...session.taskList.map((task) => `- ${task.completed ? '[done]' : '[open]'} ${task.label}`)].join('\n')
      : '',
    options.includeNotes && detail.notes.length > 0
      ? [
          'Notes',
          ...detail.notes.map((note) =>
            `- ${options.includeTimestamps ? `${formatTime(note.occurredAt)} · ` : ''}${note.title}: ${note.content || 'Empty'}`
          )
        ].join('\n')
      : '',
    options.includeOutputs && detail.outputs.length > 0
      ? ['Outputs', ...detail.outputs.map((output) => `- ${output.name}: ${output.contentPreview ?? 'Generated artifact'}`)].join('\n')
      : '',
    options.includeTranscript ? `Transcript\n${buildTranscriptText(detail, options.includeTimestamps, format)}` : '',
    options.includeAttachmentReferences && detail.attachments.length > 0 ? `Attachments\n${attachmentSection}` : ''
  ].filter(Boolean)

  const content = sections.join('\n\n')
  return {
    content,
    filename: buildExportFilename(session.title, format),
    mimeType: getExportMimeType(format),
    preview: previewText(content)
  }
}

export function downloadExportFile(payload: SessionExportPayload) {
  const blob = new Blob([payload.content], { type: payload.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = payload.filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function toOutputFormat(format: SessionExportFormat): OutputFormat {
  return format
}
