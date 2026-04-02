'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTripContext } from '@/lib/trip-context'
import { buildTripPageHref } from '@/lib/trip-route'
import { parseTripsFromJson } from '@/lib/trip-json'
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

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=600&h=400&fit=crop',
]

export function NewTripDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addTrip, appendTrips } = useTripContext()
  const router = useRouter()
  const [mode, setMode] = useState<'form' | 'json'>('form')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [adults, setAdults] = useState(2)
  const [children, setChildren] = useState(0)
  const [budget, setBudget] = useState(50000)
  const [jsonText, setJsonText] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const resetForm = () => {
    setDestination('')
    setStartDate('')
    setEndDate('')
    setAdults(2)
    setChildren(0)
    setBudget(50000)
    setJsonText('')
    setJsonError(null)
    setMode('form')
  }

  const handleCreate = () => {
    if (!destination || !startDate || !endDate) return
    const coverImage = COVER_IMAGES[Math.floor(Math.random() * COVER_IMAGES.length)]
    const id = addTrip({
      title: `${destination}旅行`,
      destination,
      coverImage,
      startDate,
      endDate,
      status: 'planning',
      members: { adults, children },
      budget,
    })
    onOpenChange(false)
    resetForm()
    router.push(buildTripPageHref(id, 'edit'))
  }

  const handleJsonImport = () => {
    setJsonError(null)
    try {
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(jsonText)
      } catch {
        throw new Error('JSONの解析に失敗しました。構文を確認してください。')
      }
      const jsonForParsing = Array.isArray(parsedJson)
        ? jsonText
        : JSON.stringify([parsedJson])
      const importedTrips = parseTripsFromJson(jsonForParsing)
      appendTrips(importedTrips)
      onOpenChange(false)
      resetForm()
      if (importedTrips.length === 1) {
        router.push(buildTripPageHref(importedTrips[0].id, 'edit'))
      }
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : '取り込みに失敗しました。')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">新しい旅を計画</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => { setMode('form'); setJsonError(null) }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === 'form'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            フォームで作成
          </button>
          <button
            type="button"
            onClick={() => { setMode('json'); setJsonError(null) }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              mode === 'json'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            JSONで取り込む
          </button>
        </div>

        {mode === 'form' ? (
          <>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destination">行き先</Label>
                <Input
                  id="destination"
                  placeholder="例：箱根、京都、沖縄"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="start-date">出発日</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="end-date">帰着日</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adults">大人</Label>
                  <Input
                    id="adults"
                    type="number"
                    min={1}
                    value={adults}
                    onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="children">子供</Label>
                  <Input
                    id="children"
                    type="number"
                    min={0}
                    value={children}
                    onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budget">予算（円）</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step={10000}
                  value={budget}
                  onChange={(e) => setBudget(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!destination || !startDate || !endDate}
                className="w-full"
              >
                旅を作成する
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                エクスポートしたJSONを貼り付けてください。配列・単一オブジェクトどちらでも取り込めます。
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(null) }}
                placeholder={'[\n  {\n    "title": "...",\n    ...\n  }\n]'}
                className="h-48 resize-none rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                spellCheck={false}
                autoComplete="off"
              />
              {jsonError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {jsonError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleJsonImport}
                disabled={!jsonText.trim()}
                className="w-full"
              >
                取り込む
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
