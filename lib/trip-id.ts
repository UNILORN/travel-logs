export function resolveTripIdFromSearch(routeId: string, search: string) {
  const params = new URLSearchParams(search)
  const queryTripId = params.get('tripId')?.trim()
  return queryTripId && queryTripId.length > 0 ? queryTripId : routeId
}

