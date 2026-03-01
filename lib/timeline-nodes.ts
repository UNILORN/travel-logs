import { TRANSPORT_LABELS, type MoveNode, type Spot, type SpotNode, type TimelineNode, type Trip } from './types'

export function sortTimelineNodes(a: TimelineNode, b: TimelineNode) {
  if (a.day !== b.day) return a.day - b.day
  if (a.time !== b.time) return a.time.localeCompare(b.time)
  return a.endTime.localeCompare(b.endTime)
}

export function spotToTimelineNode(spot: Spot): SpotNode {
  return {
    type: 'spot',
    id: spot.id,
    name: spot.name,
    time: spot.time,
    endTime: spot.endTime,
    day: spot.day,
    address: spot.address,
    lat: spot.lat,
    lng: spot.lng,
    image: spot.image,
    notes: spot.notes,
  }
}

export function buildTimelineNodesFromLegacySpots(spots: Spot[]): TimelineNode[] {
  const sortedSpots = [...spots].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return a.time.localeCompare(b.time)
  })

  const nodes: TimelineNode[] = []
  const prevSpotByDay = new Map<number, SpotNode>()

  for (const spot of sortedSpots) {
    const prevSpot = prevSpotByDay.get(spot.day)

    if (spot.distance > 0) {
      nodes.push({
        type: 'move',
        id: `move-${spot.id}`,
        name: `${TRANSPORT_LABELS[spot.transport]}で移動`,
        time: prevSpot?.endTime ?? spot.time,
        endTime: spot.time,
        day: spot.day,
        transport: spot.transport,
        distance: spot.distance,
        image: '',
        notes: '',
        fromLat: prevSpot?.lat,
        fromLng: prevSpot?.lng,
        toLat: spot.lat,
        toLng: spot.lng,
      } satisfies MoveNode)
    }

    const spotNode = spotToTimelineNode(spot)
    nodes.push(spotNode)
    prevSpotByDay.set(spot.day, spotNode)
  }

  return nodes.sort(sortTimelineNodes)
}

export function getTripTimelineNodes(trip: Trip): TimelineNode[] {
  if (trip.nodes && trip.nodes.length > 0) {
    return [...trip.nodes].sort(sortTimelineNodes)
  }

  return buildTimelineNodesFromLegacySpots(trip.spots)
}

export function isSpotNode(node: TimelineNode): node is SpotNode {
  return node.type === 'spot'
}

export function isMoveNode(node: TimelineNode): node is MoveNode {
  return node.type === 'move'
}
