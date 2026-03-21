import type { MoveNode, SpotNode, TimelineNode } from '@/lib/types'

export interface LatLngPoint {
  lat: number
  lng: number
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function isValidLatLngPoint(
  point: Partial<LatLngPoint> | null | undefined
): point is LatLngPoint {
  return (
    !!point &&
    isFiniteNumber(point.lat) &&
    isFiniteNumber(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  )
}

function toPoint(lat?: number, lng?: number): LatLngPoint | undefined {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return undefined
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined
  return { lat, lng }
}

function isSamePoint(a: LatLngPoint, b: LatLngPoint) {
  const EPSILON = 1e-7
  return Math.abs(a.lat - b.lat) < EPSILON && Math.abs(a.lng - b.lng) < EPSILON
}

export function dedupeSequentialPathPoints(points: LatLngPoint[]) {
  return points.filter((point, index) => index === 0 || !isSamePoint(point, points[index - 1]))
}

export function buildMovePathPoints(
  move: Pick<MoveNode, 'fromLat' | 'fromLng' | 'toLat' | 'toLng' | 'path'>,
  anchors?: {
    from?: LatLngPoint
    to?: LatLngPoint
  }
) {
  const from = anchors?.from ?? toPoint(move.fromLat, move.fromLng)
  const to = anchors?.to ?? toPoint(move.toLat, move.toLng)
  const storedPath = (move.path ?? []).filter(isValidLatLngPoint)

  if (from && to) {
    const middle = [...storedPath]
    if (middle.length > 0 && isSamePoint(middle[0], from)) middle.shift()
    if (middle.length > 0 && isSamePoint(middle[middle.length - 1], to)) middle.pop()
    return dedupeSequentialPathPoints([from, ...middle, to])
  }

  if (from) {
    const body = [...storedPath]
    if (body.length > 0 && isSamePoint(body[0], from)) body.shift()
    return dedupeSequentialPathPoints([from, ...body])
  }

  if (to) {
    const body = [...storedPath]
    if (body.length > 0 && isSamePoint(body[body.length - 1], to)) body.pop()
    return dedupeSequentialPathPoints([...body, to])
  }

  return dedupeSequentialPathPoints(storedPath)
}

export function extractEditableMiddlePoints(
  path: LatLngPoint[],
  anchors?: { from?: LatLngPoint; to?: LatLngPoint }
) {
  const points = [...path]
  if (anchors?.from && points.length > 0 && isSamePoint(points[0], anchors.from)) {
    points.shift()
  }
  if (anchors?.to && points.length > 0 && isSamePoint(points[points.length - 1], anchors.to)) {
    points.pop()
  }
  return points
}

function isSpotNode(node: TimelineNode): node is SpotNode {
  return node.type === 'spot'
}

function toComparableTime(time: string) {
  return time.replace(':', '')
}

function findNearestSpotBefore(nodes: TimelineNode[], fromIndex: number): SpotNode | undefined {
  for (let i = fromIndex - 1; i >= 0; i -= 1) {
    const candidate = nodes[i]
    if (isSpotNode(candidate)) return candidate
  }
  return undefined
}

function findNearestSpotAfter(nodes: TimelineNode[], fromIndex: number): SpotNode | undefined {
  for (let i = fromIndex + 1; i < nodes.length; i += 1) {
    const candidate = nodes[i]
    if (isSpotNode(candidate)) return candidate
  }
  return undefined
}

export function findMoveAnchorSpots(nodes: TimelineNode[], moveId: string) {
  const moveIndex = nodes.findIndex((node) => node.type === 'move' && node.id === moveId)
  if (moveIndex < 0) return { fromSpot: undefined, toSpot: undefined }
  return {
    fromSpot: findNearestSpotBefore(nodes, moveIndex),
    toSpot: findNearestSpotAfter(nodes, moveIndex),
  }
}

export function findMoveAnchorSpotsByWindow(
  nodes: TimelineNode[],
  window: { day: number; time: string; endTime: string }
) {
  const spots = nodes.filter(
    (node): node is SpotNode => isSpotNode(node) && node.day === window.day
  )
  const start = toComparableTime(window.time)
  const end = toComparableTime(window.endTime)

  const before = spots
    .filter((spot) => toComparableTime(spot.time) <= start)
    .sort((a, b) => toComparableTime(b.time).localeCompare(toComparableTime(a.time)))[0]
  const after = spots
    .filter((spot) => toComparableTime(spot.time) >= end)
    .sort((a, b) => toComparableTime(a.time).localeCompare(toComparableTime(b.time)))[0]

  if (before || after) {
    return { fromSpot: before, toSpot: after }
  }

  const fallbackBefore = spots
    .filter((spot) => toComparableTime(spot.time) <= end)
    .sort((a, b) => toComparableTime(b.time).localeCompare(toComparableTime(a.time)))[0]
  const fallbackAfter = spots
    .filter((spot) => toComparableTime(spot.time) >= start)
    .sort((a, b) => toComparableTime(a.time).localeCompare(toComparableTime(b.time)))[0]

  return {
    fromSpot: fallbackBefore,
    toSpot: fallbackAfter,
  }
}
