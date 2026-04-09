'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import type { AreaNode, MoveNode } from '@/lib/types'
import { TRANSPORT_LABELS } from '@/lib/types'
import type { NavigateEntry, NavigateAreaEntry, NavigateRouteSegment, NavigateSpotEntry } from '@/components/navigation/types'
import { formatDistanceKm, getTransportRouteStyle, getActiveTransportRouteStyle, hasVisibleMove } from '@/components/navigation/utils'
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

function createLocationMarkerIcon() {
  return L.divIcon({
    html: `<div class="location-dot"><div class="location-dot__pulse"></div><div class="location-dot__inner"></div></div>`,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

type SpotMarkerRole = 'active' | 'from' | 'to' | 'default'

function createSpotMarkerIcon({ sequence, name, role }: { sequence: number; name: string; role: SpotMarkerRole }) {
  const isActive = role === 'active'
  const isFrom = role === 'from'
  const isTo = role === 'to'
  const showLabel = isActive || isFrom || isTo
  const title = showLabel ? escapeHtml(truncateLabel(name, 12)) : ''

  const bubbleMod = isActive ? ' map-pin-bubble--active' : isFrom ? ' map-pin-bubble--from' : isTo ? ' map-pin-bubble--to' : ''
  const indexMod = isActive ? ' map-pin-index--active' : isFrom ? ' map-pin-index--from' : isTo ? ' map-pin-index--to' : ''
  const tipMod = isActive ? ' map-pin-tip--active' : isFrom ? ' map-pin-tip--from' : isTo ? ' map-pin-tip--to' : ''

  const html = `
    <div class="map-pin-shell${isActive ? ' map-pin-shell--active' : ''}">
      <span class="map-pin-bubble${bubbleMod}">
        <span class="map-pin-index${indexMod}">${sequence}</span>
        ${showLabel ? `<span class="map-pin-title">${title}</span>` : ''}
      </span>
      <span class="map-pin-tip${tipMod}"></span>
    </div>
  `

  return L.divIcon({
    html,
    className: 'map-pin-icon',
    iconSize: showLabel ? [160, 60] : [44, 48],
    iconAnchor: showLabel ? [80, 58] : [22, 46],
  })
}

function buildRouteChip(label: string, arrow: string, move: MoveNode) {
  return {
    kind: 'move' as const,
    label,
    arrow,
    title: truncateLabel(move.name, 18),
    detail: `${TRANSPORT_LABELS[move.transport]} · ${formatDistanceKm(move.distance)}`,
  }
}

function buildAreaChip(label: string, arrow: string, area: AreaNode) {
  const spotCountDetail =
    area.spotNames.length > 0 ? `${area.spotNames.length}スポット候補` : 'スポット候補未設定'
  return {
    kind: 'area' as const,
    label,
    arrow,
    title: truncateLabel(area.name, 18),
    detail: `${spotCountDetail} · ${area.time}-${area.endTime}`,
  }
}

type RouteChip = (ReturnType<typeof buildRouteChip> | ReturnType<typeof buildAreaChip>) & {
  variant: 'prev' | 'next' | 'area-prev' | 'area-next'
  onClick: () => void
}

export function MapView({
  spotEntries,
  routes,
  areaEntries,
  activeEntry,
  onMarkerClick,
  onPrevClick,
  onNextClick,
  userLocation,
  isFollowingLocation,
}: {
  spotEntries: NavigateSpotEntry[]
  routes: NavigateRouteSegment[]
  areaEntries: NavigateAreaEntry[]
  activeEntry: NavigateEntry | null
  onMarkerClick: (spotId: string) => void
  onPrevClick: () => void
  onNextClick: () => void
  userLocation: { lat: number; lng: number } | null
  isFollowingLocation: boolean
}) {
  const mapRef = useRef<L.Map | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline[]>([])
  const areaPolygonsRef = useRef<L.Polygon[]>([])
  const locationMarkerRef = useRef<L.Marker | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  const [activeAnchorPoint, setActiveAnchorPoint] = useState<AnchorPoint | null>(null)
  onMarkerClickRef.current = onMarkerClick

  // Derive the spot ID that is actively "selected" (null when a move/area is active)
  const activeSpotId = activeEntry?.type === 'spot' ? activeEntry.id : null
  const activeMoveEntry = activeEntry?.type === 'move' ? activeEntry : null
  const fromSpotId = activeMoveEntry?.fromSpot?.id
  const toSpotId = activeMoveEntry?.toSpot?.id
  const activeMoveId = activeMoveEntry?.id ?? null

  const activeSpotEntry = useMemo(
    () => (activeEntry?.type === 'spot' ? activeEntry : null),
    [activeEntry]
  )
  const prevMove = activeSpotEntry?.prevMove
  const nextMove = activeSpotEntry?.nextMove
  const prevArea = activeSpotEntry?.prevArea
  const nextArea = activeSpotEntry?.nextArea
  const visiblePrevMove = hasVisibleMove(prevMove) ? prevMove : undefined
  const visibleNextMove = hasVisibleMove(nextMove) ? nextMove : undefined
  const routeChips = useMemo(() => {
    if (!activeSpotEntry) return []
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

    if (prevArea) {
      chips.push({
        ...buildAreaChip('Prev Area', '◁', prevArea),
        variant: 'area-prev' as const,
        onClick: onPrevClick,
      })
    }

    if (nextArea) {
      chips.push({
        ...buildAreaChip('Next Area', '▷', nextArea),
        variant: 'area-next' as const,
        onClick: onNextClick,
      })
    }

    return chips
  }, [nextArea, onNextClick, onPrevClick, prevArea, visiblePrevMove, visibleNextMove, activeSpotEntry])

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: L.LatLngExpression =
      spotEntries.length > 0
        ? [spotEntries[0].node.lat, spotEntries[0].node.lng]
        : [35.6762, 139.6503]

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

  // Update spot markers and route polylines
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Clear existing markers and polylines
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []
    polylineRef.current.forEach((polyline) => polyline.remove())
    polylineRef.current = []

    // Add spot markers
    spotEntries.forEach((entry) => {
      const role: SpotMarkerRole =
        entry.id === activeSpotId
          ? 'active'
          : entry.id === fromSpotId
            ? 'from'
            : entry.id === toSpotId
              ? 'to'
              : 'default'
      const marker = L.marker([entry.node.lat, entry.node.lng], {
        icon: createSpotMarkerIcon({
          sequence: entry.sequence,
          name: entry.node.name,
          role,
        }),
        zIndexOffset: role === 'active' ? 1000 : role === 'from' || role === 'to' ? 500 : entry.sequence,
      }).addTo(map)

      marker.on('click', () => onMarkerClickRef.current(entry.id))
      markersRef.current.push(marker)
    })

    // Add route polylines — active route gets a glow layer + thicker stroke
    for (const route of routes) {
      if (route.points.length < 2) continue
      const isActiveLine = route.id === activeMoveId
      const style = isActiveLine
        ? getActiveTransportRouteStyle(route.move.transport)
        : getTransportRouteStyle(route.move.transport)
      const latlngs: L.LatLngExpression[] = route.points.map((point) => [point.lat, point.lng])

      if (isActiveLine) {
        // Glow / halo layer beneath the main stroke
        const glowLine = L.polyline(latlngs, {
          color: style.color,
          weight: 16,
          opacity: 0.22,
          interactive: false,
          dashArray: style.dashArray,
        }).addTo(map)
        polylineRef.current.push(glowLine)
      }

      const polyline = L.polyline(latlngs, {
        ...style,
        interactive: false,
      }).addTo(map)
      polylineRef.current.push(polyline)
    }
  }, [spotEntries, routes, activeSpotId, fromSpotId, toSpotId, activeMoveId])

  // Update area polygons
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    areaPolygonsRef.current.forEach((p) => p.remove())
    areaPolygonsRef.current = []

    const isActiveArea = activeEntry?.type === 'area'

    areaEntries.forEach((entry) => {
      const polygon = entry.node.polygon
      if (!polygon || polygon.length < 3) return

      const isActive = isActiveArea && entry.id === activeEntry?.id
      const latlngs = polygon.map((p) => [p.lat, p.lng] as L.LatLngExpression)
      const poly = L.polygon(latlngs, {
        color: isActive ? '#10b981' : '#6ee7b7',
        fillColor: isActive ? '#10b981' : '#a7f3d0',
        fillOpacity: isActive ? 0.25 : 0.12,
        weight: isActive ? 2.5 : 1.5,
        interactive: false,
      }).addTo(map)
      areaPolygonsRef.current.push(poly)
    })
  }, [areaEntries, activeEntry])

  // Pan / fit bounds when active entry changes
  useEffect(() => {
    const map = mapRef.current
    if (!map || isFollowingLocation) return
    if (!activeEntry) return

    if (activeEntry.type === 'spot') {
      map.flyTo([activeEntry.node.lat, activeEntry.node.lng], 14, { duration: 0.8 })
    } else if (activeEntry.type === 'move') {
      if (activeEntry.routePoints.length >= 2) {
        const latlngs = activeEntry.routePoints.map((p) => [p.lat, p.lng] as L.LatLngExpression)
        const bounds = L.latLngBounds(latlngs)
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 0.8 })
      } else if (activeEntry.fromSpot && activeEntry.toSpot) {
        const bounds = L.latLngBounds([
          [activeEntry.fromSpot.lat, activeEntry.fromSpot.lng],
          [activeEntry.toSpot.lat, activeEntry.toSpot.lng],
        ])
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, animate: true, duration: 0.8 })
      }
    } else if (activeEntry.type === 'area') {
      const polygon = activeEntry.node.polygon
      if (polygon && polygon.length >= 3) {
        const bounds = L.latLngBounds(polygon.map((p) => [p.lat, p.lng] as L.LatLngExpression))
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true, duration: 0.8 })
      }
    }
  }, [activeEntry, isFollowingLocation])

  // Update current location marker and pan when following
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!userLocation) {
      if (locationMarkerRef.current) {
        locationMarkerRef.current.remove()
        locationMarkerRef.current = null
      }
      return
    }

    if (locationMarkerRef.current) {
      locationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng])
    } else {
      locationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: createLocationMarkerIcon(),
        zIndexOffset: 2000,
        interactive: false,
      }).addTo(map)
    }

    if (isFollowingLocation) {
      map.panTo([userLocation.lat, userLocation.lng], { animate: true, duration: 0.5 })
    }
  }, [userLocation, isFollowingLocation])

  // Keep the route overlay aligned with the active spot marker while the map moves.
  // Only shown when a spot is the active entry.
  useEffect(() => {
    const map = mapRef.current
    const frame = frameRef.current
    if (!map || !frame || !activeSpotEntry) {
      setActiveAnchorPoint(null)
      return
    }

    const updateAnchorPoint = () => {
      const point = map.latLngToContainerPoint([activeSpotEntry.node.lat, activeSpotEntry.node.lng])
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
  }, [activeSpotEntry])

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
              className={`map-route-chip map-route-chip--${chip.variant}${chip.kind === 'area' ? ' map-route-chip--area' : ''}`}
              aria-label={`${chip.label} の情報へ移動`}
            >
              <span className="map-route-chip__label">
                <span className="map-route-chip__arrow">{chip.arrow}</span>
                {chip.label}
              </span>
              <span className="map-route-chip__body">
                <span className="map-route-chip__title">{chip.title}</span>
                <span className={`map-route-chip__detail${chip.kind === 'area' ? ' map-route-chip__detail--area' : ''}`}>{chip.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
