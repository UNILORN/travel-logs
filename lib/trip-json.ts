import type { Trip } from '@/lib/types'

const ALLOWED_STATUSES: Trip['status'][] = ['planning', 'traveling', 'archived']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function isValidStatus(value: unknown): value is Trip['status'] {
  return typeof value === 'string' && ALLOWED_STATUSES.includes(value as Trip['status'])
}

function sanitizeTrip(raw: unknown): Trip | null {
  if (!isRecord(raw)) return null

  const members = isRecord(raw.members) ? raw.members : {}

  return {
    id: toString(raw.id, `trip-${Date.now()}`),
    title: toString(raw.title),
    destination: toString(raw.destination),
    coverImage: toString(raw.coverImage),
    startDate: toString(raw.startDate),
    endDate: toString(raw.endDate),
    status: isValidStatus(raw.status) ? raw.status : 'planning',
    members: {
      adults: Math.max(1, Math.floor(toNumber(members.adults, 1))),
      children: Math.max(0, Math.floor(toNumber(members.children, 0))),
    },
    budget: Math.max(0, toNumber(raw.budget, 0)),
    spots: Array.isArray(raw.spots) ? (raw.spots as Trip['spots']) : [],
    expenses: Array.isArray(raw.expenses) ? (raw.expenses as Trip['expenses']) : [],
    nodes: Array.isArray(raw.nodes) ? (raw.nodes as Trip['nodes']) : undefined,
  }
}

export function parseTripsFromJson(text: string): Trip[] {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) {
    throw new Error('JSONのルートは配列である必要があります。')
  }

  const trips = parsed
    .map((item) => sanitizeTrip(item))
    .filter((item): item is Trip => item !== null)

  if (trips.length === 0) {
    throw new Error('有効な旅行データが見つかりませんでした。')
  }

  return trips
}

export function stringifyTrips(trips: Trip[]): string {
  return JSON.stringify(trips, null, 2)
}
