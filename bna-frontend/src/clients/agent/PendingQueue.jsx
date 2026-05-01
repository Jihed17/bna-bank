import React, { useState } from 'react'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import {
  useAcceptAppointmentMutation,
  useGetPendingQueueQuery,
  useRejectAppointmentMutation,
} from '../../store/services/appointmentApi'
import {
  useGetAgenciesQuery,
  useGetServicesQuery,
} from '../../store/services/serviceApi'

export default function PendingQueue() {
  const [serviceId, setServiceId] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: services = [] } = useGetServicesQuery({})
  const { data: agencies = [] } = useGetAgenciesQuery({})
  const { data: queue = [], isLoading } = useGetPendingQueueQuery(
    { service_id: serviceId, agency_id: agencyId },
    { skip: !serviceId || !agencyId, pollingInterval: 30_000 },
  )

  const [accept, { isLoading: accepting }] = useAcceptAppointmentMutation()
  const [reject, { isLoading: rejecting }] = useRejectAppointmentMutation()

  const handleAccept = async (appointmentId) => {
    const result = await accept(appointmentId)
    if (result.error) toast.error(extractError(result.error))
    else toast.success('Rendez-vous accepté !')
  }

  const handleReject = async () => {
    if (!rejectId) return
    const result = await reject({ appointmentId: rejectId, reason: rejectReason })
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Rendez-vous refusé.')
      setRejectId(null)
      setRejectReason('')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        File d'attente
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
        >
          <option value="">Service</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={agencyId}
          onChange={(e) => setAgencyId(e.target.value)}
          className="rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
        >
          <option value="">Agence</option>
          {agencies.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {!serviceId || !agencyId ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Sélectionnez un service et une agence pour voir la file.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-gray-400 animate-pulse">Chargement...</p>
      ) : queue.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          Aucune demande en attente.
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((appt) => (
            <div
              key={appt.id}
              className="rounded-xl border border-gray-100 p-4 hover:border-bna-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-xs text-gray-400">
                    {appt.reference}
                  </p>
                  <p className="font-medium text-gray-900 mt-1">
                    {appt.client_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(appt.scheduled_at).toLocaleString('fr-TN', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                  {appt.reason && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      « {appt.reason} »
                    </p>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => handleAccept(appt.id)}
                    disabled={accepting}
                    className="px-3 py-1.5 bg-bna-primary text-white text-sm rounded-lg hover:bg-bna-secondary disabled:opacity-60"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => setRejectId(appt.id)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setRejectId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-4">
              Motif du refus
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Indisponible sur ce créneau..."
              className="block w-full rounded-lg border-gray-200 text-sm mb-4 focus:border-red-400 focus:ring-red-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
              >
                {rejecting ? 'Refus...' : 'Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
