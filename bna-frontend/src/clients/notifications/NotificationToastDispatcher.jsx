import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

import { useIsAuthenticated } from '../../store/hooks'
import { useGetNotificationsQuery } from '../../store/services/notificationApi'

const POLL_INTERVAL = 30_000

const EVENT_MESSAGES = {
  appointment_requested: (p) => `Nouvelle demande de RDV — ${p.appointment_ref || ''}`,
  appointment_assigned: (p) => `Votre RDV ${p.appointment_ref || ''} a un agent`,
  appointment_cancelled: (p) => `RDV ${p.appointment_ref || ''} annulé`,
  appointment_completed: (p) => `RDV ${p.appointment_ref || ''} effectué`,
  service_updated: (p) => `Service mis à jour : ${p.service_name || ''}`,
  account_verified: () => 'Votre compte est maintenant activé',
}

/**
 * Side-effect-only component. Polls /api/notifications/ on the same
 * cadence as the bell (RTK Query dedupes the request) and fires a toast
 * the first time it sees a new QUEUED in-app notification this session.
 *
 * Notifications that already existed when the page loaded are seeded
 * into the seenIds set so the user doesn't get a flood of toasts on
 * page load.
 */
export default function NotificationToastDispatcher() {
  const isAuthenticated = useIsAuthenticated()
  const seenIds = useRef(new Set())
  const initialised = useRef(false)

  const { data: notifications = [] } = useGetNotificationsQuery(
    { limit: 20 },
    {
      skip: !isAuthenticated,
      pollingInterval: POLL_INTERVAL,
    },
  )

  useEffect(() => {
    if (!isAuthenticated) {
      // Reset on logout so a fresh login starts clean.
      seenIds.current = new Set()
      initialised.current = false
      return
    }

    if (!initialised.current) {
      notifications.forEach((n) => seenIds.current.add(n.id))
      initialised.current = true
      return
    }

    notifications.forEach((notif) => {
      if (notif.status !== 'queued') return
      if (seenIds.current.has(notif.id)) return

      seenIds.current.add(notif.id)

      const msgFn = EVENT_MESSAGES[notif.event_type]
      const message = msgFn
        ? msgFn(notif.payload || {})
        : notif.event_type_display

      toast(message, {
        icon: '🔔',
        duration: 5000,
        style: {
          background: '#f0fdf4',
          color: '#14532d',
          border: '1px solid #bbf7d0',
        },
      })
    })
  }, [notifications, isAuthenticated])

  return null
}
