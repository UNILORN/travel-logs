'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
import { Check, Clipboard, WrapText } from 'lucide-react'

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
  const [wordWrap, setWordWrap] = useState(false)
  const [lineCount, setLineCount] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  const updateLineCount = useCallback((text: string) => {
    setLineCount(text.split('\n').length)
  }, [])

  const syncScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  useEffect(() => {
    if (open) {
      const text = stringifyTrips([trip])
      setJsonText(text)
      updateLineCount(text)
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
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-3 px-3 py-4 sm:px-5">
        <DialogHeader className="space-y-0.5">
          <DialogTitle className="text-base leading-snug">{trip.title}</DialogTitle>
          <DialogDescription className="text-xs">
            JSONを編集して「適用」を押すと旅程データを上書きできます。
          </DialogDescription>
        </DialogHeader>

        {/* Editor area with line numbers */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-muted/40 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          {/* Line numbers */}
          <div
            ref={lineNumbersRef}
            aria-hidden="true"
            className="pointer-events-none select-none overflow-hidden border-r border-border/60 bg-muted/60 px-2 py-3 text-right font-mono text-[12px] leading-[1.6] text-muted-foreground/60"
            style={{ minWidth: `${Math.max(String(lineCount).length, 2) * 9 + 12}px` }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1}>{i + 1}</div>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              updateLineCount(e.target.value)
              setError(null)
              setSuccess(false)
            }}
            onScroll={syncScroll}
            className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[12px] leading-[1.6] text-foreground focus:outline-none"
            style={{
              height: 'min(70dvh, 600px)',
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              overflowX: wordWrap ? 'hidden' : 'auto',
              overflowY: 'auto',
            }}
            spellCheck={false}
            autoComplete="off"
            aria-label="旅程JSON"
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}

        {success && (
          <p className="rounded-md bg-chart-2/15 px-3 py-2 text-xs text-chart-2">
            旅程データを更新しました。
          </p>
        )}

        <DialogFooter className="flex-row items-center justify-between gap-2 pt-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-xs text-muted-foreground"
            onClick={() => setWordWrap((v) => !v)}
            title={wordWrap ? '折り返しを無効にする' : '折り返しを有効にする'}
          >
            <WrapText className="size-3.5" />
            {wordWrap ? '折り返し中' : '折り返し'}
          </Button>
          <div className="flex gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
