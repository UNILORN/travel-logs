export const TRIP_ROUTE_FALLBACK_ID = 'hakone-weekend'

export type TripPageSection = 'edit' | 'budget' | 'navigate' | 'report' | 'brief'

export function buildTripPageHref(tripId: string, section: TripPageSection) {
  const encodedTripId = encodeURIComponent(tripId)
  return `/trip/${TRIP_ROUTE_FALLBACK_ID}/${section}?tripId=${encodedTripId}`
}
