'use client'

import type { Trip, Spot } from '@/lib/types'
import { TRANSPORT_LABELS } from '@/lib/types'
import { useTripContext } from '@/lib/trip-context'
import { Clock, MapPin, Trash2, Car, Footprints, Train, Bus, Coffee } from 'lucide-react'

const transportIcons: Record<Spot['transport'], typeof Car> = {
  car: Car,
  walk: Footprints,
  train: Train,
  bus: Bus,
}

function TimelineBlock({ spot, tripId }: { spot: Spot; tripId: string }) {
  const { removeSpot } = useTripContext()
  const TransportIcon = transportIcons[spot.transport]

  return (
    <div className="relative flex gap-3 pb-6">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <MapPin className="size-4" />
        </div>
        <div className="mt-1 h-full w-px bg-border" />
      </div>

      <div className="min-w-0 flex-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3" />
              <span>{spot.time} - {spot.endTime}</span>
              {spot.distance > 0 && (
                <>
                  <span className="text-border">|</span>
                  <TransportIcon className="size-3" />
                  <span>{TRANSPORT_LABELS[spot.transport]} {spot.distance}km</span>
                </>
              )}
            </div>
            <h4 className="mt-1 font-serif text-sm font-bold text-foreground">{spot.name}</h4>
            {spot.notes && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{spot.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-1">
            {spot.image && (
              <img
                src={spot.image}
                alt={spot.name}
                className="h-12 w-16 rounded-md object-cover"
                crossOrigin="anonymous"
              />
            )}
            <button
              onClick={() => removeSpot(tripId, spot.id)}
              className="mt-1 flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`${spot.name}を削除`}
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FreeTimeBlock({
  startTime,
  endTime,
  onAddSpot,
}: {
  startTime: string
  endTime: string
  onAddSpot: () => void
}) {
  const start = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])
  const end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
  const diffMinutes = end - start
  if (diffMinutes <= 30) return null

  const hours = Math.floor(diffMinutes / 60)
  const mins = diffMinutes % 60
  const label = hours > 0 ? `${hours}時間${mins > 0 ? `${mins}分` : ''}` : `${mins}分`

  return (
    <div className="relative flex gap-3 pb-6">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-accent bg-background text-accent">
          <Coffee className="size-4" />
        </div>
        <div className="mt-1 h-full w-px bg-border" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-3">
          <p className="text-xs font-medium text-accent-foreground/70">
            {label}のフリータイム
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onAddSpot}
              className="flex-1 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              + スポット追加
            </button>
            <button className="flex-1 rounded-md bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent-foreground/70 transition-colors hover:bg-accent/30">
              周辺散策
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Timeline({
  trip,
  onAddSpotForDay,
}: {
  trip: Trip
  onAddSpotForDay: (day: number) => void
}) {
  const dayCount =
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1

  const days = Array.from({ length: dayCount }, (_, i) => i + 1)

  return (
    <div className="flex flex-col gap-6">
      {days.map((day) => {
        const daySpots = trip.spots
          .filter((s) => s.day === day)
          .sort((a, b) => a.time.localeCompare(b.time))

        const startDate = new Date(trip.startDate)
        startDate.setDate(startDate.getDate() + day - 1)
        const dateStr = `${startDate.getMonth() + 1}/${startDate.getDate()}`
        const weekDays = ['日', '月', '火', '水', '木', '金', '土']
        const weekDay = weekDays[startDate.getDay()]

        return (
          <section key={day}>
            <div className="mb-3 flex items-baseline gap-2">
              <h3 className="font-serif text-base font-bold text-foreground">
                Day {day}
              </h3>
              <span className="text-xs text-muted-foreground">
                {dateStr}（{weekDay}）
              </span>
            </div>

            {daySpots.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  まだスポットがありません
                </p>
                <button
                  onClick={() => onAddSpotForDay(day)}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  + 最初のスポットを追加
                </button>
              </div>
            ) : (
              <div>
                {daySpots.map((spot, idx) => (
                  <div key={spot.id}>
                    <TimelineBlock spot={spot} tripId={trip.id} />
                    {idx < daySpots.length - 1 && (
                      <FreeTimeBlock
                        startTime={spot.endTime}
                        endTime={daySpots[idx + 1].time}
                        onAddSpot={() => onAddSpotForDay(day)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
