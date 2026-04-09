'use client'

import { use, useState, useEffect, useCallback, useMemo, useRef, type TouchEvent } from 'react'
import dynamic from 'next/dynamic'
import type { NavigateAreaEntry, NavigateEntry, NavigateMoveEntry, NavigateRouteSegment, NavigateSpotEntry } from '@/components/navigation/types'
import { formatDistanceKm, hasVisibleMove } from '@/components/navigation/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { useTripContext } from '@/lib/trip-context'
import { TRANSPORT_LABELS } from '@/lib/types'
import type { MoveNode, SpotNode } from '@/lib/types'
import { getTripTimelineNodes, isAreaNode, isMoveNode, isSpotNode } from '@/lib/timeline-nodes'
import { buildMovePathPoints } from '@/lib/move-path'
import { resolveTripIdFromSearch } from '@/lib/trip-id'
import { buildTripPageHref } from '@/lib/trip-route'
import { BottomNav } from '@/components/shared/bottom-nav'
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, LocateFixed, Map, Mountain, Navigation2, Route, Target } from 'lucide-react'
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

const CARDINAL_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
function formatHeading(degrees: number): string {
  const idx = Math.round(degrees / 45) % 8
  return `${CARDINAL_DIRECTIONS[idx]} ${Math.round(degrees)}°`
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

/** Bottom card content for a spot entry */
function SpotCard({ entry }: { entry: NavigateSpotEntry }) {
  const { node, prevMove, nextMove } = entry
  return (
    <div className="flex min-h-[7.75rem] gap-3">
      {node.image && (
        <img
          src={node.image}
          alt={node.name}
          className="h-16 w-20 shrink-0 rounded-lg object-cover"
          crossOrigin="anonymous"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Day {node.day}
          </span>
          <Clock className="size-3" />
          <span>{node.time} - {node.endTime}</span>
        </div>
        <h3 className="mt-1 truncate font-serif text-base font-bold text-foreground">
          {node.name}
        </h3>
        <div className="mt-0.5 min-h-[1rem]">
          {node.notes && (
            <p className="text-xs text-muted-foreground line-clamp-1">{node.notes}</p>
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
  )
}

/** Bottom card content for a move entry */
function MoveCard({ entry }: { entry: NavigateMoveEntry }) {
  const { node, fromSpot, toSpot } = entry
  return (
    <div className="flex min-h-[7.75rem] gap-3">
      {node.image && (
        <img
          src={node.image}
          alt={node.name}
          className="h-16 w-20 shrink-0 rounded-lg object-cover"
          crossOrigin="anonymous"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            移動 · Day {node.day}
          </span>
          <Clock className="size-3" />
          <span>{node.time} - {node.endTime}</span>
        </div>
        <h3 className="mt-1 truncate font-serif text-base font-bold text-foreground">
          {node.name}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {TRANSPORT_LABELS[node.transport]}{node.distance > 0 ? ` · ${formatDistanceKm(node.distance)}` : ''}
        </p>
        {(fromSpot ?? toSpot) && (
          <div className="mt-2 flex items-center gap-1">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-orange-500/12 px-2 py-1 border border-orange-400/30">
              <span className="shrink-0 text-[9px] font-bold tracking-wide text-orange-500 uppercase">From</span>
              <span className="min-w-0 truncate text-[10px] font-semibold text-foreground">
                {fromSpot ? fromSpot.name : '—'}
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">→</span>
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-lg bg-blue-500/12 px-2 py-1 border border-blue-400/30">
              <span className="shrink-0 text-[9px] font-bold tracking-wide text-blue-500 uppercase">To</span>
              <span className="min-w-0 truncate text-[10px] font-semibold text-foreground">
                {toSpot ? toSpot.name : '—'}
              </span>
            </div>
          </div>
        )}
        {node.notes && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{node.notes}</p>
        )}
      </div>
    </div>
  )
}

/** Bottom card content for an area entry */
function AreaCard({ entry }: { entry: NavigateAreaEntry }) {
  const { node } = entry
  return (
    <div className="flex min-h-[7.75rem] gap-3">
      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
        <Map className="size-6 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            エリア · Day {node.day}
          </span>
          <Clock className="size-3" />
          <span>{node.time} - {node.endTime}</span>
        </div>
        <h3 className="mt-1 truncate font-serif text-base font-bold text-foreground">
          {node.name}
        </h3>
        {node.spotNames.length > 0 && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
            {node.spotNames.join(' · ')}
          </p>
        )}
        {node.polygon && node.polygon.length >= 3 && (
          <p className="mt-0.5 text-[10px] text-emerald-600">
            <Route className="mr-0.5 inline size-3" />
            {node.polygon.length}頂点のポリゴン
          </p>
        )}
        {node.notes && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{node.notes}</p>
        )}
      </div>
    </div>
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
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number | null>(null)
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null)
  const [currentHeading, setCurrentHeading] = useState<number | null>(null)
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null)
  const [showGpsInfo, setShowGpsInfo] = useState(false)
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
      setCurrentSpeedKmh(null)
      setCurrentAltitude(null)
      setCurrentHeading(null)
      setCurrentAccuracy(null)
      setShowGpsInfo(false)
      return
    }

    if (!navigator.geolocation) {
      setIsLocationMode(false)
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        const spd = pos.coords.speed
        setCurrentSpeedKmh(spd !== null && spd >= 0 ? spd * 3.6 : null)
        setCurrentAltitude(pos.coords.altitude)
        const hdg = pos.coords.heading
        setCurrentHeading(hdg !== null && !isNaN(hdg) ? hdg : null)
        setCurrentAccuracy(pos.coords.accuracy)
      },
      () => {
        setIsLocationMode(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
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

  // Build unified entries for ALL timeline node types
  const allEntries = useMemo((): NavigateEntry[] => {
    if (!trip) return []
    const entries: NavigateEntry[] = []
    let spotSequence = 0

    timelineNodes.forEach((node, index) => {
      if (isSpotNode(node)) {
        spotSequence++
        const prevNode = timelineNodes[index - 1]
        const nextNode = timelineNodes[index + 1]
        entries.push({
          type: 'spot',
          id: node.id,
          node,
          prevMove: prevNode && isMoveNode(prevNode) ? prevNode : undefined,
          nextMove: nextNode && isMoveNode(nextNode) ? nextNode : undefined,
          prevArea: prevNode && isAreaNode(prevNode) ? prevNode : undefined,
          nextArea: nextNode && isAreaNode(nextNode) ? nextNode : undefined,
          sequence: spotSequence,
        })
      } else if (isMoveNode(node)) {
        const fromSpot = (() => {
          for (let i = index - 1; i >= 0; i--) {
            const candidate = timelineNodes[i]
            if (isSpotNode(candidate)) return candidate as SpotNode
          }
          return undefined
        })()
        const toSpot = (() => {
          for (let i = index + 1; i < timelineNodes.length; i++) {
            const candidate = timelineNodes[i]
            if (isSpotNode(candidate)) return candidate as SpotNode
          }
          return undefined
        })()
        const routePoints = buildMovePathPoints(node, {
          from: fromSpot ? { lat: fromSpot.lat, lng: fromSpot.lng } : undefined,
          to: toSpot ? { lat: toSpot.lat, lng: toSpot.lng } : undefined,
        })
        entries.push({
          type: 'move',
          id: node.id,
          node,
          fromSpot,
          toSpot,
          routePoints,
        })
      } else if (isAreaNode(node)) {
        entries.push({
          type: 'area',
          id: node.id,
          node,
        })
      }
    })

    return entries
  }, [timelineNodes, trip])

  const spotEntries = useMemo(
    () => allEntries.filter((e): e is NavigateSpotEntry => e.type === 'spot'),
    [allEntries]
  )

  const areaEntries = useMemo(
    () => allEntries.filter((e): e is NavigateAreaEntry => e.type === 'area'),
    [allEntries]
  )

  const routeSegments = useMemo((): NavigateRouteSegment[] =>
    allEntries
      .filter((e): e is NavigateMoveEntry => e.type === 'move')
      .filter((e) => e.routePoints.length >= 2)
      .map((e) => ({ id: e.id, move: e.node, points: e.routePoints })),
    [allEntries]
  )

  // For "now-based" info, we still just look at spots and moves
  const allSpots = useMemo(() => spotEntries.map((e) => e.node), [spotEntries])

  const toggleLocationMode = useCallback(() => {
    if (!isLocationMode && trip && allSpots.length > 0) {
      const nowTs = Date.now()
      let targetIndex = 0
      for (let i = 0; i < allSpots.length; i++) {
        const spot = allSpots[i]
        const startAt = createTripDateTime(trip.startDate, spot.day, spot.time)
        if (startAt.getTime() <= nowTs) {
          // find the matching allEntries index for this spot
          const entryIdx = allEntries.findIndex((e) => e.id === spot.id)
          if (entryIdx !== -1) targetIndex = entryIdx
        } else {
          break
        }
      }
      setActiveIndex(targetIndex)
    }
    setIsLocationMode((prev) => !prev)
  }, [isLocationMode, trip, allSpots, allEntries])

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

  // Marker click: find the entry in allEntries and jump to it
  const handleMarkerClick = useCallback(
    (spotId: string) => {
      const idx = allEntries.findIndex((e) => e.id === spotId)
      if (idx !== -1) {
        setIsLocationMode(false)
        setActiveIndex(idx)
      }
    },
    [allEntries]
  )

  const goPrev = useCallback(() => {
    setIsLocationMode(false)
    setActiveIndex((current) => Math.max(0, current - 1))
  }, [])

  const goNext = useCallback(() => {
    setIsLocationMode(false)
    setActiveIndex((current) => Math.min(Math.max(0, allEntries.length - 1), current + 1))
  }, [allEntries.length])

  // Keyboard arrow key navigation (PC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goPrev()
      } else if (e.key === 'ArrowRight') {
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext])

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

  if (allEntries.length === 0) {
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

  const safeActiveIndex = Math.min(activeIndex, allEntries.length - 1)
  const activeEntry = allEntries[safeActiveIndex]

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
          spotEntries={spotEntries}
          routes={routeSegments}
          areaEntries={areaEntries}
          activeEntry={activeEntry ?? null}
          onMarkerClick={handleMarkerClick}
          onPrevClick={goPrev}
          onNextClick={goNext}
          userLocation={currentLatLng}
          isFollowingLocation={isLocationMode}
        />
        {/* Top info panel */}
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

        {/* Digital speedometer — shown only in location mode */}
        {isLocationMode && (
          <div className="absolute bottom-4 left-4 z-[1000] select-none">
            <button
              type="button"
              onClick={() => setShowGpsInfo((prev) => !prev)}
              aria-label={showGpsInfo ? 'GPS情報を隠す' : 'GPS情報を表示'}
              className={cn(
                'flex flex-col items-end rounded-xl bg-black/75 px-3 py-2 shadow-lg backdrop-blur-sm transition-all',
                showGpsInfo
                  ? 'ring-1 ring-[#00e5ff]/60'
                  : 'ring-1 ring-blue-400/30 hover:ring-blue-400/50'
              )}
            >
              {showGpsInfo && (
                <div className="mb-2 w-full min-w-[9rem] space-y-1.5 border-b border-[#00e5ff]/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Mountain className="size-3 shrink-0 text-[#00e5ff]/50" />
                    <span className="w-7 text-[9px] font-semibold text-[#00e5ff]/50">高度</span>
                    <span className="ml-auto font-mono text-[11px] font-bold text-[#00e5ff]">
                      {currentAltitude !== null ? `${Math.round(currentAltitude)} m` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Navigation2
                      className="size-3 shrink-0 text-[#00e5ff]/50"
                      style={currentHeading !== null ? { transform: `rotate(${currentHeading}deg)` } : undefined}
                    />
                    <span className="w-7 text-[9px] font-semibold text-[#00e5ff]/50">方位</span>
                    <span className="ml-auto font-mono text-[11px] font-bold text-[#00e5ff]">
                      {currentHeading !== null ? formatHeading(currentHeading) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="size-3 shrink-0 text-[#00e5ff]/50" />
                    <span className="w-7 text-[9px] font-semibold text-[#00e5ff]/50">誤差</span>
                    <span className="ml-auto font-mono text-[11px] font-bold text-[#00e5ff]">
                      {currentAccuracy !== null ? `±${Math.round(currentAccuracy)} m` : '—'}
                    </span>
                  </div>
                </div>
              )}
              <span className="font-mono text-2xl font-bold leading-none tracking-tight text-[#00e5ff] [text-shadow:0_0_8px_rgba(0,229,255,0.6)]">
                {currentSpeedKmh !== null ? Math.round(currentSpeedKmh).toString().padStart(3, '\u2007') : '\u2007\u2007\u2014'}
              </span>
              <span className="mt-0.5 text-[9px] font-semibold tracking-widest text-[#00e5ff]/60">
                km/h
              </span>
            </button>
          </div>
        )}

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

      {/* Bottom card */}
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
              aria-label="前のノード"
            >
              <ChevronLeft className="size-5" />
            </button>
            <span className="text-xs text-muted-foreground">
              {safeActiveIndex + 1} / {allEntries.length}
            </span>
            <button
              onClick={goNext}
              disabled={safeActiveIndex === allEntries.length - 1}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30"
              aria-label="次のノード"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>

          {/* Node dots */}
          <div className="mb-3 flex items-center justify-center gap-1.5 overflow-x-auto pb-0.5">
            {allEntries.map((entry, idx) => {
              const isActive = idx === safeActiveIndex
              const prevEntry = allEntries[idx - 1]
              const isDayBoundary = idx > 0 && entry.node.day !== prevEntry?.node.day

              return (
                <button
                  key={entry.id}
                  onClick={() => { setIsLocationMode(false); setActiveIndex(idx) }}
                  className={cn(
                    'h-1.5 shrink-0 rounded-full transition-all',
                    isActive
                      ? 'w-4 bg-primary'
                      : entry.type === 'area'
                        ? 'w-1.5 bg-emerald-500/50 hover:bg-emerald-500'
                        : entry.type === 'move'
                          ? 'w-1.5 bg-chart-1/50 hover:bg-chart-1'
                          : entry.node.day % 2 === 0
                            ? 'w-1.5 bg-chart-3/55 hover:bg-chart-3'
                            : 'w-1.5 bg-chart-1/50 hover:bg-chart-1',
                    isDayBoundary && !isActive && 'ml-2'
                  )}
                  aria-label={`Day ${entry.node.day} ${entry.node.name}を表示`}
                />
              )
            })}
          </div>

          {/* Active node details */}
          {activeEntry?.type === 'spot' && <SpotCard entry={activeEntry} />}
          {activeEntry?.type === 'move' && <MoveCard entry={activeEntry} />}
          {activeEntry?.type === 'area' && <AreaCard entry={activeEntry} />}
        </div>
      </div>

      <BottomNav tripId={tripId} active="navigate" />
    </div>
  )
}
