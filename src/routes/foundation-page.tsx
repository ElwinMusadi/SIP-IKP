const statusItems = [
  ["Frontend", "React, TypeScript, Vite, Tailwind CSS v4, shadcn/ui"],
  ["Quality", "Typecheck, ESLint, Prettier, Vitest"],
  ["Cloudflare", "Pages Functions, D1/R2 binding placeholders"],
  ["Belum diterapkan", "Auth, database schema, workflow klinis, storage operations"],
]

export function FoundationPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-primary">Status teknis</p>
        <h1 className="text-3xl font-semibold tracking-tight">Fondasi pengembangan</h1>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Halaman ini adalah smoke surface untuk routing, responsive layout, token semantik, dan
          komponen shadcn. Tidak ada business state.
        </p>
      </header>

      <dl className="overflow-hidden rounded-xl border bg-card">
        {statusItems.map(([term, detail]) => (
          <div
            className="grid gap-1 border-b p-5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-6"
            key={term}
          >
            <dt className="font-medium">{term}</dt>
            <dd className="text-muted-foreground">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
