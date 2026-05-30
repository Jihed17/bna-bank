import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

import CancelModal from '../clients/user/CancelModal'
import { useGetAppointmentQuery } from '../store/services/appointmentApi'

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: "En attente d'un agent" },
  assigned: { color: 'bg-blue-100 text-blue-700', label: 'Agent assigné' },
  confirmed: { color: 'bg-green-100 text-green-700', label: 'Confirmé' },
  completed: { color: 'bg-gray-100 text-gray-600', label: 'Effectué' },
  cancelled: { color: 'bg-red-100 text-red-600', label: 'Annulé' },
  expired: { color: 'bg-orange-100 text-orange-700', label: 'Expiré' },
  rejected: { color: 'bg-red-100 text-red-600', label: 'Refusé' },
}

export default function AppointmentDetail() {
  const { id } = useParams()
  const [showCancel, setShowCancel] = useState(false)
  const { data: appt, isLoading, error } = useGetAppointmentQuery(id)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bna-primary" />
      </div>
    )
  }

  if (error || !appt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Rendez-vous introuvable.</p>
      </div>
    )
  }

  const statusConf =
    STATUS_CONFIG[appt.status] || {
      color: 'bg-gray-100 text-gray-600',
      label: appt.status,
    }
  const canCancel = ['pending', 'assigned', 'confirmed'].includes(appt.status)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/appointments" className="text-bna-primary hover:underline text-sm">
        ← Retour à mes rendez-vous
      </Link>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm font-mono text-gray-400 mb-1">{appt.reference}</p>
            <h1 className="text-2xl font-bold text-gray-900">
              {appt.service?.name}
            </h1>
            <p className="text-gray-500 mt-1">
              {appt.agency?.name} — {appt.agency?.city}
            </p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusConf.color}`}>
            {statusConf.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6 border-t border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Date et heure
            </p>
            <p className="font-medium text-gray-900">
              {format(parseISO(appt.scheduled_at), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Durée
            </p>
            <p className="font-medium text-gray-900">{appt.duration_minutes} min</p>
          </div>
          {appt.agent && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Agent assigné
              </p>
              <p className="font-medium text-gray-900">{appt.agent.full_name}</p>
            </div>
          )}
          {appt.reason && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                Motif
              </p>
              <p className="text-gray-700">{appt.reason}</p>
            </div>
          )}
        </div>

        {appt.status_logs?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Historique des statuts
            </h3>
            <div className="space-y-2">
              {appt.status_logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 text-sm text-gray-500"
                >
                  <span className="w-2 h-2 rounded-full bg-bna-accent flex-shrink-0" />
                  <span className="capitalize">{log.to_status}</span>
                  <span className="text-gray-300">·</span>
                  <span>
                    {format(parseISO(log.changed_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </span>
                  {log.reason && (
                    <span className="text-gray-400 truncate">— {log.reason}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(canCancel || appt.status === 'pending') && (
          <div className="mt-8 flex flex-wrap gap-3">
            {appt.status === 'pending' && (
              <Link
                to={`/appointments/${appt.id}/edit`}
                className="px-6 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary text-sm font-medium"
              >
                Modifier
              </Link>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancel(true)}
                className="px-6 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
              >
                Annuler ce rendez-vous
              </button>
            )}
          </div>
        )}
      </div>

      {showCancel && (
        <CancelModal
          appointment={appt}
          onClose={() => setShowCancel(false)}
        />
      )}
    </div>
  )
}
