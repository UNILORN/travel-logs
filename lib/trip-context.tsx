'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Trip, Spot, Expense } from './types'
import { initialTrips } from './mock-data'

interface TripContextValue {
  trips: Trip[]
  getTrip: (id: string) => Trip | undefined
  addTrip: (trip: Omit<Trip, 'id' | 'spots' | 'expenses'>) => string
  updateTrip: (id: string, updates: Partial<Trip>) => void
  deleteTrip: (id: string) => void
  addSpot: (tripId: string, spot: Omit<Spot, 'id'>) => void
  updateSpot: (tripId: string, spotId: string, updates: Partial<Spot>) => void
  removeSpot: (tripId: string, spotId: string) => void
  addExpense: (tripId: string, expense: Omit<Expense, 'id' | 'total'>) => void
  removeExpense: (tripId: string, expenseId: string) => void
  archiveTrip: (tripId: string) => void
}

const TripContext = createContext<TripContextValue | null>(null)

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips)

  const getTrip = useCallback(
    (id: string) => trips.find((t) => t.id === id),
    [trips]
  )

  const addTrip = useCallback((tripData: Omit<Trip, 'id' | 'spots' | 'expenses'>) => {
    const id = `trip-${Date.now()}`
    const newTrip: Trip = {
      ...tripData,
      id,
      spots: [],
      expenses: [],
    }
    setTrips((prev) => [...prev, newTrip])
    return id
  }, [])

  const updateTrip = useCallback((id: string, updates: Partial<Trip>) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    )
  }, [])

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addSpot = useCallback((tripId: string, spot: Omit<Spot, 'id'>) => {
    const newSpot: Spot = { ...spot, id: `spot-${Date.now()}` }
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, spots: [...t.spots, newSpot].sort((a, b) => {
              if (a.day !== b.day) return a.day - b.day
              return a.time.localeCompare(b.time)
            }) }
          : t
      )
    )
  }, [])

  const updateSpot = useCallback(
    (tripId: string, spotId: string, updates: Partial<Spot>) => {
      setTrips((prev) =>
        prev.map((t) =>
          t.id === tripId
            ? {
                ...t,
                spots: t.spots.map((s) =>
                  s.id === spotId ? { ...s, ...updates } : s
                ),
              }
            : t
        )
      )
    },
    []
  )

  const removeSpot = useCallback((tripId: string, spotId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, spots: t.spots.filter((s) => s.id !== spotId) }
          : t
      )
    )
  }, [])

  const addExpense = useCallback(
    (tripId: string, expense: Omit<Expense, 'id' | 'total'>) => {
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t
          const total =
            expense.adultPrice * t.members.adults +
            expense.childPrice * t.members.children
          const newExpense: Expense = {
            ...expense,
            id: `exp-${Date.now()}`,
            total,
          }
          return { ...t, expenses: [...t.expenses, newExpense] }
        })
      )
    },
    []
  )

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId
          ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) }
          : t
      )
    )
  }, [])

  const archiveTrip = useCallback((tripId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, status: 'archived' as const } : t
      )
    )
  }, [])

  return (
    <TripContext.Provider
      value={{
        trips,
        getTrip,
        addTrip,
        updateTrip,
        deleteTrip,
        addSpot,
        updateSpot,
        removeSpot,
        addExpense,
        removeExpense,
        archiveTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  )
}

export function useTripContext() {
  const ctx = useContext(TripContext)
  if (!ctx) throw new Error('useTripContext must be used within TripProvider')
  return ctx
}
