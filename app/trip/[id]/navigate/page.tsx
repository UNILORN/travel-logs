'use client'

import { use, useState, useEffect, useCallback, useMemo, useRef, type TouchEvent } from 'react'
import dynamic from 'next/dynamic'
import type { NavigateMapEntry, NavigateRouteSegment } from '@/components/navigation/types'
import { formatDistanceKm, hasVisibleMove } from '@/components/navigation/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTripContext } from '@/lib/trip-context'
import { TRANSPORT_LABELS } from '@/lib/types'
import type { MoveNode } from '@/lib/types'
import { getTripTimelineNodes, isAreaNode, isMoveNode, isSpotNode } from '@/lib/timeline-nodes'
import { buildMovePathPoints } from '@/lib/move-path'
import { resolveTripIdFromSearch } from '@/lib/trip-id'
import { buildTripPageHref } from '@/lib/trip-route'
import { BottomNav } from '@/components/shared/bottom-nav'
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const MapView = dynamic(
  () => import('@/components/navigation/map-view').then((mod) => mod.MapView),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-muted"><p className="text-sm text-muted-foreground">地図を読み込み中...</p></div> }
)

const SWIPE_THRESHOLD_PX = 48
const SWIPE_DIRECTION_RATIO = 1.2

function formatCurrentTime(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function formatCurrentDate(date: Date) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date)
}

function createTripDateTime(baseDate: string, day: number, time: string) {
  const [year, month, date] = baseDate.split('-').map((v) => parseInt(v, 10))
  const [hour, minute] = time.split(':').map((v) => parseInt(v, 10))
  return new Date(year, month - 1, date + (day - 1), hour, minute, 0, 0)
}

function formatNodeTimeLabel(time: string, endTime: string) {
  return `${time} - ${endTime}`
}

function MoveDirectionBadge({
  move,
  directionLabel,
  accentClassName,
  titleClassName,
}: {
  move: MoveNode
  directionLabel: string
  accentClassName: string
  titleClassName?: string
}) {
  return (
    <span className="inline-flex h-11 w-full max-w-[13.5rem] min-w-0 box-border items-center gap-2 rounded-2xl border border-border bg-muted/70 px-2.5">
      <span className={cn('w-12 shrink-0 text-[11px] font-semibold leading-none', accentClassName)}>
        {directionLabel}
      </span>
      <span className="flex h-full min-w-0 flex-1 flex-col justify-center">
        <span className={cn('block truncate text-[11px] font-medium text-foreground', titleClassName)}>
          {move.name}
        </span>
        <span className="block truncate text-[10px] leading-none text-muted-foreground">
          {TRANSPORT_LABELS[move.transport]} {formatDistanceKm(move.distance)}
        </span>
      </span>
    </span>
  )
}

export default function NavigatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { getTrip } = useTripContext()
  const [tripId, setTripId] = useState(id)
  const isMobile = useIsMobile()
  const [activeIndex, setActiveIndex] = useState(0)
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date())
  const [isLocationMode, setIsLocationMode] = useState(false)
  const [currentLatLng, setCurrentLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    setTripId(resolveTripIdFromSearch(id, window.location.search))
  }, [id])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  // Geolocation watch for location mode
  useEffect(() => {
    if (!isLocationMode) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      setIsLocationMode(false)
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setIsLocationMode(false)
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [isLocationMode])

  const trip = getTrip(tripId)

  const timelineNodes = useMemo(() => (trip ? getTripTimelineNodes(trip) : []), [trip])

  const spotEntries = useMemo(() => {
    if (!trip) return [] as NavigateMapEntry[]

    const entries: NavigateMapEntry[] = []

    timelineNodes.forEach((node, index) => {
      if (!isSpotNode(node)) return
      const prevNode = timelineNodes[index - 1]
      const nextNode = timelineNodes[index + 1]
      const prevMove = prevNode && isMoveNode(prevNode) ? prevNode : undefined
      const nextMove = nextNode && isMoveNode(nextNode) ? nextNode : undefined
      const prevArea = prevNode && isAreaNode(prevNode) ? prevNode : undefined
      const nextArea = nextNode && isAreaNode(nextNode) ? nextNode : undefined

      entries.push({
        spot: node,
        prevMove,
        nextMove,
        prevArea,
        nextArea,
        sequence: entries.length + 1,
      })
    })

    return entries
  }, [timelineNodes, trip])

  const routeSegments = useMemo(() => {
    const segments: NavigateRouteSegment[] = []

    timelineNodes.forEach((node, index) => {
      if (!isMoveNode(node)) return

      const fromSpot = (() => {
        for (let i = index - 1; i >= 0; i -= 1) {
          const candidate = timelineNodes[i]
          if (isSpotNode(candidate)) return candidate
        }
        return undefined
      })()

      const toSpot = (() => {
        for (let i = index + 1; i < timelineNodes.length; i += 1) {
          const candidate = timelineNodes[i]
          if (isSpotNode(candidate)) return candidate
        }
        return undefined
      })()

      const points = buildMovePathPoints(node, {
        from: fromSpot ? { lat: fromSpot.lat, lng: fromSpot.lng } : undefined,
        to: toSpot ? { lat: toSpot.lat, lng: toSpot.lng } : undefined,
      })

      if (points.length < 2) return

      segments.push({
        id: node.id,
        move: node,
        points,
      })
    })

    return segments
  }, [timelineNodes])

  const allSpots = useMemo(() => spotEntries.map((entry) => entry.spot), [spotEntries])

  const toggleLocationMode = useCallback(() => {
    // When enabling location mode, focus the spot whose start time is just before now
    if (!isLocationMode && trip && allSpots.length > 0) {
      const nowTs = Date.now()
      let targetIndex = 0
      for (let i = 0; i < allSpots.length; i++) {
        const spot = allSpots[i]
        const startAt = createTripDateTime(trip.startDate, spot.day, spot.time)
        if (startAt.getTime() <= nowTs) {
          targetIndex = i
        } else {
          break
        }
      }
      setActiveIndex(targetIndex)
    }
    setIsLocationMode((prev) => !prev)
  }, [isLocationMode, trip, allSpots])

  const nowBasedInfo = useMemo(() => {
    if (!trip || timelineNodes.length === 0) {
      return { nextSpot: null, activeMove: null as MoveNode | null }
    }

    const nowTs = currentDateTime.getTime()

    const nextSpot =
      timelineNodes
        .filter(isSpotNode)
        .map((spot) => {
          const startAt = createTripDateTime(trip.startDate, spot.day, spot.time)
          return { spot, startAt }
        })
        .find((entry) => entry.startAt.getTime() >= nowTs)?.spot ??
      timelineNodes.filter(isSpotNode).at(-1) ??
      null

    const activeMove =
      timelineNodes
        .filter(isMoveNode)
        .find((move) => {
          const startAt = createTripDateTime(trip.startDate, move.day, move.time).getTime()
          const endAt = createTripDateTime(trip.startDate, move.day, move.endTime).getTime()
          return nowTs >= startAt && nowTs <= endAt
        }) ?? null

    return { nextSpot, activeMove }
  }, [currentDateTime, timelineNodes, trip])

  const handleMarkerClick = useCallback(
    (spotId: string) => {
      const idx = allSpots.findIndex((s) => s.id === spotId)
      if (idx !== -1) {
        setIsLocationMode(false)
        setActiveIndex(idx)
      }
    },
    [allSpots]
  )
  const goPrev = useCallback(() => {
    setIsLocationMode(false)
    setActiveIndex((current) => Math.max(0, current - 1))
  }, [])
  const goNext = useCallback(() => {
    setIsLocationMode(false)
    setActiveIndex((current) => Math.min(Math.max(0, allSpots.length - 1), current + 1))
  }, [allSpots.length])
  const handleCardTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!isMobile || event.touches.length !== 1) return

      const touch = event.touches[0]
      swipeStartRef.current = { x: touch.clientX, y: touch.clientY }
    },
    [isMobile]
  )
  const handleCardTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!isMobile || !swipeStartRef.current || event.changedTouches.length !== 1) return

      const touch = event.changedTouches[0]
      const deltaX = touch.clientX - swipeStartRef.current.x
      const deltaY = touch.clientY - swipeStartRef.current.y
      swipeStartRef.current = null

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
        Math.abs(deltaX) < Math.abs(deltaY) * SWIPE_DIRECTION_RATIO
      ) {
        return
      }

      if (deltaX < 0) {
        goNext()
        return
      }

      goPrev()
    },
    [goNext, goPrev, isMobile]
  )
  const resetSwipe = useCallback(() => {
    swipeStartRef.current = null
  }, [])

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
        <Link href={buildTripPageHref(tripId, 'edit')} className="mt-2 text-sm text-primary hover:underline">
          旅程を編集する
        </Link>
        <BottomNav tripId={tripId} active="navigate" />
      </div>
    )
  }

  const safeActiveIndex = Math.min(activeIndex, allSpots.length - 1)
  const activeSpot = allSpots[safeActiveIndex]
  const activeSpotEntry = spotEntries[safeActiveIndex]
  const prevMove = activeSpotEntry?.prevMove
  const nextMove = activeSpotEntry?.nextMove

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Back Header */}
      <header className="absolute top-0 left-0 z-[1000] p-3">
        <Link
          href={buildTripPageHref(tripId, 'edit')}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-card"
          aria-label="旅程に戻る"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </header>

      {/* Map */}
      <div className="relative flex-1">
        <MapView
          entries={spotEntries}
          routes={routeSegments}
          activeSpotId={activeSpot?.id ?? null}
          onMarkerClick={handleMarkerClick}
          onPrevClick={goPrev}
          onNextClick={goNext}
          userLocation={currentLatLng}
          isFollowingLocation={isLocationMode}
        />
        {/* Top info panel — tapping toggles location mode */}
        <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
          <div
            role="button"
            tabIndex={0}
            aria-label={isLocationMode ? '現在地モードを解除' : '現在地モードを開始'}
            onClick={toggleLocationMode}
            onKeyDown={(e) => e.key === 'Enter' && toggleLocationMode()}
            className={cn(
              'pointer-events-auto w-[min(92vw,34rem)] cursor-pointer select-none rounded-2xl border bg-gradient-to-r from-card/95 via-card/90 to-card/95 px-3 py-2 shadow-lg backdrop-blur-md transition-all',
              isLocationMode
                ? 'border-blue-400/80 ring-1 ring-blue-400/40'
                : 'border-white/50'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">現在日時</p>
                <p className="text-[11px] text-muted-foreground">{formatCurrentDate(currentDateTime)}</p>
                <p className="font-mono text-lg font-bold leading-none text-foreground">
                  {formatCurrentTime(currentDateTime)}
                </p>
                {isLocationMode && (
                  <p className="mt-0.5 text-[10px] font-semibold text-blue-500">
                    ● 現在地追跡中
                  </p>
                )}
              </div>
              <div className="max-w-[58%] min-w-0 space-y-1.5 text-right">
                <div className="rounded-lg bg-muted/65 px-2 py-1">
                  <p className="text-[10px] font-semibold text-muted-foreground">次のSpot</p>
                  <p className="truncate text-xs font-semibold text-foreground">
                    {nowBasedInfo.nextSpot ? nowBasedInfo.nextSpot.name : '未設定'}
                  </p>
                  {nowBasedInfo.nextSpot && (
                    <p className="text-[10px] text-muted-foreground">
                      Day {nowBasedInfo.nextSpot.day} {formatNodeTimeLabel(nowBasedInfo.nextSpot.time, nowBasedInfo.nextSpot.endTime)}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'rounded-lg px-2 py-1',
                    isLocationMode ? 'bg-blue-500/15' : 'bg-muted/65'
                  )}
                >
                  <p className="text-[10px] font-semibold text-muted-foreground">移動</p>
                  {nowBasedInfo.activeMove ? (
                    <>
                      <p className="truncate text-xs font-semibold text-foreground">移動中: {nowBasedInfo.activeMove.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Day {nowBasedInfo.activeMove.day} {formatNodeTimeLabel(nowBasedInfo.activeMove.time, nowBasedInfo.activeMove.endTime)}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-semibold text-foreground">移動中ではありません</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Current location button */}
        <button
          type="button"
          onClick={toggleLocationMode}
          aria-label={isLocationMode ? '現在地モードを解除' : '現在地を表示'}
          className={cn(
            'absolute bottom-4 right-4 z-[1000] flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all',
            isLocationMode
              ? 'bg-blue-500 text-white shadow-blue-500/40'
              : 'bg-card/90 text-foreground backdrop-blur-sm hover:bg-card'
          )}
        >
          <LocateFixed className="size-5" />
        </button>
      </div>

      {/* Spot Card */}
      <div
        className="border-t border-border bg-card px-4 pb-16 pt-4"
        onTouchStart={handleCardTouchStart}
        onTouchEnd={handleCardTouchEnd}
        onTouchCancel={resetSwipe}
      >
        <div className="mx-auto max-w-md">
          {/* Navigation arrows */}
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={safeActiveIndex === 0}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="前のスポット"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-xs text-muted-foreground">
              {safeActiveIndex + 1} / {allSpots.length}
            </span>
            <button
              onClick={goNext}
              disabled={safeActiveIndex === allSpots.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="次のスポット"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Spot dots */}
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {allSpots.map((spot, idx) => {
              const isActive = idx === safeActiveIndex
              const isDayBoundary = idx > 0 && allSpots[idx - 1].day !== spot.day

              return (
                <button
                  key={spot.id}
                  onClick={() => { setIsLocationMode(false); setActiveIndex(idx) }}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    isActive
                      ? 'w-4 bg-primary'
                      : spot.day % 2 === 0
                        ? 'w-1.5 bg-chart-3/55 hover:bg-chart-3'
                        : 'w-1.5 bg-chart-1/50 hover:bg-chart-1',
                    isDayBoundary && !isActive && 'ml-2'
                  )}
                  aria-label={`Day ${spot.day} ${spot.name}を表示`}
                />
              )
            })}
          </div>

          {/* Active spot details */}
          <div className="flex min-h-[7.75rem] gap-3">
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
              <h3 className="mt-1 truncate font-serif text-base font-bold text-foreground">
                {activeSpot.name}
              </h3>
              <div className="mt-0.5 min-h-[1rem]">
                {activeSpot.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{activeSpot.notes}</p>
                )}
              </div>
              <div className="mt-2 h-[5.75rem] overflow-hidden">
                {(hasVisibleMove(prevMove) || hasVisibleMove(nextMove)) && (
                  <div className="flex h-full flex-wrap content-start gap-1">
                    {hasVisibleMove(prevMove) && (
                      <MoveDirectionBadge
                        move={prevMove}
                        directionLabel="← Prev"
                        accentClassName="text-primary"
                      />
                    )}
                    {hasVisibleMove(nextMove) && (
                      <MoveDirectionBadge
                        move={nextMove}
                        directionLabel="Next →"
                        accentClassName="text-[var(--chart-3)]"
                        titleClassName="text-[10px]"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav tripId={tripId} active="navigate" />
    </div>
  )
}
