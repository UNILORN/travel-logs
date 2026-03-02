'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import type { AreaNode, Expense, MoveNode, Spot, SpotNode, TimelineNode, Trip } from './types'
import { TRANSPORT_LABELS } from './types'
import { staticTrips } from '@/lib/static-trips'
import { parseTripsFromJson, stringifyTrips } from '@/lib/trip-json'

type NewTimelineNode = Omit<SpotNode, 'id'> | Omit<MoveNode, 'id'> | Omit<AreaNode, 'id'>
type EditableTimelineNode = MoveNode | AreaNode

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
  updateNode: (tripId: string, nodeId: string, updates: Partial<EditableTimelineNode>) => void
  removeNode: (tripId: string, nodeId: string) => void
  addExpense: (tripId: string, expense: Omit<Expense, 'id' | 'total'>) => void
  removeExpense: (tripId: string, expenseId: string) => void
  archiveTrip: (tripId: string) => void
  replaceTrips: (nextTrips: Trip[]) => void
}

const TripContext = createContext<TripContextValue | null>(null)

const TRIPS_STORAGE_KEY = 'travel-logs.trips.v1'

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
        image: '',
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
  const [trips, setTrips] = useState<Trip[]>(staticTrips)
  const didLoadFromStorageRef = useRef(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TRIPS_STORAGE_KEY)
      if (!stored) return
      const parsedTrips = parseTripsFromJson(stored)
      setTrips(parsedTrips)
    } catch (error) {
      console.warn('旅行データの読み込みに失敗しました。初期データを使用します。', error)
    } finally {
      didLoadFromStorageRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!didLoadFromStorageRef.current) return
    window.localStorage.setItem(TRIPS_STORAGE_KEY, stringifyTrips(trips))
  }, [trips])

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

        const spots = t.spots
          .map((s) => (s.id === spotId ? { ...s, ...updates } : s))
          .sort((a, b) => {
            if (a.day !== b.day) return a.day - b.day
            return a.time.localeCompare(b.time)
          })

        const mergedSpot = spots.find((s) => s.id === spotId)
        const mergedSpotIndex = mergedSpot ? spots.findIndex((s) => s.id === spotId) : -1
        const prevSpotSameDay =
          mergedSpotIndex <= 0 || !mergedSpot
            ? undefined
            : (() => {
                for (let i = mergedSpotIndex - 1; i >= 0; i -= 1) {
                  if (spots[i].day === mergedSpot.day) return spots[i]
                }
                return undefined
              })()

        const nodes = t.nodes
          ?.map((node): TimelineNode | null => {
            if (!mergedSpot) return node

            if (node.type === 'spot' && node.id === spotId) {
              return spotToNode(mergedSpot)
            }

            if (node.type === 'move' && node.id === `move-${spotId}`) {
              if (mergedSpot.distance <= 0) return null

              return {
                ...node,
                name: `${TRANSPORT_LABELS[mergedSpot.transport]}で移動`,
                time: prevSpotSameDay?.endTime ?? mergedSpot.time,
                endTime: mergedSpot.time,
                day: mergedSpot.day,
                transport: mergedSpot.transport,
                distance: mergedSpot.distance,
                fromLat: prevSpotSameDay?.lat,
                fromLng: prevSpotSameDay?.lng,
                toLat: mergedSpot.lat,
                toLng: mergedSpot.lng,
              }
            }

            return node
          })
          .filter((node): node is TimelineNode => node !== null)
          .sort(sortTimelineNodes)

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

  const updateNode = useCallback(
    (tripId: string, nodeId: string, updates: Partial<EditableTimelineNode>) => {
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id !== tripId) return t

          const baseNodes = t.nodes ? [...t.nodes] : buildNodesFromLegacySpots(t.spots)
          const target = baseNodes.find((node) => node.id === nodeId)
          if (!target || target.type === 'spot') return t

          const nodes = baseNodes
            .map((node): TimelineNode => {
              if (node.id !== nodeId) return node

              return {
                ...node,
                ...updates,
                id: node.id,
                type: node.type,
              } as TimelineNode
            })
            .sort(sortTimelineNodes)

          return {
            ...t,
            nodes,
          }
        })
      )
    },
    []
  )

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
        const adultCount = Math.max(0, Math.floor(expense.adultCount))
        const childCount = Math.max(0, Math.floor(expense.childCount))
        const total = expense.adultPrice * adultCount + expense.childPrice * childCount
        const newExpense: Expense = {
          ...expense,
          adultCount,
          childCount,
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

  const replaceTrips = useCallback((nextTrips: Trip[]) => {
    setTrips(nextTrips)
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
        updateNode,
        removeNode,
        addExpense,
        removeExpense,
        archiveTrip,
        replaceTrips,
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
