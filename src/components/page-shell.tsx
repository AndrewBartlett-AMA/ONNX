import type { PropsWithChildren } from 'react'

interface PageShellProps extends PropsWithChildren {
  title: string
  description: string
}

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <section className="flex flex-col gap-6">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Empty shell</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  )
}
