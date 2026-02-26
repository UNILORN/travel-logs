'use client'

import { useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { Trip } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { NewTripDialog } from '@/components/bookshelf/new-trip-dialog'

function TripCover({ trip }: { trip: Trip }) {
  const statusColor =
    trip.status === 'traveling'
      ? 'bg-chart-1 text-primary-foreground'
      : trip.status === 'planning'
        ? 'bg-accent text-accent-foreground'
        : 'bg-muted text-muted-foreground'

  return (
    <Link href={`/trip/${trip.id}/edit`} className="group block">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-lg">
        <img
          src={trip.coverImage}
          alt={`${trip.destination}の旅行カバー`}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-3">
          <Badge className={`${statusColor} w-fit border-0 text-[10px]`}>
            {STATUS_LABELS[trip.status]}
          </Badge>
          <h3 className="font-serif text-base font-bold leading-tight text-primary-foreground drop-shadow-sm">
            {trip.title}
          </h3>
          <p className="text-xs text-primary-foreground/80">
            {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
          </p>
        </div>
      </div>
    </Link>
  )
}

export default function BookshelfPage() {
  const { trips } = useTripContext()
  const [dialogOpen, setDialogOpen] = useState(false)
  const isPagesPrPreview = process.env.NEXT_PUBLIC_GITHUB_PAGES_PR_PREVIEW === '1'

  const planningTrips = trips.filter((t) => t.status !== 'archived')
  const archivedTrips = trips.filter((t) => t.status === 'archived')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground">たびログ</h1>
            <p className="text-xs text-muted-foreground">旅の本棚</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-6">
        {isPagesPrPreview && (
          <div className="mb-4 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            PRプレビューでは GitHub Pages の静的配信制約により、新規旅作成とスポット検索を無効化しています。
          </div>
        )}

        {planningTrips.length > 0 && (
          <section>
            <h2 className="mb-3 font-serif text-sm font-bold text-muted-foreground tracking-wider">
              計画中の旅
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {planningTrips.map((trip) => (
                <TripCover key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}

        {archivedTrips.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-serif text-sm font-bold text-muted-foreground tracking-wider">
              アーカイブ
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {archivedTrips.map((trip) => (
                <TripCover key={trip.id} trip={trip} />
              ))}
            </div>
          </section>
        )}

        {trips.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="mb-2 font-serif text-lg text-muted-foreground">
              まだ旅の計画がありません
            </p>
            <p className="text-sm text-muted-foreground">
              下のボタンから新しい旅を始めましょう
            </p>
          </div>
        )}
      </main>

      <button
        onClick={() => {
          if (isPagesPrPreview) return
          setDialogOpen(true)
        }}
        disabled={isPagesPrPreview}
        className={`fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform ${
          isPagesPrPreview
            ? 'cursor-not-allowed opacity-50'
            : 'hover:scale-105 active:scale-95'
        }`}
        aria-label="新しい旅を作成"
      >
        <Plus className="size-6" />
      </button>

      {!isPagesPrPreview && <NewTripDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  )
}
