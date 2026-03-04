'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MoveNode } from '@/lib/types'
import { TRANSPORT_LABELS } from '@/lib/types'
import type { NavigateMapEntry } from '@/components/navigation/types'
import { formatDistanceKm, hasVisibleMove } from '@/components/navigation/utils'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type AnchorPoint = {
  x: number
  y: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function truncateLabel(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
}

function createSpotMarkerIcon({ sequence, name, isActive }: { sequence: number; name: string; isActive: boolean }) {
  const title = isActive ? escapeHtml(truncateLabel(name, 12)) : ''
  const html = `
    <div class="map-pin-shell${isActive ? ' map-pin-shell--active' : ''}">
      <span class="map-pin-bubble${isActive ? ' map-pin-bubble--active' : ''}">
        <span class="map-pin-index${isActive ? ' map-pin-index--active' : ''}">${sequence}</span>
        ${isActive ? `<span class="map-pin-title">${title}</span>` : ''}
      </span>
      <span class="map-pin-tip${isActive ? ' map-pin-tip--active' : ''}"></span>
    </div>
  `

  return L.divIcon({
    html,
    className: 'map-pin-icon',
    iconSize: isActive ? [160, 60] : [44, 48],
    iconAnchor: isActive ? [80, 58] : [22, 46],
  })
}

function buildRouteChip(label: string, arrow: string, move: MoveNode) {
  return {
    label,
    arrow,
    title: truncateLabel(move.name, 18),
    detail: `${TRANSPORT_LABELS[move.transport]} · ${formatDistanceKm(move.distance)}`,
  }
}

type RouteChip = ReturnType<typeof buildRouteChip> & {
  variant: 'prev' | 'next'
  onClick: () => void
}

export function MapView({
  entries,
  activeSpotId,
  onMarkerClick,
  onPrevClick,
  onNextClick,
}: {
  entries: NavigateMapEntry[]
  activeSpotId: string | null
  onMarkerClick: (spotId: string) => void
  onPrevClick: () => void
  onNextClick: () => void
}) {
  const mapRef = useRef<L.Map | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const [activeAnchorPoint, setActiveAnchorPoint] = useState<AnchorPoint | null>(null)
  onMarkerClickRef.current = onMarkerClick

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.spot.id === activeSpotId) ?? null,
    [entries, activeSpotId]
  )
  const prevMove = activeEntry?.prevMove
  const nextMove = activeEntry?.nextMove
  const visiblePrevMove = hasVisibleMove(prevMove) ? prevMove : undefined
  const visibleNextMove = hasVisibleMove(nextMove) ? nextMove : undefined
  const routeChips = useMemo(() => {
    const chips: RouteChip[] = []

    if (visiblePrevMove) {
      chips.push({
        ...buildRouteChip('Prev', '←', visiblePrevMove),
        variant: 'prev' as const,
        onClick: onPrevClick,
      })
    }

    if (visibleNextMove) {
      chips.push({
        ...buildRouteChip('Next', '→', visibleNextMove),
        variant: 'next' as const,
        onClick: onNextClick,
      })
    }

    return chips
  }, [onNextClick, onPrevClick, visiblePrevMove, visibleNextMove])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: L.LatLngExpression =
      entries.length > 0 ? [entries[0].spot.lat, entries[0].spot.lng] : [35.6762, 139.6503]

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      zoomControl: false,
    })

    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update markers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    if (polylineRef.current) {
      polylineRef.current.remove()
      polylineRef.current = null
    }

    // Add new markers
    entries.forEach((entry) => {
      const isActive = entry.spot.id === activeSpotId
      const marker = L.marker([entry.spot.lat, entry.spot.lng], {
        icon: createSpotMarkerIcon({
          sequence: entry.sequence,
          name: entry.spot.name,
          isActive,
        }),
        zIndexOffset: isActive ? 1000 : entry.sequence,
      }).addTo(map)

      marker.on('click', () => onMarkerClickRef.current(entry.spot.id))
      markersRef.current.push(marker)
    })

    // Draw polyline between spots
    if (entries.length > 1) {
      const latlngs: L.LatLngExpression[] = entries.map((entry) => [entry.spot.lat, entry.spot.lng])
      polylineRef.current = L.polyline(latlngs, {
        color: 'oklch(0.45 0.1 175)',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map)
    }
  }, [entries, activeSpotId])

  // Pan to active spot
  useEffect(() => {
    const map = mapRef.current
    if (!map || !activeSpotId) return
    if (activeEntry) {
      map.flyTo([activeEntry.spot.lat, activeEntry.spot.lng], 14, { duration: 0.8 })
    }
  }, [activeSpotId, activeEntry])

  // Keep the route overlay aligned with the active marker while the map moves.
  useEffect(() => {
    const map = mapRef.current
    const frame = frameRef.current
    if (!map || !frame || !activeEntry) {
      setActiveAnchorPoint(null)
      return
    }

    const updateAnchorPoint = () => {
      const point = map.latLngToContainerPoint([activeEntry.spot.lat, activeEntry.spot.lng])
      const horizontalPadding = Math.min(112, frame.clientWidth / 2)
      const topPadding = Math.min(132, frame.clientHeight / 2)

      setActiveAnchorPoint({
        x: clamp(point.x, horizontalPadding, frame.clientWidth - horizontalPadding),
        y: clamp(point.y, topPadding, frame.clientHeight - 24),
      })
    }

    updateAnchorPoint()
    map.on('move', updateAnchorPoint)
    map.on('zoom', updateAnchorPoint)
    map.on('resize', updateAnchorPoint)

    return () => {
      map.off('move', updateAnchorPoint)
      map.off('zoom', updateAnchorPoint)
      map.off('resize', updateAnchorPoint)
    }
  }, [activeEntry])

  return (
    <div
      ref={frameRef}
      className="relative h-full w-full overflow-hidden"
      style={{ minHeight: '300px' }}
    >
      <div ref={containerRef} className="h-full w-full" />
      {activeAnchorPoint && routeChips.length > 0 && (
        <div
          className="map-route-overlay"
          style={{
            left: activeAnchorPoint.x,
            top: activeAnchorPoint.y,
          }}
        >
          {routeChips.map((chip) => (
            <button
              key={`${chip.variant}-${chip.label}`}
              type="button"
              onClick={chip.onClick}
              className={`map-route-chip map-route-chip--${chip.variant}`}
              aria-label={`${chip.label} の経路へ移動`}
            >
              <span className="map-route-chip__label">
                <span className="map-route-chip__arrow">{chip.arrow}</span>
                {chip.label}
              </span>
              <span className="map-route-chip__body">
                <span className="map-route-chip__title">{chip.title}</span>
                <span className="map-route-chip__detail">{chip.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
