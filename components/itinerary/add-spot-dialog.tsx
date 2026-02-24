'use client'

import { useEffect, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { TransportType } from '@/lib/types'
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
import type { AddNodeKind } from './timeline'

type SpotTransport = Extract<TransportType, 'car' | 'walk' | 'train' | 'bus'>

export function AddSpotDialog({
  tripId,
  open,
  onOpenChange,
  defaultDay,
  defaultTime,
  defaultEndTime,
  defaultNodeType = 'spot',
}: {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDay: number
  defaultTime?: string
  defaultEndTime?: string
  defaultNodeType?: AddNodeKind
}) {
  const { addSpot, addNode } = useTripContext()
  const [nodeType, setNodeType] = useState<AddNodeKind>(defaultNodeType)
  const [name, setName] = useState('')
  const [time, setTime] = useState(defaultTime ?? '10:00')
  const [endTime, setEndTime] = useState(defaultEndTime ?? '12:00')
  const [day, setDay] = useState(defaultDay)
  const [notes, setNotes] = useState('')
  const [transport, setTransport] = useState<SpotTransport>('train')
  const [distance, setDistance] = useState(0)
  const [areaSpotsText, setAreaSpotsText] = useState('')

  useEffect(() => {
    if (!open) return
    setDay(defaultDay)
    setTime(defaultTime ?? '10:00')
    setEndTime(defaultEndTime ?? '12:00')
    setNodeType(defaultNodeType)
  }, [open, defaultDay, defaultTime, defaultEndTime, defaultNodeType])

  const resetForm = () => {
    setName('')
    setNotes('')
    setTransport('train')
    setDistance(0)
    setAreaSpotsText('')
  }

  const handleAdd = () => {
    if (!name || !time || !endTime) return

    if (nodeType === 'spot') {
      addSpot(tripId, {
        name,
        time,
        endTime,
        day,
        address: '',
        lat: 35.0 + Math.random() * 0.5,
        lng: 135.0 + Math.random() * 0.5,
        image: '',
        notes,
        transport,
        distance,
      })
    } else {
      const spotNames = areaSpotsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      addNode(tripId, {
        type: 'area',
        name,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">ノードを追加</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNodeType('spot')}
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
              onClick={() => setNodeType('area')}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                nodeType === 'area'
                  ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-700'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              エリア
            </button>
          </div>

          {(defaultTime || defaultEndTime) && (
            <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-muted-foreground">
              スキマ時間の候補: {defaultTime ?? '未設定'} - {defaultEndTime ?? '未設定'}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-name">{nodeType === 'spot' ? '場所の名前' : 'エリア名'}</Label>
            <Input
              id="node-name"
              placeholder={nodeType === 'spot' ? '例：東京タワー' : '例：祇園・東山エリア散策'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
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

          {nodeType === 'spot' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>移動手段</Label>
                <Select value={transport} onValueChange={(v) => setTransport(v as SpotTransport)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="train">電車</SelectItem>
                    <SelectItem value="bus">バス</SelectItem>
                    <SelectItem value="car">車</SelectItem>
                    <SelectItem value="walk">徒歩</SelectItem>
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
            </div>
          ) : (
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
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-notes">メモ</Label>
            <Input
              id="node-notes"
              placeholder={nodeType === 'area' ? '例：2-3時間でゆるく散策' : 'オプション'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAdd} disabled={!name} className="w-full">
            {nodeType === 'spot' ? 'スポットを追加' : 'エリアを追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
