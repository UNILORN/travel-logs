import customTripsJson from '@/test2.json'
import { initialTrips } from '@/lib/mock-data'
import { parseTripsFromJson } from '@/lib/trip-json'
import type { Trip } from '@/lib/types'

function loadCustomTrips(): Trip[] {
  try {
    return parseTripsFromJson(JSON.stringify(customTripsJson))
  } catch (error) {
    console.warn('Bundled custom trip JSON could not be parsed.', error)
    return []
  }
}

function mergeTripsById(baseTrips: Trip[], additionalTrips: Trip[]) {
  const merged = new Map(baseTrips.map((trip) => [trip.id, trip]))

  for (const trip of additionalTrips) {
    merged.set(trip.id, trip)
  }

  return Array.from(merged.values())
}

export const staticTrips = mergeTripsById(initialTrips, loadCustomTrips())

export const staticTripIds = staticTrips.map((trip) => trip.id)
