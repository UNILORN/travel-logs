'use client'

import { useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AddSpotDialog({
  tripId,
  open,
  onOpenChange,
  defaultDay,
}: {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDay: number
}) {
  const { addSpot } = useTripContext()
  const [name, setName] = useState('')
  const [time, setTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')
  const [day, setDay] = useState(defaultDay)
  const [notes, setNotes] = useState('')
  const [transport, setTransport] = useState<'car' | 'walk' | 'train' | 'bus'>('train')
  const [distance, setDistance] = useState(0)

  const handleAdd = () => {
    if (!name || !time || !endTime) return
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
    onOpenChange(false)
    setName('')
    setTime('10:00')
    setEndTime('12:00')
    setNotes('')
    setTransport('train')
    setDistance(0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">スポットを追加</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spot-name">場所の名前</Label>
            <Input
              id="spot-name"
              placeholder="例：東京タワー"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spot-day">日目</Label>
              <Input
                id="spot-day"
                type="number"
                min={1}
                value={day}
                onChange={(e) => setDay(parseInt(e.target.value) || defaultDay)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spot-time">開始</Label>
              <Input
                id="spot-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="spot-end">終了</Label>
              <Input
                id="spot-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>移動手段</Label>
              <Select
                value={transport}
                onValueChange={(v) =>
                  setTransport(v as 'car' | 'walk' | 'train' | 'bus')
                }
              >
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="spot-notes">メモ</Label>
            <Input
              id="spot-notes"
              placeholder="オプション"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={!name} className="w-full">
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
