'use client'

import { useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { Trip } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Archive, Clipboard, MapPinned, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { NewTripDialog } from '@/components/bookshelf/new-trip-dialog'
import { TripClipboardDialog } from '@/components/bookshelf/trip-clipboard-dialog'
import { Button } from '@/components/ui/button'
import { buildTripPageHref } from '@/lib/trip-route'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function TripCover({
  trip,
  onDelete,
  onClipboard,
}: {
  trip: Trip
  onDelete: (trip: Trip) => void
  onClipboard: (trip: Trip) => void
}) {
  const coverImageSrc = trip.coverImage.trim()
  const statusColor =
    trip.status === 'traveling'
      ? 'bg-chart-1 text-primary-foreground shadow-lg shadow-chart-1/25'
      : trip.status === 'planning'
        ? 'bg-accent text-accent-foreground shadow-lg shadow-accent/25'
        : 'bg-muted text-foreground'

  return (
    <div className="relative">
      <Link href={buildTripPageHref(trip.id, 'edit')} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl">
          {coverImageSrc ? (
            <img
              src={coverImageSrc}
              alt={`${trip.destination}の旅行カバー`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-chart-4/25 via-card to-chart-2/25" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-transparent" />
          <div className="absolute left-3 top-3">
            <Badge className="border border-primary-foreground/35 bg-primary-foreground/25 text-[10px] text-primary-foreground backdrop-blur-sm">
              {trip.destination}
            </Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1.5 p-3">
            <Badge className={`${statusColor} w-fit border-0 text-[10px]`}>
              {STATUS_LABELS[trip.status]}
            </Badge>
            <h3 className="font-serif text-base font-bold leading-tight text-primary-foreground drop-shadow-sm line-clamp-2">
              {trip.title}
            </h3>
            <p className="text-xs text-primary-foreground/80">
              {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
            </p>
          </div>
        </div>
      </Link>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="absolute left-2 top-2 z-10 h-8 w-8 rounded-full bg-background/70 shadow-md backdrop-blur-sm"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClipboard(trip)
        }}
        aria-label={`${trip.title}のJSONを編集`}
      >
        <Clipboard className="size-4" />
      </Button>

      <Button
        type="button"
        size="icon"
        variant="destructive"
        className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full shadow-md"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onDelete(trip)
        }}
        aria-label={`${trip.title}を削除`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export default function BookshelfPage() {
  const { trips, deleteTrip } = useTripContext()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteTargetTrip, setDeleteTargetTrip] = useState<Trip | null>(null)
  const [clipboardTargetTrip, setClipboardTargetTrip] = useState<Trip | null>(null)
  const isPagesPrPreview = process.env.NEXT_PUBLIC_GITHUB_PAGES_PR_PREVIEW === '1'

  const planningTrips = trips.filter((t) => t.status !== 'archived')
  const archivedTrips = trips.filter((t) => t.status === 'archived')

  const handleDeleteTrip = (trip: Trip) => {
    setDeleteTargetTrip(trip)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-20 top-16 h-44 w-44 rounded-full bg-chart-4/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-28 h-52 w-52 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-[38rem] h-56 w-56 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <header className="sticky top-0 z-10 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3.5">
          <div className="space-y-0.5">
            <h1 className="font-serif text-xl font-bold text-foreground">たびログ</h1>
            <p className="text-xs text-muted-foreground">My Travel Bookshelf</p>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-md px-4 pb-24 pt-6">
        {isPagesPrPreview && (
          <div className="mb-4 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            PRプレビューでは GitHub Pages の静的配信制約により、新規旅作成とスポット検索を無効化しています。
          </div>
        )}

        {planningTrips.length > 0 && (
          <section className="rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-sm font-bold tracking-wider text-muted-foreground">
                計画中の旅
              </h2>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPinned className="size-3.5" />
                {planningTrips.length}件
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {planningTrips.map((trip) => (
                <TripCover key={trip.id} trip={trip} onDelete={handleDeleteTrip} onClipboard={setClipboardTargetTrip} />
              ))}
            </div>
          </section>
        )}

        {archivedTrips.length > 0 && (
          <section className="mt-5 rounded-3xl border border-border/70 bg-card/65 p-4 shadow-sm backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-sm font-bold tracking-wider text-muted-foreground">
                アーカイブ
              </h2>
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Archive className="size-3.5" />
                {archivedTrips.length}件
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {archivedTrips.map((trip) => (
                <TripCover key={trip.id} trip={trip} onDelete={handleDeleteTrip} onClipboard={setClipboardTargetTrip} />
              ))}
            </div>
          </section>
        )}

        {trips.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/80 bg-card/55 px-5 py-16 text-center shadow-sm">
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
        className={`fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary to-chart-1 text-primary-foreground shadow-xl shadow-primary/30 transition ${
          isPagesPrPreview
            ? 'cursor-not-allowed opacity-50'
            : 'hover:scale-105 hover:shadow-2xl hover:shadow-primary/35 active:scale-95'
        }`}
        aria-label="新しい旅を作成"
      >
        <Plus className="size-6" />
      </button>

      {!isPagesPrPreview && <NewTripDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
      {clipboardTargetTrip && (
        <TripClipboardDialog
          trip={clipboardTargetTrip}
          open={clipboardTargetTrip !== null}
          onOpenChange={(open) => {
            if (!open) setClipboardTargetTrip(null)
          }}
        />
      )}
      <AlertDialog
        open={deleteTargetTrip !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetTrip(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この旅を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetTrip
                ? `「${deleteTargetTrip.title}」を本棚から削除します。関連データ（旅程・予算）も削除されます。`
                : '関連データ（旅程・予算）も削除されます。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteTargetTrip) return
                deleteTrip(deleteTargetTrip.id)
                setDeleteTargetTrip(null)
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
