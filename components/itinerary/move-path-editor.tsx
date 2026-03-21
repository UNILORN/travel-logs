'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { LatLngPoint } from '@/lib/move-path'

type LeafletModule = typeof import('leaflet')

type EditMode = 'add' | 'remove'

interface FullPathItem {
  kind: 'start' | 'middle' | 'end'
  point: LatLngPoint
  middleIndex?: number
}

function buildFullPathItems(params: {
  startPoint?: LatLngPoint
  endPoint?: LatLngPoint
  middlePoints: LatLngPoint[]
}) {
  const items: FullPathItem[] = []
  if (params.startPoint) {
    items.push({ kind: 'start', point: params.startPoint })
  }
  params.middlePoints.forEach((point, index) => {
    items.push({ kind: 'middle', point, middleIndex: index })
  })
  if (params.endPoint) {
    items.push({ kind: 'end', point: params.endPoint })
  }
  return items
}

function createPointIcon(L: LeafletModule, color: string, label?: string, clickable = false) {
  const cursorStyle = clickable ? 'cursor: pointer;' : ''
  const caption = label
    ? `<span style="position:absolute;bottom:100%;left:50%;transform:translate(-50%,-2px);font-size:10px;font-weight:700;color:${color};white-space:nowrap;">${label}</span>`
    : ''

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;${cursorStyle}">${caption}<span style="display:block;width:14px;height:14px;border-radius:999px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></span></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function calcPointToSegmentDistancePx(
  map: import('leaflet').Map,
  target: LatLngPoint,
  from: LatLngPoint,
  to: LatLngPoint
) {
  const p = map.latLngToLayerPoint([target.lat, target.lng])
  const a = map.latLngToLayerPoint([from.lat, from.lng])
  const b = map.latLngToLayerPoint([to.lat, to.lng])
  const apx = p.x - a.x
  const apy = p.y - a.y
  const abx = b.x - a.x
  const aby = b.y - a.y
  const abLenSq = abx * abx + aby * aby
  if (abLenSq === 0) return Math.hypot(apx, apy)
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq))
  const closestX = a.x + abx * t
  const closestY = a.y + aby * t
  return Math.hypot(p.x - closestX, p.y - closestY)
}

function getInsertionIndex(items: FullPathItem[], segmentIndex: number) {
  const left = items[segmentIndex]
  const right = items[segmentIndex + 1]

  if (right.kind === 'middle' && typeof right.middleIndex === 'number') {
    return right.middleIndex
  }
  if (left.kind === 'middle' && typeof left.middleIndex === 'number') {
    return left.middleIndex + 1
  }
  return 0
}

export function MovePathEditor({
  startPoint,
  endPoint,
  middlePoints,
  onChange,
}: {
  startPoint?: LatLngPoint
  endPoint?: LatLngPoint
  middlePoints: LatLngPoint[]
  onChange: (points: LatLngPoint[]) => void
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import('leaflet').Map | null>(null)
  const markerLayerRef = useRef<import('leaflet').LayerGroup | null>(null)
  const lineLayerRef = useRef<import('leaflet').Polyline | null>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const dragPointIndexRef = useRef<number | null>(null)
  const modeRef = useRef<EditMode>('add')
  const middlePointsRef = useRef<LatLngPoint[]>(middlePoints)
  const onChangeRef = useRef(onChange)
  const suppressMapClickRef = useRef(false)
  const hasFittedRef = useRef(false)
  const [mode, setMode] = useState<EditMode>('add')
  const [isMapReady, setIsMapReady] = useState(false)

  const fullPathItems = useMemo(
    () => buildFullPathItems({ startPoint, endPoint, middlePoints }),
    [startPoint, endPoint, middlePoints]
  )

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    middlePointsRef.current = middlePoints
  }, [middlePoints])

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let disposed = false
    let cleanupMapClick: (() => void) | null = null

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return

      const L = await import('leaflet')
      if (disposed || !mapContainerRef.current || mapRef.current) return
      leafletRef.current = L

      const firstPoint = fullPathItems[0]?.point
      const center: import('leaflet').LatLngExpression = firstPoint
        ? [firstPoint.lat, firstPoint.lng]
        : [35.6762, 139.6503]
      const map = L.map(mapContainerRef.current, {
        center,
        zoom: 8,
        zoomControl: false,
      })

      L.control.zoom({ position: 'topright' }).addTo(map)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      markerLayerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setIsMapReady(true)

      const handleMapClick = (event: LeafletMouseEvent) => {
        if (suppressMapClickRef.current) {
          suppressMapClickRef.current = false
          return
        }
        if (modeRef.current !== 'add') return

        const nextPoints = [
          ...middlePointsRef.current,
          { lat: event.latlng.lat, lng: event.latlng.lng },
        ]
        middlePointsRef.current = nextPoints
        onChangeRef.current(nextPoints)
      }

      map.on('click', handleMapClick)
      cleanupMapClick = () => {
        map.off('click', handleMapClick)
      }
    }

    void initMap()

    return () => {
      disposed = true
      cleanupMapClick?.()
      mapRef.current?.remove()
      mapRef.current = null
      markerLayerRef.current = null
      lineLayerRef.current = null
      leafletRef.current = null
      setIsMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    if (!map || !L) return

    if (fullPathItems.length > 0 && !hasFittedRef.current) {
      const bounds = L.latLngBounds(
        fullPathItems.map(
          (item) => [item.point.lat, item.point.lng] as import('leaflet').LatLngTuple
        )
      )
      map.fitBounds(bounds.pad(0.25))
      hasFittedRef.current = true
    }
  }, [fullPathItems, isMapReady])

  useEffect(() => {
    const map = mapRef.current
    const L = leafletRef.current
    const markerLayer = markerLayerRef.current
    if (!map || !L || !markerLayer) return

    markerLayer.clearLayers()
    lineLayerRef.current?.remove()
    lineLayerRef.current = null

    const fullPoints = fullPathItems.map((item) => item.point)

    let handleMouseMove: ((event: LeafletMouseEvent) => void) | null = null
    let handleMouseUp: (() => void) | null = null

    const clearDragHandlers = () => {
      if (handleMouseMove) {
        map.off('mousemove', handleMouseMove)
        handleMouseMove = null
      }
      if (handleMouseUp) {
        map.off('mouseup', handleMouseUp)
        handleMouseUp = null
      }
      map.dragging.enable()
      dragPointIndexRef.current = null
    }

    if (fullPoints.length >= 2) {
      lineLayerRef.current = L.polyline(
        fullPoints.map((point) => [point.lat, point.lng] as import('leaflet').LatLngTuple),
        { color: '#2563eb', weight: 4, opacity: 0.8 }
      ).addTo(map)

      lineLayerRef.current.on('mousedown', (event: LeafletMouseEvent) => {
        if (modeRef.current !== 'add') return
        if (fullPathItems.length < 2) return

        event.originalEvent.preventDefault()
        suppressMapClickRef.current = true

        let nearestSegmentIndex = 0
        let nearestDistance = Number.POSITIVE_INFINITY

        for (let i = 0; i < fullPathItems.length - 1; i += 1) {
          const distance = calcPointToSegmentDistancePx(
            map,
            { lat: event.latlng.lat, lng: event.latlng.lng },
            fullPathItems[i].point,
            fullPathItems[i + 1].point
          )
          if (distance < nearestDistance) {
            nearestDistance = distance
            nearestSegmentIndex = i
          }
        }

        const insertionIndex = getInsertionIndex(fullPathItems, nearestSegmentIndex)
        const inserted = { lat: event.latlng.lat, lng: event.latlng.lng }
        let draftPoints = [...middlePointsRef.current]
        draftPoints.splice(insertionIndex, 0, inserted)
        middlePointsRef.current = draftPoints

        dragPointIndexRef.current = insertionIndex
        map.dragging.disable()

        handleMouseMove = (moveEvent: LeafletMouseEvent) => {
          const dragIndex = dragPointIndexRef.current
          if (dragIndex == null) return
          draftPoints = [...draftPoints]
          draftPoints.splice(dragIndex, 1, {
            lat: moveEvent.latlng.lat,
            lng: moveEvent.latlng.lng,
          })
          middlePointsRef.current = draftPoints
        }
        handleMouseUp = () => {
          onChangeRef.current(draftPoints)
          clearDragHandlers()
        }
        map.on('mousemove', handleMouseMove)
        map.on('mouseup', handleMouseUp)
      })
    }

    if (startPoint) {
      L.marker([startPoint.lat, startPoint.lng], {
        icon: createPointIcon(L, '#16a34a', 'Start'),
        interactive: false,
      }).addTo(markerLayer)
    }

    if (endPoint) {
      L.marker([endPoint.lat, endPoint.lng], {
        icon: createPointIcon(L, '#dc2626', 'End'),
        interactive: false,
      }).addTo(markerLayer)
    }

    middlePoints.forEach((point, middleIndex) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: createPointIcon(L, '#2563eb', undefined, true),
        draggable: true,
      }).addTo(markerLayer)

      marker.on('dragend', (event) => {
        const markerLatLng = event.target.getLatLng()
        const nextPoints = [...middlePointsRef.current]
        nextPoints[middleIndex] = { lat: markerLatLng.lat, lng: markerLatLng.lng }
        middlePointsRef.current = nextPoints
        onChangeRef.current(nextPoints)
      })

      marker.on('click', () => {
        if (modeRef.current !== 'remove') return
        const nextPoints = middlePointsRef.current.filter((_, index) => index !== middleIndex)
        middlePointsRef.current = nextPoints
        onChangeRef.current(nextPoints)
      })
    })

    return () => {
      clearDragHandlers()
      lineLayerRef.current?.off()
    }
  }, [startPoint, endPoint, fullPathItems, middlePoints, isMapReady])

  return (
    <div className="rounded-md border border-border p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">経路編集: 追加でクリック、削除は点クリック</p>
        <div className="inline-flex rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setMode('add')}
            className={`rounded px-2 py-1 text-xs font-medium ${
              mode === 'add' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            追加
          </button>
          <button
            type="button"
            onClick={() => setMode('remove')}
            className={`rounded px-2 py-1 text-xs font-medium ${
              mode === 'remove'
                ? 'bg-destructive/10 text-destructive'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            削除
          </button>
        </div>
      </div>
      <div
        ref={mapContainerRef}
        className="h-[44vh] min-h-[320px] w-full rounded-md md:h-[56vh] md:min-h-[520px]"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        線上を押したままドラッグすると途中点を追加できます。始点/終点は固定です。
      </p>
    </div>
  )
}
