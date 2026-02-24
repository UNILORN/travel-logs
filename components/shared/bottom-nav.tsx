'use client'

import Link from 'next/link'
import { BookOpen, Map, Wallet, Navigation, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: BookOpen, label: '本棚', key: 'home' },
  { href: '/edit', icon: Map, label: '旅程', key: 'edit' },
  { href: '/budget', icon: Wallet, label: '予算', key: 'budget' },
  { href: '/navigate', icon: Navigation, label: 'ナビ', key: 'navigate' },
  { href: '/report', icon: BarChart3, label: 'レポート', key: 'report' },
]

export function BottomNav({
  tripId,
  active,
}: {
  tripId: string
  active: string
}) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 pb-safe backdrop-blur-sm" aria-label="メインナビゲーション">
      <div className="mx-auto flex max-w-md items-center justify-around py-1">
        {navItems.map((item) => {
          const href =
            item.key === 'home' ? '/' : `/trip/${tripId}/${item.key}`
          const isActive = active === item.key
          const Icon = item.icon
          return (
            <Link
              key={item.key}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="size-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
