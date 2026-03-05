'use client'

import { useRef, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { Trip } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { NewTripDialog } from '@/components/bookshelf/new-trip-dialog'
import { Button } from '@/components/ui/button'
import { parseTripsFromJson, stringifyTrips } from '@/lib/trip-json'

function TripCover({ trip, onDelete }: { trip: Trip; onDelete: (trip: Trip) => void }) {
  const coverImageSrc = trip.coverImage.trim()
  const statusColor =
    trip.status === 'traveling'
      ? 'bg-chart-1 text-primary-foreground'
      : trip.status === 'planning'
        ? 'bg-accent text-accent-foreground'
        : 'bg-muted text-muted-foreground'

  return (
    <div className="relative">
      <Link href={`/trip/${trip.id}/edit`} className="group block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg shadow-md transition-transform duration-200 group-hover:scale-[1.02] group-hover:shadow-lg">
          {coverImageSrc ? (
            <img
              src={coverImageSrc}
              alt={`${trip.destination}の旅行カバー`}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-muted via-background to-muted" />
          )}
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
  const { trips, appendTrips, deleteTrip } = useTripContext()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const isPagesPrPreview = process.env.NEXT_PUBLIC_GITHUB_PAGES_PR_PREVIEW === '1'

  const planningTrips = trips.filter((t) => t.status !== 'archived')
  const archivedTrips = trips.filter((t) => t.status === 'archived')

  const handleDeleteTrip = (trip: Trip) => {
    const ok = window.confirm(
      `「${trip.title}」を本棚から削除しますか？\n関連データ（旅程・予算）も削除されます。`
    )
    if (!ok) return
    deleteTrip(trip.id)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div>
            <h1 className="font-serif text-xl font-bold text-foreground">たびログ</h1>
            <p className="text-xs text-muted-foreground">旅の本棚</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const importedTrips = parseTripsFromJson(text)
                  appendTrips(importedTrips)
                  window.alert(`JSONをインポートしました（${importedTrips.length}件を追加）。`)
                } catch (error) {
                  console.error(error)
                  window.alert('JSONのインポートに失敗しました。形式を確認してください。')
                } finally {
                  event.target.value = ''
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-8 px-2"
            >
              <Upload className="mr-1 size-3.5" />
              取込
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allTripsJson = stringifyTrips(trips)
                const blob = new Blob([allTripsJson], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                const date = new Date().toISOString().slice(0, 10)
                link.href = url
                link.download = `travel-plans-${date}.json`
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="h-8 px-2"
            >
              <Download className="mr-1 size-3.5" />
              全件保存
            </Button>
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
                <TripCover key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
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
                <TripCover key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
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
