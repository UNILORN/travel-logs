'use client'

import type { Trip } from '@/lib/types'
import { ArrowLeft, Calendar } from 'lucide-react'
import Link from 'next/link'

export function ItineraryHeader({ trip }: { trip: Trip }) {
  const dayCount =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1

  return (
    <div className="relative">
      <div className="relative h-48 overflow-hidden">
        <img
          src={trip.coverImage}
          alt={`${trip.destination}のカバー画像`}
          className="h-full w-full object-cover"
          crossOrigin="anonymous"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/30 to-foreground/10" />
      </div>

      <Link
        href="/"
        className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-sm transition-colors hover:bg-background"
        aria-label="本棚に戻る"
      >
        <ArrowLeft className="size-4" />
      </Link>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h1 className="font-serif text-2xl font-bold text-primary-foreground drop-shadow-md">
          {trip.title}
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-primary-foreground/80">
          <Calendar className="size-3.5" />
          <span>
            {trip.startDate.replace(/-/g, '.')} - {trip.endDate.replace(/-/g, '.')}
          </span>
          <span className="text-primary-foreground/60">|</span>
          <span>{dayCount}日間</span>
        </div>
      </div>
    </div>
  )
}
