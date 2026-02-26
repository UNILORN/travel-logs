import type { ReactNode } from 'react'
import { initialTrips } from '@/lib/mock-data'

export function generateStaticParams() {
  return initialTrips.map((trip) => ({ id: trip.id }))
}

export default function TripLayout({ children }: { children: ReactNode }) {
  return children
}
