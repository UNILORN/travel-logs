'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type LatLng = { lat: number; lng: number }
type DrawMode = 'rect' | 'poly' | null

interface Props {
  polygon: LatLng[] | undefined
  onChange: (polygon: LatLng[] | undefined) => void
  /** Center hint — defaults to Tokyo */
  initialCenter?: LatLng
}

export function AreaPolygonEditor({ polygon, onChange, initialCenter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.Polygon | null>(null)
  const tempLayerRef = useRef<L.Polygon | L.Rectangle | null>(null)
  const previewLineRef = useRef<L.Polyline | null>(null)
  const drawModeRef = useRef<DrawMode>(null)
  const rectStartRef = useRef<L.LatLng | null>(null)
  const polyPointsRef = useRef<L.LatLng[]>([])
  const [drawMode, setDrawMode] = useState<DrawMode>(null)
  const [polyPointCount, setPolyPointCount] = useState(0)

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center = initialCenter ?? { lat: 35.6762, lng: 139.6503 }
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: true,
      doubleClickZoom: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external polygon prop → display layer
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layerRef.current) {
      layerRef.current.remove()
      layerRef.current = null
    }

    if (polygon && polygon.length >= 3) {
      const latlngs = polygon.map((p) => [p.lat, p.lng] as L.LatLngExpression)
      const layer = L.polygon(latlngs, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map)
      layerRef.current = layer
      map.fitBounds(layer.getBounds(), { padding: [24, 24], maxZoom: 17 })
    }
  }, [polygon])

  // Wire map click / mousemove events based on active draw mode
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const handleClick = (e: L.LeafletMouseEvent) => {
      const mode = drawModeRef.current
      if (mode === 'rect') {
        if (!rectStartRef.current) {
          // First corner
          rectStartRef.current = e.latlng
        } else {
          // Second corner → finalise rectangle
          const sw = rectStartRef.current
          const ne = e.latlng
          const pts: LatLng[] = [
            { lat: sw.lat, lng: sw.lng },
            { lat: sw.lat, lng: ne.lng },
            { lat: ne.lat, lng: ne.lng },
            { lat: ne.lat, lng: sw.lng },
          ]
          rectStartRef.current = null
          cleanTempLayers(map)
          exitDrawMode()
          onChange(pts)
        }
      } else if (mode === 'poly') {
        polyPointsRef.current = [...polyPointsRef.current, e.latlng]
        setPolyPointCount(polyPointsRef.current.length)
        updatePreviewLine(map)
      }
    }

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      const mode = drawModeRef.current
      if (!mode) return

      if (mode === 'rect' && rectStartRef.current) {
        const sw = rectStartRef.current
        const ne = e.latlng
        if (tempLayerRef.current) tempLayerRef.current.remove()
        tempLayerRef.current = L.rectangle([sw, ne], {
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '4 4',
        }).addTo(map)
      } else if (mode === 'poly' && polyPointsRef.current.length > 0) {
        updatePreviewLine(map, e.latlng)
      }
    }

    map.on('click', handleClick)
    map.on('mousemove', handleMouseMove)

    return () => {
      map.off('click', handleClick)
      map.off('mousemove', handleMouseMove)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange])

  function cleanTempLayers(map: L.Map) {
    if (tempLayerRef.current) { tempLayerRef.current.remove(); tempLayerRef.current = null }
    if (previewLineRef.current) { previewLineRef.current.remove(); previewLineRef.current = null }
  }

  function updatePreviewLine(map: L.Map, cursor?: L.LatLng) {
    if (previewLineRef.current) { previewLineRef.current.remove(); previewLineRef.current = null }
    const pts = polyPointsRef.current
    if (pts.length === 0) return
    const coords: L.LatLngExpression[] = [...pts, ...(cursor ? [cursor] : [])]
    previewLineRef.current = L.polyline(coords, {
      color: '#10b981',
      weight: 2,
      dashArray: '4 4',
    }).addTo(map)
  }

  function exitDrawMode() {
    drawModeRef.current = null
    rectStartRef.current = null
    polyPointsRef.current = []
    setPolyPointCount(0)
    setDrawMode(null)
    const map = mapRef.current
    if (map) {
      map.getContainer().style.cursor = ''
      cleanTempLayers(map)
    }
  }

  function startDrawMode(mode: DrawMode) {
    const map = mapRef.current
    if (!map) return
    exitDrawMode()
    drawModeRef.current = mode
    setDrawMode(mode)
    map.getContainer().style.cursor = 'crosshair'
  }

  function finalisePolygon() {
    const pts = polyPointsRef.current
    if (pts.length >= 3) {
      const result: LatLng[] = pts.map((p) => ({ lat: p.lat, lng: p.lng }))
      exitDrawMode()
      onChange(result)
    }
  }

  const hasPolygon = polygon && polygon.length >= 3

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => startDrawMode('rect')}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
            drawMode === 'rect'
              ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          矩形を描く
        </button>
        <button
          type="button"
          onClick={() => startDrawMode('poly')}
          className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${
            drawMode === 'poly'
              ? 'border-emerald-400 bg-emerald-500/15 text-emerald-700'
              : 'border-border bg-background text-muted-foreground hover:bg-muted'
          }`}
        >
          多角形を描く
        </button>
        {drawMode === 'poly' && polyPointCount >= 3 && (
          <button
            type="button"
            onClick={finalisePolygon}
            className="rounded border border-emerald-400 bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/30"
          >
            完了 ({polyPointCount}点)
          </button>
        )}
        {drawMode && (
          <button
            type="button"
            onClick={exitDrawMode}
            className="rounded border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            キャンセル
          </button>
        )}
        {hasPolygon && !drawMode && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded border border-destructive/40 px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            クリア
          </button>
        )}
      </div>
      {drawMode === 'rect' && (
        <p className="text-[11px] text-muted-foreground">
          {rectStartRef.current ? '2点目をクリックして矩形を確定してください' : '1点目をクリックしてください'}
        </p>
      )}
      {drawMode === 'poly' && (
        <p className="text-[11px] text-muted-foreground">
          クリックで頂点を追加。3点以上で「完了」ボタンが表示されます。
        </p>
      )}
      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-border"
        style={{ minHeight: '14rem' }}
      />
      {hasPolygon && (
        <p className="text-[11px] text-muted-foreground">
          エリア: {polygon!.length}頂点のポリゴン
        </p>
      )}
    </div>
  )
}
