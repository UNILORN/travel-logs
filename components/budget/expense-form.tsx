'use client'

import { useEffect, useState } from 'react'
import { useTripContext } from '@/lib/trip-context'
import type { ExpenseCategory } from '@/lib/types'
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

export function ExpenseForm({
  tripId,
  open,
  onOpenChange,
}: {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { addExpense, getTrip } = useTripContext()
  const trip = getTrip(tripId)
  const defaultAdultCount = trip?.members.adults ?? 1
  const defaultChildCount = trip?.members.children ?? 0
  const [category, setCategory] = useState<ExpenseCategory>('food')
  const [name, setName] = useState('')
  const [adultPrice, setAdultPrice] = useState(0)
  const [childPrice, setChildPrice] = useState(0)
  const [adultCount, setAdultCount] = useState(defaultAdultCount)
  const [childCount, setChildCount] = useState(defaultChildCount)

  useEffect(() => {
    if (!open) return
    setAdultCount(defaultAdultCount)
    setChildCount(defaultChildCount)
  }, [open, defaultAdultCount, defaultChildCount])

  const handleCategoryChange = (nextCategory: ExpenseCategory) => {
    setCategory(nextCategory)
    if (nextCategory !== 'transport') {
      setAdultCount(defaultAdultCount)
      setChildCount(defaultChildCount)
    }
  }

  const handleAdd = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    addExpense(tripId, {
      category,
      name: trimmedName,
      adultPrice,
      childPrice,
      adultCount: category === 'transport' ? adultCount : defaultAdultCount,
      childCount: category === 'transport' ? childCount : defaultChildCount,
    })
    onOpenChange(false)
    setName('')
    setAdultPrice(0)
    setChildPrice(0)
    setAdultCount(defaultAdultCount)
    setChildCount(defaultChildCount)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">支出を追加</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>カテゴリ</Label>
            <Select
              value={category}
              onValueChange={(v) => handleCategoryChange(v as ExpenseCategory)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transport">交通費</SelectItem>
                <SelectItem value="accommodation">宿泊費</SelectItem>
                <SelectItem value="activity">アクティビティ</SelectItem>
                <SelectItem value="food">食事</SelectItem>
                <SelectItem value="other">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expense-name">名目</Label>
            <Input
              id="expense-name"
              placeholder="例：新幹線往復"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adult-price">大人単価（円）</Label>
              <Input
                id="adult-price"
                type="number"
                min={0}
                value={adultPrice}
                onChange={(e) => setAdultPrice(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="child-price">子供単価（円）</Label>
              <Input
                id="child-price"
                type="number"
                min={0}
                value={childPrice}
                onChange={(e) => setChildPrice(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          {category === 'transport' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">交通費は人数を個別に指定できます。</p>
              <div
                className={`grid gap-3 ${
                  defaultChildCount > 0 ? 'grid-cols-2' : 'grid-cols-1'
                }`}
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="adult-count">大人人数</Label>
                  <Input
                    id="adult-count"
                    type="number"
                    min={0}
                    value={adultCount}
                    onChange={(e) => setAdultCount(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                {defaultChildCount > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="child-count">子供人数</Label>
                    <Input
                      id="child-count"
                      type="number"
                      min={0}
                      value={childCount}
                      onChange={(e) => setChildCount(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleAdd} disabled={!name.trim()} className="w-full">
            追加する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
