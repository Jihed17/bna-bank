import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

import {
  useGetNotificationsQuery,
  useMarkReadMutation,
} from '../store/services/notificationApi'

const EVENT_ICONS = {
  appointment_requested: '📅',
  appointment_assigned: '✅',
  appointment_cancelled: '❌',
  appointment_completed: '🎉',
  service_updated: '⚙️',
  account_verified: '👤',
  password_reset: '🔑',
}

export default function Notifications() {
  const { data: notifications = [], isLoading } = useGetNotificationsQuery({
    limit: 50,
  })

  const [markRead] = useMarkReadMutation()

  const handleMarkRead = async (id) => {
    await markRead(id)
    toast.success('Notification lue.')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Notifications</h1>

      {isLoading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-400">Aucune notification.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const unread = notif.status === 'queued'
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-5 rounded-xl border transition-colors
                  ${unread
                    ? 'bg-bna-light border-bna-primary/20'
                    : 'bg-white border-gray-100'}`}
              >
                <div
                  className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0
                    ${unread ? 'bg-green-100' : 'bg-gray-100'}`}
                >
                  {EVENT_ICONS[notif.event_type] || '🔔'}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium
                      ${unread ? 'text-gray-900' : 'text-gray-600'}`}
                  >
                    {notif.event_type_display}
                  </p>
                  {notif.payload?.appointment_ref && (
                    <p className="text-xs font-mono text-gray-400 mt-0.5">
                      {notif.payload.appointment_ref}
                    </p>
                  )}
                  {(notif.payload?.service_name || notif.payload?.agency_name) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[notif.payload.service_name, notif.payload.agency_name]
                        .filter(Boolean)
                        .join(' · ')}
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
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="flex-shrink-0 text-xs text-bna-primary hover:text-bna-secondary font-medium"
                  >
                    Marquer lu
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
