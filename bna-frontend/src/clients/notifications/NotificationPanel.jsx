import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AnimatePresence, motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useIsAuthenticated } from '../../store/hooks'
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
} from '../../store/services/notificationApi'
import {
  closePanel,
  markLastSeen,
  selectLastSeenAt,
  selectPanelOpen,
} from '../../store/slices/notificationsSlice'

const POLL_INTERVAL = 30_000

const EVENT_ICONS = {
  appointment_requested: '📅',
  appointment_assigned: '✅',
  appointment_cancelled: '❌',
  appointment_completed: '🎉',
  appointment_reminder: '⏰',
  service_updated: '⚙️',
  account_verified: '👤',
  password_reset: '🔑',
}

export default function NotificationPanel() {
  const dispatch = useDispatch()
  const isOpen = useSelector(selectPanelOpen)
  const lastSeenAt = useSelector(selectLastSeenAt)
  const isAuthenticated = useIsAuthenticated()
  const panelRef = useRef(null)

  const { data: notifications = [] } = useGetNotificationsQuery(
    { limit: 20 },
    {
      skip: !isAuthenticated,
      pollingInterval: POLL_INTERVAL,
    },
  )

  const [markRead] = useMarkReadMutation()

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        dispatch(closePanel())
      }
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, dispatch])

  // Mark last-seen timestamp when panel opens
  useEffect(() => {
    if (isOpen) dispatch(markLastSeen())
  }, [isOpen, dispatch])

  const handleMarkRead = async (notifId) => {
    await markRead(notifId)
  }

  const isNew = (notif) =>
    lastSeenAt ? new Date(notif.created_at) > new Date(lastSeenAt) : false

  if (!isAuthenticated) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={() => dispatch(closePanel())}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.map((notif) => {
                const unread = notif.status === 'queued'
                // mark as new when arriving after last panel-open
                const _new = isNew(notif)
                return (
                  <div
                    key={notif.id}
                    onClick={() => unread && handleMarkRead(notif.id)}
                    className={`flex items-start gap-3 px-5 py-4 border-b border-gray-50 cursor-pointer transition-colors
                      ${unread
                        ? 'bg-bna-light hover:bg-green-100'
                        : 'hover:bg-gray-50'}`}
                  >
                    <div
                      className={`flex-shrink-0 text-xl w-8 h-8 flex items-center justify-center rounded-full
                        ${unread ? 'bg-green-100' : 'bg-gray-100'}`}
                    >
                      {EVENT_ICONS[notif.event_type] || '🔔'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug
                          ${unread ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                      >
                        {notif.event_type_display}
                        {notif.payload?.appointment_ref && (
                          <span className="font-mono text-xs text-gray-400 ml-1">
                            {notif.payload.appointment_ref}
                          </span>
                        )}
                      </p>
                      {notif.payload?.service_name && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {notif.payload.service_name}
                          {notif.payload.agency_name && ` · ${notif.payload.agency_name}`}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>

                    {unread && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-bna-accent mt-1.5" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <button
                onClick={() => dispatch(closePanel())}
                className="text-xs text-bna-primary hover:underline"
              >
                Fermer
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
