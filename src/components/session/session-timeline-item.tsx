import { GripVertical, MessageSquareText, Paperclip, StickyNote } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Attachment, Note, TagTemplate, TranscriptItem } from '@/types/domain'
import { formatTime, getInitials } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { TagPicker } from '@/components/session/tag-picker'

type SessionTimelineEntry =
  | { id: string; type: 'transcript'; occurredAt: string; item: TranscriptItem }
  | { id: string; type: 'note'; occurredAt: string; item: Note }
  | { id: string; type: 'attachment'; occurredAt: string; item: Attachment }

interface SessionTimelineItemProps {
  entry: SessionTimelineEntry
  tags: TagTemplate[]
  onUpdateTranscript: (itemId: string, text: string) => void
  onUpdateNote: (noteId: string, content: string) => void
  onToggleTag: (itemType: 'transcript' | 'note', itemId: string, tagId: string) => void
  onDragStart: (entryId: string) => void
  onDragEnd: () => void
}

function useAttachmentUrl(attachment: Attachment) {
  const previewUrl = attachment.previewUrl
  const blob = attachment.blob
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob || previewUrl) {
      return
    }

    const objectUrl = URL.createObjectURL(blob)
    setBlobUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [blob, previewUrl])

  return previewUrl ?? blobUrl
}

function AttachmentTimelineItem({
  attachment,
  entryId,
  timestamp,
  onDragStart,
  onDragEnd
}: {
  attachment: Attachment
  entryId: string
  timestamp: string
  onDragStart: (entryId: string) => void
  onDragEnd: () => void
}) {
  const attachmentUrl = useAttachmentUrl(attachment)

  return (
    <article
      draggable
      onDragStart={() => onDragStart(entryId)}
      onDragEnd={onDragEnd}
      className="group flex gap-4 rounded-[1.75rem] bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
    >
      <button type="button" className="mt-1 text-muted-foreground/70 transition-colors hover:text-foreground">
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-surface-subtle text-muted-foreground">
              <Paperclip className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">{timestamp}</p>
            </div>
          </div>
          <Badge variant="outline">{attachment.kind.toUpperCase()}</Badge>
        </div>

        {attachment.kind === 'image' && attachmentUrl ? (
          <div className="overflow-hidden rounded-[1.5rem] bg-surface-subtle">
            <img src={attachmentUrl} alt={attachment.name} className="h-64 w-full object-cover" />
          </div>
        ) : (
          <div className="rounded-[1.5rem] bg-surface-subtle px-5 py-6">
            <p className="text-sm font-medium text-foreground">{attachment.name}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {attachment.kind === 'pdf'
                ? 'PDF attached to the session timeline. Preview is deferred until the document panel is implemented.'
                : 'Attachment captured in the local session store.'}
            </p>
          </div>
        )}
      </div>
    </article>
  )
}

export function SessionTimelineItem({
  entry,
  tags,
  onUpdateTranscript,
  onUpdateNote,
  onToggleTag,
  onDragStart,
  onDragEnd
}: SessionTimelineItemProps) {
  const timestamp = formatTime(entry.occurredAt)

  if (entry.type === 'attachment') {
    return (
      <AttachmentTimelineItem
        attachment={entry.item}
        entryId={entry.id}
        timestamp={timestamp}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    )
  }

  if (entry.type === 'note') {
    const note = entry.item

    return (
      <article
        draggable
        onDragStart={() => onDragStart(entry.id)}
        onDragEnd={onDragEnd}
        className="group flex gap-4 rounded-[1.75rem] bg-[#fff6ef] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]"
      >
        <button type="button" className="mt-1 text-muted-foreground/70 transition-colors hover:text-foreground">
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#ffe5d0] text-[#b45309]">
                <StickyNote className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{note.title}</p>
                <p className="text-xs text-muted-foreground">{timestamp}</p>
              </div>
            </div>
            <TagPicker
              tags={tags}
              selectedTagIds={note.tagIds}
              onToggleTag={(tagId) => onToggleTag('note', note.id, tagId)}
            />
          </div>
          <Textarea
            value={note.content}
            onChange={(event) => onUpdateNote(note.id, event.target.value)}
            className="min-h-24 border-0 bg-white/70"
            placeholder="Write a manual note..."
          />
        </div>
      </article>
    )
  }

  const transcript = entry.item
  const selectedTags = tags.filter((tag) => transcript.tagIds.includes(tag.id))

  return (
    <article
      draggable
      onDragStart={() => onDragStart(entry.id)}
      onDragEnd={onDragEnd}
      className="group flex gap-4"
    >
      <button type="button" className="mt-5 text-muted-foreground/70 transition-colors hover:text-foreground">
        <GripVertical className="size-4" />
      </button>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-surface-subtle text-xs font-semibold text-accent">
        {getInitials(transcript.speakerLabel ?? 'QS')}
      </div>
      <div className="flex-1">
        <div className="rounded-[1.75rem] rounded-tl-sm bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {transcript.speakerLabel ?? 'Transcript'}
              </p>
              <p className="text-xs text-muted-foreground">{timestamp}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedTags.map((tag) => (
                <Badge key={tag.id}>{`${tag.emoji} ${tag.name}`}</Badge>
              ))}
              <TagPicker
                tags={tags}
                selectedTagIds={transcript.tagIds}
                onToggleTag={(tagId) => onToggleTag('transcript', transcript.id, tagId)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3">
            <MessageSquareText className="mt-1 size-4 text-muted-foreground" />
            <Textarea
              value={transcript.text}
              onChange={(event) => onUpdateTranscript(transcript.id, event.target.value)}
              className="min-h-24 border-0 bg-surface-subtle/70"
            />
          </div>
        </div>
      </div>
    </article>
  )
}
