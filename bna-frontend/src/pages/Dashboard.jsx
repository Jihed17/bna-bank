import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useCurrentUser, useIsAgent } from '../store/hooks'
import { useGetAppointmentsQuery } from '../store/services/appointmentApi'

export default function Dashboard() {
  const user = useCurrentUser()
  const isAgent = useIsAgent()
  const navigate = useNavigate()

  // Agents have a dedicated dashboard at /agent.
  useEffect(() => {
    if (isAgent) navigate('/agent', { replace: true })
  }, [isAgent, navigate])

  const { data: appointments = [], isLoading } = useGetAppointmentsQuery(
    isAgent ? { status: 'pending' } : {},
    { skip: isAgent },
  )

  const upcomingAppointments = appointments
    .filter((a) => ['pending', 'assigned', 'confirmed'].includes(a.status))
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Bonjour, {user?.first_name || 'cher utilisateur'} 👋
      </h1>
      <p className="text-gray-500 mb-8 capitalize">{user?.role_display}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {!isAgent && (
          <Link
            to="/appointments/new"
            className="bg-bna-primary text-white rounded-xl p-6 text-center hover:bg-bna-secondary transition-colors"
          >
            <span className="text-2xl block mb-2">📅</span>
            <span className="font-medium">Prendre RDV</span>
          </Link>
        )}
        <Link
          to="/appointments"
          className="bg-white border border-gray-100 shadow-sm rounded-xl p-6 text-center hover:shadow-md transition-shadow"
        >
          <span className="text-2xl block mb-2">📋</span>
          <span className="font-medium text-gray-900">
            {isAgent ? 'Mes demandes' : 'Mes rendez-vous'}
          </span>
        </Link>
        <Link
          to="/profile"
          className="bg-white border border-gray-100 shadow-sm rounded-xl p-6 text-center hover:shadow-md transition-shadow"
        >
          <span className="text-2xl block mb-2">👤</span>
          <span className="font-medium text-gray-900">Mon profil</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {isAgent ? 'Demandes en attente' : 'Prochains rendez-vous'}
        </h2>
        {upcomingAppointments.length === 0 ? (
          <p className="text-gray-400 text-sm">
            {isAgent
              ? 'Aucune demande en attente.'
              : 'Aucun rendez-vous à venir.'}
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingAppointments.map((appt) => (
              <div
                key={appt.id}
                className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {appt.service_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(appt.scheduled_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    {' — '}
                    {appt.agency_name}
                  </p>
                </div>
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link
          to="/appointments"
          className="mt-4 inline-block text-sm text-bna-primary hover:underline"
        >
          Voir tout →
        </Link>
      </div>
    </div>
  )
}
