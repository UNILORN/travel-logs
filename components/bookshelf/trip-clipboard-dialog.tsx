'use client'

import { useEffect, useRef, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { Trip } from '@/lib/types'
import { parseTripsFromJson, stringifyTrips } from '@/lib/trip-json'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check, Clipboard } from 'lucide-react'

interface TripClipboardDialogProps {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TripClipboardDialog({ trip, open, onOpenChange }: TripClipboardDialogProps) {
  const { updateTrip } = useTripContext()
  const [jsonText, setJsonText] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setJsonText(stringifyTrips([trip]))
      setError(null)
      setCopied(false)
      setSuccess(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText)
    } catch {
      // Fallback for environments without clipboard API
      const textarea = textareaRef.current
      if (textarea) {
        textarea.select()
        document.execCommand('copy')
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApply = () => {
    setError(null)
    setSuccess(false)
    try {
      let parsedJson: unknown
      try {
        parsedJson = JSON.parse(jsonText)
      } catch {
        throw new Error('JSONの解析に失敗しました。構文を確認してください。')
      }

      // Accept both single-trip object and array
      const jsonForParsing = Array.isArray(parsedJson)
        ? jsonText
        : JSON.stringify([parsedJson])

      const importedTrips = parseTripsFromJson(jsonForParsing)
      if (importedTrips.length === 0) {
        throw new Error('有効な旅行データが見つかりませんでした。')
      }

      const importedTrip = importedTrips[0]
      // Preserve the original trip ID to keep references stable
      updateTrip(trip.id, { ...importedTrip, id: trip.id })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'インポートに失敗しました。')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-1rem)] max-w-lg flex-col gap-3 px-3 py-4">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="text-base leading-snug">{trip.title}</DialogTitle>
          <DialogDescription className="text-xs">
            JSONを編集して「適用」を押すと旅程データを上書きできます。
          </DialogDescription>
        </DialogHeader>

        <textarea
          ref={textareaRef}
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value)
            setError(null)
            setSuccess(false)
          }}
          className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ height: 'min(60dvh, 400px)' }}
          spellCheck={false}
          autoComplete="off"
          aria-label="旅程JSON"
        />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        {success && (
          <p className="rounded-md bg-chart-2/15 px-3 py-2 text-xs text-chart-2">
            旅程データを更新しました。
          </p>
        )}

        <DialogFooter className="flex-row justify-end gap-2 pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 rounded-full px-4"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5" /> : <Clipboard className="size-3.5" />}
            {copied ? 'コピー済み' : 'コピー'}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-9 rounded-full px-4"
            onClick={handleApply}
          >
            適用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
