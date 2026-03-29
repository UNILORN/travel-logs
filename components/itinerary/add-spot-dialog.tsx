'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTripContext } from '@/lib/trip-context'
import { TRANSPORT_LABELS, type MoveNode, type Spot, type TransportType } from '@/lib/types'
import {
  buildMovePathPoints,
  extractEditableMiddlePoints,
  findMoveAnchorSpots,
  findMoveAnchorSpotsByWindow,
  type LatLngPoint,
} from '@/lib/move-path'
import { getTripTimelineNodes } from '@/lib/timeline-nodes'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MovePathEditor } from './move-path-editor'
import type { AddNodeKind } from './timeline'

type SpotTransport = TransportType

interface SpotSearchResult {
  id: string
  fsqId: string | null
  name: string
  address: string
  lat: number | null
  lng: number | null
  source: 'foursquare'
}

function createFoursquareSessionToken() {
  // Foursquare Autocomplete requires exactly 32 alphanumeric chars.
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
    .replace(/[^a-zA-Z0-9]/g, '')
    .padEnd(32, '0')
    .slice(0, 32)
}

function getDefaultMoveName(transport: SpotTransport) {
  return `${TRANSPORT_LABELS[transport]}で移動`
}

function toPoint(lat?: number, lng?: number): LatLngPoint | undefined {
  if (typeof lat !== 'number' || typeof lng !== 'number') return undefined
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined
  return { lat, lng }
}

export function AddSpotDialog({
  tripId,
  open,
  onOpenChange,
  defaultDay,
  defaultTime,
  defaultEndTime,
  defaultNodeType = 'spot',
  editingSpot = null,
  editingMove = null,
  mode = 'dialog',
}: {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDay: number
  defaultTime?: string
  defaultEndTime?: string
  defaultNodeType?: AddNodeKind
  editingSpot?: Spot | null
  editingMove?: MoveNode | null
  mode?: 'dialog' | 'sidebar'
}) {
  const { addSpot, addNode, updateSpot, updateNode, getTrip } = useTripContext()
  const [nodeType, setNodeType] = useState<AddNodeKind>(defaultNodeType)
  const [name, setName] = useState('')
  const [time, setTime] = useState(defaultTime ?? '10:00')
  const [endTime, setEndTime] = useState(defaultEndTime ?? '12:00')
  const [day, setDay] = useState(defaultDay)
  const [notes, setNotes] = useState('')
  const [transport, setTransport] = useState<SpotTransport>('train')
  const [distance, setDistance] = useState(0)
  const [areaSpotsText, setAreaSpotsText] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [image, setImage] = useState('')
  const [searchResults, setSearchResults] = useState<SpotSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchProvider, setSearchProvider] = useState<'foursquare' | null>(null)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [searchSessionToken, setSearchSessionToken] = useState('')
  const [isResolvingSpotDetails, setIsResolvingSpotDetails] = useState(false)
  const [movePathMiddlePoints, setMovePathMiddlePoints] = useState<LatLngPoint[]>([])
  const isEditingSpot = Boolean(editingSpot)
  const isEditingMove = Boolean(editingMove)
  const isEditingNode = isEditingSpot || isEditingMove
  const dialogContentClassName = isEditingMove
    ? 'h-[92vh] w-[98vw] max-w-[98vw] overflow-y-auto sm:max-w-[1400px]'
    : 'max-h-[90vh] w-[94vw] max-w-[94vw] overflow-y-auto sm:max-w-4xl'
  const isSpotSearchEnabled = process.env.NEXT_PUBLIC_ENABLE_SPOT_SEARCH !== '0'
  const trip = getTrip(tripId)
  const timelineNodes = useMemo(() => (trip ? getTripTimelineNodes(trip) : []), [trip])

  const canSearchSpot = isSpotSearchEnabled && open && nodeType === 'spot' && name.trim().length >= 2
  const searchQuery = useMemo(() => name.trim(), [name])

  useEffect(() => {
    if (!open) return
    setSearchSessionToken(createFoursquareSessionToken())
    setSearchResults([])
    setSearchError(null)
    setSearchProvider(null)
    setShowSearchDropdown(false)
    setIsResolvingSpotDetails(false)

    if (editingSpot) {
      setNodeType('spot')
      setName(editingSpot.name)
      setTime(editingSpot.time)
      setEndTime(editingSpot.endTime)
      setDay(editingSpot.day)
      setNotes(editingSpot.notes)
      setTransport(editingSpot.transport)
      setDistance(editingSpot.distance)
      setAreaSpotsText('')
      setAddress(editingSpot.address)
      setLat(editingSpot.lat)
      setLng(editingSpot.lng)
      setImage(editingSpot.image)
      return
    }

    if (editingMove) {
      setNodeType('move')
      setName(editingMove.name)
      setTime(editingMove.time)
      setEndTime(editingMove.endTime)
      setDay(editingMove.day)
      setNotes(editingMove.notes)
      setTransport(editingMove.transport)
      setDistance(editingMove.distance)
      setAreaSpotsText('')
      setAddress('')
      setLat(null)
      setLng(null)
      setImage(editingMove.image)
      const moveAnchors = findMoveAnchorSpots(timelineNodes, editingMove.id)
      const fullPath = buildMovePathPoints(editingMove, {
        from: moveAnchors.fromSpot ? { lat: moveAnchors.fromSpot.lat, lng: moveAnchors.fromSpot.lng } : undefined,
        to: moveAnchors.toSpot ? { lat: moveAnchors.toSpot.lat, lng: moveAnchors.toSpot.lng } : undefined,
      })
      setMovePathMiddlePoints(
        extractEditableMiddlePoints(fullPath, {
          from: moveAnchors.fromSpot
            ? { lat: moveAnchors.fromSpot.lat, lng: moveAnchors.fromSpot.lng }
            : undefined,
          to: moveAnchors.toSpot ? { lat: moveAnchors.toSpot.lat, lng: moveAnchors.toSpot.lng } : undefined,
        })
      )
      return
    }

    setDay(defaultDay)
    setTime(defaultTime ?? '10:00')
    setEndTime(defaultEndTime ?? '12:00')
    setNodeType(defaultNodeType)
    setTransport('train')
    setName(defaultNodeType === 'move' ? getDefaultMoveName('train') : '')
    setNotes('')
    setDistance(0)
    setAreaSpotsText('')
    setAddress('')
    setLat(null)
    setLng(null)
    setImage('')
    setMovePathMiddlePoints([])
  }, [open, defaultDay, defaultTime, defaultEndTime, defaultNodeType, editingSpot, editingMove, timelineNodes])

  const resetForm = () => {
    setName('')
    setNotes('')
    setTransport('train')
    setDistance(0)
    setAreaSpotsText('')
    setAddress('')
    setLat(null)
    setLng(null)
    setImage('')
    setSearchResults([])
    setSearchError(null)
    setSearchProvider(null)
    setShowSearchDropdown(false)
    setMovePathMiddlePoints([])
  }

  const moveAnchors = useMemo(() => {
    if (nodeType !== 'move') {
      return { from: undefined, to: undefined }
    }

    if (editingMove) {
      const { fromSpot, toSpot } = findMoveAnchorSpots(timelineNodes, editingMove.id)
      return {
        from: fromSpot ? { lat: fromSpot.lat, lng: fromSpot.lng } : toPoint(editingMove.fromLat, editingMove.fromLng),
        to: toSpot ? { lat: toSpot.lat, lng: toSpot.lng } : toPoint(editingMove.toLat, editingMove.toLng),
      }
    }

    const { fromSpot, toSpot } = findMoveAnchorSpotsByWindow(timelineNodes, { day, time, endTime })
    return {
      from: fromSpot ? { lat: fromSpot.lat, lng: fromSpot.lng } : undefined,
      to: toSpot ? { lat: toSpot.lat, lng: toSpot.lng } : undefined,
    }
  }, [day, editingMove, endTime, nodeType, time, timelineNodes])

  useEffect(() => {
    if (!canSearchSpot) {
      setIsSearching(false)
      setSearchResults([])
      setSearchError(null)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true)
        setSearchError(null)
        const params = new URLSearchParams({
          q: searchQuery,
          limit: '6',
        })
        if (searchSessionToken) {
          params.set('session_token', searchSessionToken)
        }
        const res = await fetch(`/api/spot-search?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`search failed: ${res.status}`)
        const data = (await res.json()) as {
          provider?: 'foursquare'
          results?: SpotSearchResult[]
        }
        setSearchProvider(data.provider ?? null)
        setSearchResults(data.results ?? [])
        if (!isEditingSpot) {
          setShowSearchDropdown(true)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setSearchError('スポット検索に失敗しました')
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [canSearchSpot, searchQuery, searchSessionToken, isEditingSpot])

  const handleSelectSpotSearchResult = (result: SpotSearchResult) => {
    setName(result.name)
    setAddress(result.address)
    setLat(result.lat)
    setLng(result.lng)
    setShowSearchDropdown(false)
    if (!notes) {
      setNotes(result.address)
    }

    if ((result.lat == null || result.lng == null) && result.fsqId) {
      void (async () => {
        try {
          setIsResolvingSpotDetails(true)
          const res = await fetch(`/api/spot-search?fsq_id=${encodeURIComponent(result.fsqId!)}`)
          if (!res.ok) return
          const data = (await res.json()) as { place?: SpotSearchResult }
          if (!data.place) return
          setName(data.place.name || result.name)
          setAddress(data.place.address || result.address)
          setLat(data.place.lat)
          setLng(data.place.lng)
          if (!notes && data.place.address) {
            setNotes(data.place.address)
          }
        } finally {
          setIsResolvingSpotDetails(false)
        }
      })()
    }
  }

  const handleSelectNodeType = (nextType: AddNodeKind) => {
    setNodeType(nextType)
    if (nextType === 'move' && !name.trim()) {
      setName(getDefaultMoveName(transport))
    }
  }

  const handleTransportChange = (nextTransport: SpotTransport) => {
    const currentDefaultName = getDefaultMoveName(transport)
    setTransport(nextTransport)

    if (nodeType === 'move' && (!name.trim() || name === currentDefaultName)) {
      setName(getDefaultMoveName(nextTransport))
    }
  }

  const handleAdd = () => {
    const trimmedName = name.trim()
    const resolvedImage = image.trim()
    const resolvedName =
      nodeType === 'move' ? trimmedName || getDefaultMoveName(transport) : trimmedName
    if (!resolvedName || !time || !endTime) return

    const movePath = movePathMiddlePoints

    if (nodeType === 'spot') {
      const nextSpot = {
        name: resolvedName,
        time,
        endTime,
        day,
        address,
        lat: lat ?? editingSpot?.lat ?? 35.0 + Math.random() * 0.5,
        lng: lng ?? editingSpot?.lng ?? 135.0 + Math.random() * 0.5,
        image: resolvedImage,
        notes,
        transport,
        distance,
      }

      if (editingSpot) {
        updateSpot(tripId, editingSpot.id, nextSpot)
      } else {
        addSpot(tripId, nextSpot)
      }
    } else if (nodeType === 'move') {
      if (editingMove) {
        updateNode(tripId, editingMove.id, {
          name: resolvedName,
          time,
          endTime,
          day,
          transport,
          distance,
          image: resolvedImage,
          notes,
          fromLat: moveAnchors.from?.lat,
          fromLng: moveAnchors.from?.lng,
          toLat: moveAnchors.to?.lat,
          toLng: moveAnchors.to?.lng,
          path: movePath,
        })
      } else {
        addNode(tripId, {
          type: 'move',
          name: resolvedName,
          time,
          endTime,
          day,
          transport,
          distance,
          image: resolvedImage,
          notes,
          fromLat: moveAnchors.from?.lat,
          fromLng: moveAnchors.from?.lng,
          toLat: moveAnchors.to?.lat,
          toLng: moveAnchors.to?.lng,
          path: movePath,
        })
      }
    } else {
      const spotNames = areaSpotsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      addNode(tripId, {
        type: 'area',
        name: resolvedName,
        time,
        endTime,
        day,
        notes,
        spotNames,
      })
    }

    onOpenChange(false)
    resetForm()
  }

  const title = isEditingSpot ? 'スポットを編集' : isEditingMove ? '移動を編集' : 'ノードを追加'
  const saveDisabled =
    (!name.trim() && nodeType !== 'move') || (nodeType === 'spot' && isResolvingSpotDetails)
  const saveLabel =
    nodeType === 'spot' && isResolvingSpotDetails
      ? '座標を取得中...'
      : isEditingSpot
        ? 'スポットを保存'
        : isEditingMove
          ? '移動を保存'
          : nodeType === 'spot'
            ? 'スポットを追加'
            : nodeType === 'move'
              ? '移動を追加'
              : 'エリアを追加'

  const formBody = (
    <div className="flex flex-col gap-4">
      {!isEditingNode && (
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleSelectNodeType('spot')}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              nodeType === 'spot'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            スポット
          </button>
          <button
            type="button"
            onClick={() => handleSelectNodeType('area')}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              nodeType === 'area'
                ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-700'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            エリア
          </button>
          <button
            type="button"
            onClick={() => handleSelectNodeType('move')}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              nodeType === 'move'
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            移動
          </button>
        </div>
      )}

      {!isEditingNode && (defaultTime || defaultEndTime) && (
        <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
          スキマ時間の候補: {defaultTime ?? '未設定'} - {defaultEndTime ?? '未設定'}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="node-name">
          {nodeType === 'spot' ? '場所の名前' : nodeType === 'area' ? 'エリア名' : '移動名'}
        </Label>
        <div className="relative">
          <Input
            id="node-name"
            placeholder={
              nodeType === 'spot'
                ? '例：東京タワー / 清水寺'
                : nodeType === 'area'
                  ? '例：祇園・東山エリア散策'
                  : '例：ロープウェイで移動'
            }
            value={name}
            autoComplete="off"
            onFocus={() => {
              if (
                isSpotSearchEnabled &&
                nodeType === 'spot' &&
                (searchResults.length > 0 || isSearching)
              ) {
                setShowSearchDropdown(true)
              }
            }}
            onChange={(e) => {
              setName(e.target.value)
              if (isSpotSearchEnabled && nodeType === 'spot') {
                setShowSearchDropdown(true)
                setSearchError(null)
                setAddress('')
                setLat(null)
                setLng(null)
              }
            }}
          />

          {isSpotSearchEnabled &&
            nodeType === 'spot' &&
            showSearchDropdown &&
            (isSearching || searchError || searchResults.length > 0) && (
            <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
              <div className="max-h-56 overflow-y-auto p-1">
                {isSearching && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">検索中...</div>
                )}
                {!isSearching && searchError && (
                  <div className="px-2 py-2 text-xs text-destructive">{searchError}</div>
                )}
                {!isSearching && !searchError && searchResults.length === 0 && canSearchSpot && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">候補が見つかりません</div>
                )}
                {!isSearching &&
                  !searchError &&
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSpotSearchResult(result)}
                      className="flex w-full flex-col items-start rounded-sm px-2 py-2 text-left transition-colors hover:bg-accent"
                    >
                      <span className="text-sm text-foreground">{result.name}</span>
                      {result.address && (
                        <span className="text-xs text-muted-foreground">{result.address}</span>
                      )}
                    </button>
                  ))}
              </div>
              <div className="border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
                {searchProvider === 'foursquare'
                  ? '検索: Foursquare Places'
                  : '検索: Foursquare Places'}
              </div>
            </div>
          )}
        </div>
        {nodeType === 'spot' && !isSpotSearchEnabled && (
          <p className="text-xs text-muted-foreground">
            PRプレビューではスポット検索を無効化しています。場所名や住所を手入力してください。
          </p>
        )}
        {nodeType === 'spot' && address && (
          <p className="text-xs text-muted-foreground">選択した住所: {address}</p>
        )}
        {nodeType === 'spot' && isResolvingSpotDetails && (
          <p className="text-xs text-muted-foreground">座標を取得中...</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-day">日目</Label>
          <Input
            id="node-day"
            type="number"
            min={1}
            value={day}
            onChange={(e) => setDay(parseInt(e.target.value) || defaultDay)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-time">開始</Label>
          <Input
            id="node-time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-end">終了</Label>
          <Input
            id="node-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {nodeType === 'move' ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>移動手段</Label>
            <Select
              value={transport}
              onValueChange={(v) => handleTransportChange(v as SpotTransport)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="train">電車</SelectItem>
                <SelectItem value="limited_express">在来線特急</SelectItem>
                <SelectItem value="shinkansen">新幹線</SelectItem>
                <SelectItem value="bus">バス</SelectItem>
                <SelectItem value="car">車</SelectItem>
                <SelectItem value="walk">徒歩</SelectItem>
                <SelectItem value="ferry">フェリー</SelectItem>
                <SelectItem value="plane">飛行機</SelectItem>
                <SelectItem value="taxi">タクシー</SelectItem>
                <SelectItem value="bicycle">自転車</SelectItem>
                <SelectItem value="ropeway">ロープウェイ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spot-distance">距離 (km)</Label>
            <Input
              id="spot-distance"
              type="number"
              min={0}
              step={0.1}
              value={distance}
              onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="col-span-2">
            <MovePathEditor
              startPoint={moveAnchors.from}
              endPoint={moveAnchors.to}
              middlePoints={movePathMiddlePoints}
              onChange={setMovePathMiddlePoints}
              compact={false}
            />
            {(!moveAnchors.from || !moveAnchors.to) && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                前後のスポットが不足しているため、始点/終点の一部が固定できません。
              </p>
            )}
          </div>
        </div>
      ) : nodeType === 'area' ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="area-spots">このエリアで回りたいスポット（順不同）</Label>
          <Textarea
            id="area-spots"
            rows={4}
            placeholder={'例:\n八坂神社\n花見小路\nカフェ休憩'}
            value={areaSpotsText}
            onChange={(e) => setAreaSpotsText(e.target.value)}
          />
        </div>
      ) : (
        <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          移動はスポットとは別に「移動」ノードとして追加します。
        </div>
      )}

      {nodeType !== 'area' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="node-image">
            {nodeType === 'move' ? '移動画像URL' : '画像URL'}
          </Label>
          <Input
            id="node-image"
            placeholder="https://example.com/image.jpg"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="node-notes">メモ</Label>
        <Input
          id="node-notes"
          placeholder={
            nodeType === 'area'
              ? '例：2-3時間でゆるく散策'
              : nodeType === 'move'
                ? '例：特急券予約済み / 途中で昼食'
                : 'オプション'
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  )

  if (mode === 'sidebar') {
    if (!open) return null
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="閉じる"
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{formBody}</div>
        <div className="border-t border-border px-4 py-3">
          <Button onClick={handleAdd} disabled={saveDisabled} className="w-full">
            {saveLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={dialogContentClassName}>
        <DialogHeader>
          <DialogTitle className="font-serif">{title}</DialogTitle>
        </DialogHeader>
        {formBody}
        <DialogFooter>
          <Button onClick={handleAdd} disabled={saveDisabled} className="w-full">
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
