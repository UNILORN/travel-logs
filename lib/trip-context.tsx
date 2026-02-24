'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AreaNode, Expense, MoveNode, Spot, SpotNode, TimelineNode, Trip } from './types'
import { TRANSPORT_LABELS } from './types'
import { initialTrips } from './mock-data'

type NewTimelineNode = Omit<SpotNode, 'id'> | Omit<MoveNode, 'id'> | Omit<AreaNode, 'id'>

interface TripContextValue {
  trips: Trip[]
  getTrip: (id: string) => Trip | undefined
  addTrip: (trip: Omit<Trip, 'id' | 'spots' | 'expenses'>) => string
  updateTrip: (id: string, updates: Partial<Trip>) => void
  deleteTrip: (id: string) => void
  addSpot: (tripId: string, spot: Omit<Spot, 'id'>) => void
  updateSpot: (tripId: string, spotId: string, updates: Partial<Spot>) => void
  removeSpot: (tripId: string, spotId: string) => void
  addNode: (tripId: string, node: NewTimelineNode) => void
  removeNode: (tripId: string, nodeId: string) => void
  addExpense: (tripId: string, expense: Omit<Expense, 'id' | 'total'>) => void
  removeExpense: (tripId: string, expenseId: string) => void
  archiveTrip: (tripId: string) => void
}

const TripContext = createContext<TripContextValue | null>(null)

function sortTimelineNodes(a: TimelineNode, b: TimelineNode) {
  if (a.day !== b.day) return a.day - b.day
  if (a.time !== b.time) return a.time.localeCompare(b.time)
  return a.endTime.localeCompare(b.endTime)
}

function spotToNode(spot: Spot): SpotNode {
  return {
    type: 'spot',
    id: spot.id,
    name: spot.name,
    time: spot.time,
    endTime: spot.endTime,
    day: spot.day,
    address: spot.address,
    lat: spot.lat,
    lng: spot.lng,
    image: spot.image,
    notes: spot.notes,
  }
}

function buildNodesFromLegacySpots(spots: Spot[]): TimelineNode[] {
  const sortedSpots = [...spots].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return a.time.localeCompare(b.time)
  })

  const nodes: TimelineNode[] = []
  const prevSpotByDay = new Map<number, SpotNode>()

  for (const spot of sortedSpots) {
    const prevSpot = prevSpotByDay.get(spot.day)

    if (spot.distance > 0) {
      nodes.push({
        type: 'move',
        id: `move-${spot.id}`,
        name: `${TRANSPORT_LABELS[spot.transport]}で移動`,
        time: prevSpot?.endTime ?? spot.time,
        endTime: spot.time,
        day: spot.day,
        transport: spot.transport,
        distance: spot.distance,
        notes: '',
        fromLat: prevSpot?.lat,
        fromLng: prevSpot?.lng,
        toLat: spot.lat,
        toLng: spot.lng,
      })
    }

    const spotNode = spotToNode(spot)
    nodes.push(spotNode)
    prevSpotByDay.set(spot.day, spotNode)
  }

  return nodes.sort(sortTimelineNodes)
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(initialTrips)

  const getTrip = useCallback((id: string) => trips.find((t) => t.id === id), [trips])

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
    setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addSpot = useCallback((tripId: string, spot: Omit<Spot, 'id'>) => {
    const newSpot: Spot = { ...spot, id: `spot-${Date.now()}` }

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t

        const spots = [...t.spots, newSpot].sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day
          return a.time.localeCompare(b.time)
        })

        // If node timeline is already active, keep spot nodes in sync.
        const nodes = t.nodes
          ? [...t.nodes, spotToNode(newSpot)].sort(sortTimelineNodes)
          : t.nodes

        return { ...t, spots, nodes }
      })
    )
  }, [])

  const updateSpot = useCallback((tripId: string, spotId: string, updates: Partial<Spot>) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t

        const spots = t.spots.map((s) => (s.id === spotId ? { ...s, ...updates } : s))

        const nodes = t.nodes?.map((node) => {
          if (node.type !== 'spot' || node.id !== spotId) return node
          const merged = spots.find((s) => s.id === spotId)
          return merged ? spotToNode(merged) : node
        })

        return { ...t, spots, nodes }
      })
    )
  }, [])

  const removeSpot = useCallback((tripId: string, spotId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t

        return {
          ...t,
          spots: t.spots.filter((s) => s.id !== spotId),
          nodes: t.nodes?.filter((node) => node.id !== spotId && node.id !== `move-${spotId}`),
        }
      })
    )
  }, [])

  const addNode = useCallback((tripId: string, node: NewTimelineNode) => {
    const newNode: TimelineNode = {
      ...node,
      id: `${node.type}-${Date.now()}`,
    } as TimelineNode

    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t

        const baseNodes = t.nodes ? [...t.nodes] : buildNodesFromLegacySpots(t.spots)
        return {
          ...t,
          nodes: [...baseNodes, newNode].sort(sortTimelineNodes),
        }
      })
    )
  }, [])

  const removeNode = useCallback((tripId: string, nodeId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t

        const next: Trip = {
          ...t,
          nodes: t.nodes?.filter((node) => node.id !== nodeId),
          spots: t.spots,
        }

        // Keep legacy spots in sync when removing a spot node.
        if (!nodeId.startsWith('move-')) {
          next.spots = t.spots.filter((spot) => spot.id !== nodeId)
        }

        return next
      })
    )
  }, [])

  const addExpense = useCallback((tripId: string, expense: Omit<Expense, 'id' | 'total'>) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id !== tripId) return t
        const total = expense.adultPrice * t.members.adults + expense.childPrice * t.members.children
        const newExpense: Expense = {
          ...expense,
          id: `exp-${Date.now()}`,
          total,
        }
        return { ...t, expenses: [...t.expenses, newExpense] }
      })
    )
  }, [])

  const removeExpense = useCallback((tripId: string, expenseId: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === tripId ? { ...t, expenses: t.expenses.filter((e) => e.id !== expenseId) } : t
      )
    )
  }, [])

  const archiveTrip = useCallback((tripId: string) => {
    setTrips((prev) =>
      prev.map((t) => (t.id === tripId ? { ...t, status: 'archived' as const } : t))
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
        addNode,
        removeNode,
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
