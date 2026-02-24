'use client'

import { use, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTripContext } from '@/lib/trip-context'
import { TRANSPORT_LABELS } from '@/lib/types'
import { BottomNav } from '@/components/shared/bottom-nav'
import { ArrowLeft, Clock, Navigation as NavIcon, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const MapView = dynamic(
  () => import('@/components/navigation/map-view').then((mod) => mod.MapView),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-muted"><p className="text-sm text-muted-foreground">地図を読み込み中...</p></div> }
)

export default function NavigatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [activeIndex, setActiveIndex] = useState(0)

  const trip = getTrip(id)

  const allSpots = useMemo(
    () => (trip ? [...trip.spots].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day
      return a.time.localeCompare(b.time)
    }) : []),
    [trip]
  )

  const handleMarkerClick = useCallback(
    (spotId: string) => {
      const idx = allSpots.findIndex((s) => s.id === spotId)
      if (idx !== -1) setActiveIndex(idx)
    },
    [allSpots]
  )

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">旅行が見つかりません</p>
      </div>
    )
  }

  if (allSpots.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background pb-16">
        <p className="text-muted-foreground">スポットがまだありません</p>
        <Link href={`/trip/${id}/edit`} className="mt-2 text-sm text-primary hover:underline">
          旅程を編集する
        </Link>
        <BottomNav tripId={id} active="navigate" />
      </div>
    )
  }

  const activeSpot = allSpots[activeIndex]

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${activeSpot.lat},${activeSpot.lng}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Back Header */}
      <header className="absolute top-0 left-0 z-[1000] p-3">
        <Link
          href={`/trip/${id}/edit`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-card"
          aria-label="旅程に戻る"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </header>

      {/* Map */}
      <div className="relative flex-1">
        <MapView
          spots={allSpots}
          activeSpotId={activeSpot?.id ?? null}
          onMarkerClick={handleMarkerClick}
        />
      </div>

      {/* Spot Card */}
      <div className="border-t border-border bg-card px-4 pb-16 pt-4">
        <div className="mx-auto max-w-md">
          {/* Navigation arrows */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="前のスポット"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-xs text-muted-foreground">
              {activeIndex + 1} / {allSpots.length}
            </span>
            <button
              onClick={() => setActiveIndex(Math.min(allSpots.length - 1, activeIndex + 1))}
              disabled={activeIndex === allSpots.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="次のスポット"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Spot dots */}
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {allSpots.map((spot, idx) => (
              <button
                key={spot.id}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  idx === activeIndex ? 'w-4 bg-primary' : 'w-1.5 bg-border hover:bg-muted-foreground'
                )}
                aria-label={`${spot.name}を表示`}
              />
            ))}
          </div>

          {/* Active spot details */}
          <div className="flex gap-3">
            {activeSpot.image && (
              <img
                src={activeSpot.image}
                alt={activeSpot.name}
                className="h-16 w-20 shrink-0 rounded-lg object-cover"
                crossOrigin="anonymous"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  Day {activeSpot.day}
                </span>
                <Clock className="size-3" />
                <span>{activeSpot.time} - {activeSpot.endTime}</span>
              </div>
              <h3 className="mt-1 font-serif text-base font-bold text-foreground">{activeSpot.name}</h3>
              {activeSpot.notes && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{activeSpot.notes}</p>
              )}
              {activeSpot.distance > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {TRANSPORT_LABELS[activeSpot.transport]} {activeSpot.distance}km
                </p>
              )}
            </div>
          </div>

          {/* Google Maps Button */}
          <button
            onClick={openGoogleMaps}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <NavIcon className="size-4" />
            Google Maps でナビ開始
            <ExternalLink className="size-3" />
          </button>
        </div>
      </div>

      <BottomNav tripId={id} active="navigate" />
    </div>
  )
}
