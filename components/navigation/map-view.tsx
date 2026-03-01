'use client'

import { useEffect, useRef } from 'react'
import type { SpotNode } from '@/lib/types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default marker icons for leaflet in bundled environments
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const activeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [49, 49],
  className: 'active-marker',
})

export function MapView({
  spots,
  activeSpotId,
  onMarkerClick,
}: {
  spots: SpotNode[]
  activeSpotId: string | null
  onMarkerClick: (spotId: string) => void
}) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const polylineRef = useRef<L.Polyline | null>(null)
  const onMarkerClickRef = useRef(onMarkerClick)
  onMarkerClickRef.current = onMarkerClick

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center: L.LatLngExpression =
      spots.length > 0 ? [spots[0].lat, spots[0].lng] : [35.6762, 139.6503]

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
    spots.forEach((spot) => {
      const isActive = spot.id === activeSpotId
      const marker = L.marker([spot.lat, spot.lng], {
        icon: isActive ? activeIcon : defaultIcon,
        zIndexOffset: isActive ? 1000 : 0,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${spot.name}</strong><br/><small>${spot.time} - ${spot.endTime}</small>`
        )

      marker.on('click', () => onMarkerClickRef.current(spot.id))
      markersRef.current.push(marker)
    })

    // Draw polyline between spots
    if (spots.length > 1) {
      const latlngs: L.LatLngExpression[] = spots.map((s) => [s.lat, s.lng])
      polylineRef.current = L.polyline(latlngs, {
        color: 'oklch(0.45 0.1 175)',
        weight: 3,
        opacity: 0.6,
        dashArray: '8, 8',
      }).addTo(map)
    }
  }, [spots, activeSpotId])

  // Pan to active spot
  useEffect(() => {
    const map = mapRef.current
    if (!map || !activeSpotId) return
    const spot = spots.find((s) => s.id === activeSpotId)
    if (spot) {
      map.flyTo([spot.lat, spot.lng], 14, { duration: 0.8 })
    }
  }, [activeSpotId, spots])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: '300px' }}
    />
  )
}
