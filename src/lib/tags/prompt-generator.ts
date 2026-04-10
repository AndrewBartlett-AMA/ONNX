import type { SessionDetail } from '@/app/app-data-provider'
import { formatTime } from '@/lib/format'
import type { Note, TagTemplate, TranscriptItem } from '@/types/domain'

interface PromptContext {
  sessionDetail: SessionDetail
  tag: TagTemplate
  item: TranscriptItem | Note
  itemType: 'transcript' | 'note'
}

export function buildTagPrompt({ sessionDetail, tag, item, itemType }: PromptContext) {
  const speaker =
    itemType === 'transcript'
      ? (item as TranscriptItem).speakerLabel ?? 'Speaker'
      : (item as Note).title
  const sourceText =
    itemType === 'transcript' ? (item as TranscriptItem).text : (item as Note).content
  const prompt = [
    `Quiet Scribe tagged prompt`,
    `Tag: ${tag.emoji} ${tag.name}`,
    `Workspace: ${sessionDetail.workspace?.name ?? 'Unassigned'}`,
    `Project: ${sessionDetail.project?.name ?? 'Unassigned'}`,
    `Session: ${sessionDetail.session.title}`,
    `Participants: ${sessionDetail.session.participantNames.join(', ') || 'None'}`,
    `Timestamp: ${formatTime(item.occurredAt)}`,
    `Context speaker/title: ${speaker}`,
    '',
    'Instruction:',
    `Use the tagged excerpt below to produce a focused ${tag.name.toLowerCase()} note for this meeting.`,
    '',
    'Excerpt:',
    sourceText
  ].join('\n')

  return prompt
}
