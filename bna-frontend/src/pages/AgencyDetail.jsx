import React from 'react'
import { Link, useParams } from 'react-router-dom'

import { useGetAgencyQuery } from '../store/services/serviceApi'

export default function AgencyDetail() {
  const { id } = useParams()
  const { data: agency, isLoading, error } = useGetAgencyQuery(id)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (error || !agency) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Agence introuvable.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/agencies" className="text-bna-primary hover:underline text-sm">
        ← Retour aux agences
      </Link>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900">{agency.name}</h1>
        <p className="mt-2 text-gray-500">
          {agency.address}, {agency.city}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {agency.phone && (
            <div>
              <span className="text-xs text-gray-400 uppercase">Téléphone</span>
              <p className="font-medium text-gray-900">{agency.phone}</p>
            </div>
          )}
          {agency.email && (
            <div>
              <span className="text-xs text-gray-400 uppercase">Email</span>
              <p className="font-medium text-gray-900">{agency.email}</p>
            </div>
          )}
        </div>

        {agency.agency_services?.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Services disponibles
            </h2>
            <div className="space-y-3">
              {agency.agency_services
                .filter((as) => as.is_active)
                .map((as) => (
                  <div
                    key={as.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{as.service.name}</p>
                      <p className="text-sm text-gray-500">
                        {as.service.duration_minutes} min
                      </p>
                    </div>
                    <Link
                      to={`/appointments/new?service_id=${as.service.id}&agency_id=${agency.id}`}
                      className="text-sm px-4 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
                    >
                      Rendez-vous
                    </Link>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
