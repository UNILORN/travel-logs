'use client'

import { useEffect, useRef, useState } from 'react'
import type { LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'

type LeafletModule = typeof import('leaflet')

export function SpotLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markerRef = useRef<import('leaflet').Marker | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const onChangeRef = useRef(onChange)
  const hasFittedRef = useRef(false)
  const [isMapReady, setIsMapReady] = useState(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let disposed = false

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return
      const L = await import('leaflet')
      if (disposed || !mapContainerRef.current || mapRef.current) return
      leafletRef.current = L

      const center: import('leaflet').LatLngExpression =
        lat != null && lng != null ? [lat, lng] : [35.6762, 139.6503]

      const map = L.map(mapContainerRef.current, {
        center,
        zoom: lat != null && lng != null ? 14 : 6,
        zoomControl: false,
      })
      L.control.zoom({ position: 'topright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      mapRef.current = map
      setIsMapReady(true)

      map.on('click', (event: LeafletMouseEvent) => {
        const { lat: newLat, lng: newLng } = event.latlng
        onChangeRef.current(newLat, newLng)
      })
    }

    void initMap()

    return () => {
      disposed = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
      leafletRef.current = null
      hasFittedRef.current = false
      setIsMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync marker when lat/lng or map readiness changes
  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L || !isMapReady) return

    if (lat == null || lng == null) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (!hasFittedRef.current) {
      map.setView([lat, lng], 14)
      hasFittedRef.current = true
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;"><span style="display:block;width:16px;height:16px;border-radius:999px;background:#2563eb;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></span></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
      const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map)
      marker.on('dragend', (event) => {
        const latlng = (event.target as import('leaflet').Marker).getLatLng()
        onChangeRef.current(latlng.lat, latlng.lng)
      })
      markerRef.current = marker
    }
  }, [lat, lng, isMapReady])

  return (
    <div className="flex flex-col gap-1.5">
      <div ref={mapContainerRef} className="h-[220px] w-full rounded-md border border-border" />
      <p className="text-[11px] text-muted-foreground">
        {lat != null && lng != null
          ? `${lat.toFixed(6)}, ${lng.toFixed(6)} — クリックまたはドラッグで移動`
          : '地図をクリックして位置を設定'}
      </p>
    </div>
  )
}
