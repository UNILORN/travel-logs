import { CATEGORY_LABELS, TRANSPORT_LABELS, type TimelineNode, type Trip } from '@/lib/types'
import { getTripTimelineNodes, isMoveNode, isSpotNode } from '@/lib/timeline-nodes'

export type TripBriefRiskLevel = 'relaxed' | 'balanced' | 'tight'

export interface TripBriefBudgetSummary {
  spent: number
  budget: number
  remaining: number
  usageRate: number | null
  topCategoryLabel: string | null
}

export interface TripBriefMoveSummary {
  moveCount: number
  totalDistance: number
  primaryTransportLabel: string | null
}

export interface TripBriefData {
  dayCount: number
  availableDays: number[]
  todayDay: number
  nextSpot: Extract<TimelineNode, { type: 'spot' }> | null
  budgetSummary: TripBriefBudgetSummary
}

export interface TripBriefDayData {
  day: number
  nodes: TimelineNode[]
  moveSummary: TripBriefMoveSummary
  criticalNotes: string[]
  riskLevel: TripBriefRiskLevel
}

function getTripDayCount(trip: Trip) {
  return (
    Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  )
}

function normalizeTripDate(input: string) {
  const [year, month, day] = input.split('-').map((value) => parseInt(value, 10))
  return new Date(year, month - 1, day)
}

function resolveTodayDay(trip: Trip, dayCount: number, now: Date) {
  const startDate = normalizeTripDate(trip.startDate)
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor(
    (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays >= 0 && diffDays < dayCount) {
    return diffDays + 1
  }

  return 1
}

function buildBudgetSummary(trip: Trip): TripBriefBudgetSummary {
  const spent = trip.expenses.reduce((sum, expense) => sum + expense.total, 0)
  const budget = trip.budget
  const remaining = budget - spent
  const usageRate = budget > 0 ? Math.round((spent / budget) * 100) : null

  const categoryTotals = new Map<string, number>()
  for (const expense of trip.expenses) {
    const categoryLabel = CATEGORY_LABELS[expense.category]
    categoryTotals.set(categoryLabel, (categoryTotals.get(categoryLabel) ?? 0) + expense.total)
  }

  let topCategoryLabel: string | null = null
  let topCategoryTotal = -1
  for (const [label, total] of categoryTotals) {
    if (total > topCategoryTotal) {
      topCategoryLabel = label
      topCategoryTotal = total
    }
  }

  return {
    spent,
    budget,
    remaining,
    usageRate,
    topCategoryLabel,
  }
}

function buildMoveSummary(nodes: TimelineNode[]): TripBriefMoveSummary {
  const moveNodes = nodes.filter(isMoveNode)
  const totalDistance = moveNodes.reduce((sum, move) => sum + move.distance, 0)
  const transportTotals = new Map<string, number>()

  for (const move of moveNodes) {
    const label = TRANSPORT_LABELS[move.transport]
    transportTotals.set(label, (transportTotals.get(label) ?? 0) + move.distance)
  }

  let primaryTransportLabel: string | null = null
  let primaryTransportDistance = -1
  for (const [label, distance] of transportTotals) {
    if (distance > primaryTransportDistance) {
      primaryTransportLabel = label
      primaryTransportDistance = distance
    }
  }

  return {
    moveCount: moveNodes.length,
    totalDistance: Math.round(totalDistance * 10) / 10,
    primaryTransportLabel,
  }
}

function buildCriticalNotes(nodes: TimelineNode[]) {
  const seen = new Set<string>()
  const notes: string[] = []

  for (const node of nodes) {
    const note = node.notes.trim()
    if (!note || seen.has(note)) continue
    seen.add(note)
    notes.push(note)
    if (notes.length >= 3) break
  }

  return notes
}

function resolveRiskLevel(nodes: TimelineNode[], moveSummary: TripBriefMoveSummary): TripBriefRiskLevel {
  const spotCount = nodes.filter(isSpotNode).length
  const totalNodeCount = nodes.length

  if (totalNodeCount >= 7 || moveSummary.totalDistance >= 25 || spotCount >= 5) {
    return 'tight'
  }

  if (totalNodeCount <= 3 && moveSummary.totalDistance <= 8 && spotCount <= 2) {
    return 'relaxed'
  }

  return 'balanced'
}

function resolveNextSpot(allNodes: TimelineNode[], activeDay: number) {
  const futureOrCurrentSpots = allNodes.filter(
    (node): node is Extract<TimelineNode, { type: 'spot' }> => isSpotNode(node) && node.day >= activeDay
  )

  const sameDaySpot = futureOrCurrentSpots.find((node) => node.day === activeDay)
  if (sameDaySpot) return sameDaySpot

  return futureOrCurrentSpots[0] ?? null
}

export function getTripBriefData(trip: Trip, now = new Date()): TripBriefData {
  const dayCount = getTripDayCount(trip)
  const availableDays = Array.from({ length: dayCount }, (_, index) => index + 1)
  const allNodes = getTripTimelineNodes(trip)
  const todayDay = resolveTodayDay(trip, dayCount, now)

  return {
    dayCount,
    availableDays,
    todayDay,
    nextSpot: resolveNextSpot(allNodes, todayDay),
    budgetSummary: buildBudgetSummary(trip),
  }
}

export function getTripBriefDayData(trip: Trip, day: number): TripBriefDayData {
  const nodes = getTripTimelineNodes(trip).filter((node) => node.day === day)
  const moveSummary = buildMoveSummary(nodes)

  return {
    day,
    nodes,
    moveSummary,
    criticalNotes: buildCriticalNotes(nodes),
    riskLevel: resolveRiskLevel(nodes, moveSummary),
  }
}
