import React from 'react'
import { useDispatch } from 'react-redux'

import { useIsAuthenticated } from '../../store/hooks'
import { useGetUnreadCountQuery } from '../../store/services/notificationApi'
import { togglePanel } from '../../store/slices/notificationsSlice'

const POLL_INTERVAL = 30_000 // 30s

export default function NotificationBell() {
  const dispatch = useDispatch()
  const isAuthenticated = useIsAuthenticated()

  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: POLL_INTERVAL,
  })

  if (!isAuthenticated) return null

  return (
    <button
      onClick={() => dispatch(togglePanel())}
      className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      aria-label="Notifications"
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
