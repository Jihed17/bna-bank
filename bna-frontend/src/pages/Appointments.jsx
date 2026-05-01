import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import CancelModal from '../clients/user/CancelModal'
import { useGetAppointmentsQuery } from '../store/services/appointmentApi'

const STATUS_LABELS = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  assigned: { label: 'Assigné', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmé', color: 'bg-green-100 text-green-700' },
  completed: { label: 'Effectué', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' },
  expired: { label: 'Expiré', color: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
}

export default function Appointments() {
  const [filter, setFilter] = useState('')
  const [cancelTarget, setCancelTarget] = useState(null)

  const { data: appointments = [], isLoading } = useGetAppointmentsQuery(
    filter ? { status: filter } : {},
  )

  const filters = [
    { value: '', label: 'Tous' },
    { value: 'pending', label: 'En attente' },
    { value: 'assigned', label: 'Assigné' },
    { value: 'confirmed', label: 'Confirmé' },
    { value: 'completed', label: 'Effectué' },
    { value: 'cancelled', label: 'Annulé' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mes rendez-vous</h1>
        <Link
          to="/appointments/new"
          className="px-4 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
        >
          + Nouveau
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors
              ${filter === value
                ? 'bg-bna-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">Aucun rendez-vous trouvé.</p>
          <Link to="/appointments/new" className="text-bna-primary hover:underline">
            Prendre votre premier rendez-vous
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => {
            const statusInfo =
              STATUS_LABELS[appt.status] || {
                label: appt.status,
                color: 'bg-gray-100 text-gray-600',
              }
            const canCancel = ['pending', 'assigned', 'confirmed'].includes(appt.status)

            return (
              <div
                key={appt.id}
                className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        to={`/appointments/${appt.id}`}
                        className="font-mono text-sm text-bna-primary hover:underline"
                      >
                        {appt.reference}
                      </Link>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {appt.service_name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {appt.agency_name} — {appt.agency_city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(appt.scheduled_at).toLocaleString('fr-TN', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </p>
                    {appt.agent_name && (
                      <p className="text-sm text-bna-primary mt-1">
                        Agent : {appt.agent_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {appt.status === 'pending' && (
                      <Link
                        to={`/appointments/${appt.id}/edit`}
                        className="text-sm text-bna-primary hover:underline"
                      >
                        Modifier
                      </Link>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => setCancelTarget(appt)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Annuler
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  )
}
