'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { TRIP_ROUTE_FALLBACK_ID } from '@/lib/trip-route'

const TRIP_PAGE_SECTIONS = new Set(['edit', 'budget', 'navigate', 'report'])

function tryDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function buildTripFallbackRedirect(pathname: string, search: string) {
  const segments = pathname.split('/').filter(Boolean)
  const tripSegmentIndex = segments.indexOf('trip')

  if (tripSegmentIndex < 0 || segments.length < tripSegmentIndex + 3) {
    return null
  }

  const tripIdSegment = segments[tripSegmentIndex + 1]
  const section = segments[tripSegmentIndex + 2]

  if (!TRIP_PAGE_SECTIONS.has(section)) {
    return null
  }

  const query = new URLSearchParams(search)
  if (!query.get('tripId')) {
    query.set('tripId', tryDecodeURIComponent(tripIdSegment))
  }

  const basePathSegments = segments.slice(0, tripSegmentIndex)
  const basePath = basePathSegments.length > 0 ? `/${basePathSegments.join('/')}` : ''
  const queryString = query.toString()

  return `${basePath}/trip/${TRIP_ROUTE_FALLBACK_ID}/${section}/${queryString ? `?${queryString}` : ''}`
}

export default function NotFound() {
  useEffect(() => {
    const target = buildTripFallbackRedirect(window.location.pathname, window.location.search)
    if (!target) return

    const current = `${window.location.pathname}${window.location.search}`
    if (target === current) return

    window.location.replace(target)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <h1 className="font-serif text-2xl font-bold text-foreground">ページが見つかりません</h1>
      <p className="text-sm text-muted-foreground">リンク先が変更された可能性があります。</p>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        本棚へ戻る
      </Link>
    </main>
  )
}
