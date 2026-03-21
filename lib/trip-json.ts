import { z } from 'zod'
import {
  buildTimelineNodesFromLegacySpots,
  isMoveNode,
  isSpotNode,
  sortTimelineNodes,
} from '@/lib/timeline-nodes'
import {
  EXPENSE_CATEGORIES,
  TRANSPORT_TYPES,
  TRIP_STATUSES,
  type Expense,
  type MoveNode,
  type Spot,
  type TimelineNode,
  type Trip,
} from '@/lib/types'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

const dateSchema = z.string().regex(DATE_PATTERN)
const timeSchema = z.string().regex(TIME_PATTERN)
const latitudeSchema = z.number().finite().min(-90).max(90)
const longitudeSchema = z.number().finite().min(-180).max(180)
const latLngPointSchema = z
  .object({
    lat: latitudeSchema,
    lng: longitudeSchema,
  })
  .strict()
const nonNegativeNumberSchema = z.number().finite().min(0)
const nonNegativeIntegerSchema = z.number().int().min(0)

const tripStatusSchema = z.enum(TRIP_STATUSES)
const transportTypeSchema = z.enum(TRANSPORT_TYPES)
const expenseCategorySchema = z.enum(EXPENSE_CATEGORIES)

const spotNodeInputSchema = z
  .object({
    type: z.literal('spot'),
    id: z.string().min(1).optional(),
    name: z.string(),
    time: timeSchema,
    endTime: timeSchema,
    day: z.number().int().min(1),
    address: z.string(),
    lat: latitudeSchema,
    lng: longitudeSchema,
    image: z.string(),
    notes: z.string(),
  })
  .strict()

const moveNodeInputSchema = z
  .object({
    type: z.literal('move'),
    id: z.string().min(1).optional(),
    name: z.string(),
    time: timeSchema,
    endTime: timeSchema,
    day: z.number().int().min(1),
    transport: transportTypeSchema,
    distance: nonNegativeNumberSchema,
    image: z.string().default(''),
    notes: z.string(),
    fromLat: latitudeSchema.optional(),
    fromLng: longitudeSchema.optional(),
    toLat: latitudeSchema.optional(),
    toLng: longitudeSchema.optional(),
    path: z.array(latLngPointSchema).optional(),
  })
  .strict()

const areaNodeInputSchema = z
  .object({
    type: z.literal('area'),
    id: z.string().min(1).optional(),
    name: z.string(),
    time: timeSchema,
    endTime: timeSchema,
    day: z.number().int().min(1),
    spotNames: z.array(z.string()),
    notes: z.string(),
  })
  .strict()

const timelineNodeInputSchema = z.discriminatedUnion('type', [
  spotNodeInputSchema,
  moveNodeInputSchema,
  areaNodeInputSchema,
])

const legacySpotInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string(),
    time: timeSchema,
    endTime: timeSchema,
    day: z.number().int().min(1),
    address: z.string(),
    lat: latitudeSchema,
    lng: longitudeSchema,
    image: z.string(),
    notes: z.string(),
    transport: transportTypeSchema,
    distance: nonNegativeNumberSchema,
  })
  .strict()

const expenseInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    category: expenseCategorySchema,
    name: z.string(),
    adultPrice: nonNegativeNumberSchema,
    childPrice: nonNegativeNumberSchema,
    adultCount: nonNegativeIntegerSchema.optional(),
    childCount: nonNegativeIntegerSchema.optional(),
    total: nonNegativeNumberSchema.optional(),
  })
  .strict()

const tripInputSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: z.string(),
    destination: z.string(),
    coverImage: z.string(),
    startDate: dateSchema,
    endDate: dateSchema,
    status: tripStatusSchema,
    members: z
      .object({
        adults: z.number().int().min(1),
        children: nonNegativeIntegerSchema,
      })
      .strict(),
    budget: nonNegativeNumberSchema,
    nodes: z.array(timelineNodeInputSchema).default([]),
    spots: z.array(legacySpotInputSchema).default([]),
    expenses: z.array(expenseInputSchema).default([]),
  })
  .strict()

const tripsInputSchema = z.array(tripInputSchema)

type TripInput = z.infer<typeof tripInputSchema>
type TimelineNodeInput = z.infer<typeof timelineNodeInputSchema>
type LegacySpotInput = z.infer<typeof legacySpotInputSchema>
type ExpenseInput = z.infer<typeof expenseInputSchema>

function createFallbackId(prefix: string, tripIndex: number, itemIndex: number) {
  return `${prefix}-${Date.now()}-${tripIndex}-${itemIndex}`
}

function sortLegacySpots(spots: Spot[]) {
  return [...spots].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    if (a.time !== b.time) return a.time.localeCompare(b.time)
    return a.endTime.localeCompare(b.endTime)
  })
}

function normalizeNode(
  node: TimelineNodeInput,
  tripIndex: number,
  nodeIndex: number
): TimelineNode {
  return {
    ...node,
    id: node.id ?? createFallbackId(node.type, tripIndex, nodeIndex),
  }
}

function normalizeLegacySpot(spot: LegacySpotInput, tripIndex: number, spotIndex: number): Spot {
  return {
    ...spot,
    id: spot.id ?? createFallbackId('spot', tripIndex, spotIndex),
  }
}

function normalizeExpense(
  expense: ExpenseInput,
  members: Trip['members'],
  tripIndex: number,
  expenseIndex: number
): Expense {
  const adultCount = expense.adultCount ?? members.adults
  const childCount = expense.childCount ?? members.children

  return {
    ...expense,
    adultCount,
    childCount,
    id: expense.id ?? createFallbackId('exp', tripIndex, expenseIndex),
    total: expense.adultPrice * adultCount + expense.childPrice * childCount,
  }
}

function deriveLegacySpotsFromNodes(nodes: TimelineNode[]): Spot[] {
  const sortedNodes = [...nodes].sort(sortTimelineNodes)
  const pendingMoveByDay = new Map<number, MoveNode>()
  const derivedSpots: Spot[] = []

  for (const node of sortedNodes) {
    if (isMoveNode(node)) {
      pendingMoveByDay.set(node.day, node)
      continue
    }

    if (!isSpotNode(node)) {
      pendingMoveByDay.delete(node.day)
      continue
    }

    const inboundMove = pendingMoveByDay.get(node.day)
    derivedSpots.push({
      id: node.id,
      name: node.name,
      time: node.time,
      endTime: node.endTime,
      day: node.day,
      address: node.address,
      lat: node.lat,
      lng: node.lng,
      image: node.image,
      notes: node.notes,
      transport: inboundMove?.transport ?? 'walk',
      distance: inboundMove?.distance ?? 0,
    })
    pendingMoveByDay.delete(node.day)
  }

  return sortLegacySpots(derivedSpots)
}

function normalizeTrip(raw: TripInput, tripIndex: number): Trip {
  const normalizedNodes = raw.nodes.map((node, nodeIndex) =>
    normalizeNode(node, tripIndex, nodeIndex)
  )
  const normalizedSpots = raw.spots.map((spot, spotIndex) =>
    normalizeLegacySpot(spot, tripIndex, spotIndex)
  )
  const normalizedExpenses = raw.expenses.map((expense, expenseIndex) =>
    normalizeExpense(expense, raw.members, tripIndex, expenseIndex)
  )

  const nodes =
    normalizedNodes.length > 0
      ? [...normalizedNodes].sort(sortTimelineNodes)
      : buildTimelineNodesFromLegacySpots(normalizedSpots)
  const spots =
    normalizedSpots.length > 0
      ? sortLegacySpots(normalizedSpots)
      : deriveLegacySpotsFromNodes(nodes)

  return {
    id: raw.id ?? createFallbackId('trip', tripIndex, 0),
    title: raw.title,
    destination: raw.destination,
    coverImage: raw.coverImage,
    startDate: raw.startDate,
    endDate: raw.endDate,
    status: raw.status,
    members: raw.members,
    budget: raw.budget,
    nodes,
    spots,
    expenses: normalizedExpenses,
  }
}

function normalizeTrips(trips: TripInput[]): Trip[] {
  return trips.map((trip, tripIndex) => normalizeTrip(trip, tripIndex))
}

function formatZodError(error: z.ZodError) {
  const issue = error.issues[0]
  if (!issue) return 'JSONがスキーマに一致しません。'

  const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
  return `${path}: ${issue.message}`
}

export function parseTripsFromJson(text: string): Trip[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('JSONの解析に失敗しました。')
  }

  try {
    const validatedTrips = tripsInputSchema.parse(parsed)
    const trips = normalizeTrips(validatedTrips)

    if (trips.length === 0) {
      throw new Error('有効な旅行データが見つかりませんでした。')
    }

    return trips
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`JSONがスキーマに一致しません。${formatZodError(error)}`)
    }

    throw error
  }
}

export function stringifyTrips(trips: Trip[]): string {
  const normalizedTrips = normalizeTrips(trips.map((trip) => tripInputSchema.parse(trip)))
  return JSON.stringify(normalizedTrips, null, 2)
}

export { TRIP_JSON_SCHEMA } from '@/lib/trip-json-schema'
