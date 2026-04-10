import { useState } from 'react'
import { SmilePlus } from 'lucide-react'
import type { TagTemplate } from '@/types/domain'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TagPickerProps {
  tags: TagTemplate[]
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
}

export function TagPicker({ tags, selectedTagIds, onToggleTag }: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen((current) => !current)}>
        <SmilePlus data-icon="inline-start" />
        Tag
      </Button>

      {isOpen ? (
        <div className="absolute right-0 top-11 z-20 flex w-56 flex-col gap-2 rounded-3xl bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Quick tags
          </p>
          {tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id)

            return (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  'flex items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors',
                  isSelected ? 'bg-surface-subtle text-foreground' : 'text-muted-foreground hover:bg-surface-subtle'
                )}
                onClick={() => onToggleTag(tag.id)}
              >
                <span className="flex items-center gap-2">
                  <span>{tag.emoji}</span>
                  {tag.name}
                </span>
                {isSelected ? <span className="text-xs font-semibold">Added</span> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
