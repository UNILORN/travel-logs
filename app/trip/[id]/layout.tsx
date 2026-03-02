import type { ReactNode } from 'react'
import { staticTripIds } from '@/lib/static-trips'

export function generateStaticParams() {
  return staticTripIds.map((id) => ({ id }))
}

export default function TripLayout({ children }: { children: ReactNode }) {
  return children
}
