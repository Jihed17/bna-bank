import React from 'react'
import { Link, useParams } from 'react-router-dom'

import ReviewsSection from '../clients/reviews/ReviewsSection'
import { useIsAuthenticated } from '../store/hooks'
import {
  useGetAgenciesQuery,
  useGetServiceQuery,
} from '../store/services/serviceApi'

export default function ServiceDetail() {
  const { id } = useParams()
  const isAuthenticated = useIsAuthenticated()

  const {
    data: service,
    isLoading: loadingService,
    error: serviceError,
  } = useGetServiceQuery(id)

  const { data: agencies = [], isLoading: loadingAgencies } = useGetAgenciesQuery(
    { service_id: id },
    { skip: !id },
  )

  if (loadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (serviceError || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Service introuvable.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <Link to="/services" className="text-bna-primary hover:underline text-sm">
        ← Retour aux services
      </Link>

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="text-5xl mb-4">{service.icon || '🏦'}</div>
        <h1 className="text-3xl font-bold text-gray-900">{service.name}</h1>
        <p className="mt-2 text-gray-500">
          {service.category_display} — {service.type_display}
        </p>

        {service.description && (
          <p className="mt-6 text-gray-700 leading-relaxed">{service.description}</p>
        )}

        <div className="mt-6 flex items-center gap-4">
          <span className="text-sm bg-bna-light text-bna-primary px-3 py-1 rounded-full">
            Durée : {service.duration_minutes} min
          </span>
        </div>

        {isAuthenticated ? (
          <Link
            to={`/appointments/new?service_id=${service.id}`}
            className="mt-8 inline-block px-6 py-3 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary transition-colors"
          >
            Prendre rendez-vous
          </Link>
        ) : (
          <Link
            to={`/login?next=/appointments/new?service_id=${service.id}`}
            className="mt-8 inline-block px-6 py-3 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
          >
            Connexion pour prendre rendez-vous
          </Link>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Agences proposant ce service
        </h2>
        {loadingAgencies ? (
          <p className="text-gray-400">Chargement des agences...</p>
        ) : agencies.length === 0 ? (
          <p className="text-gray-500">Aucune agence disponible pour ce service.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agencies.map((agency) => (
              <Link
                key={agency.id}
                to={`/agencies/${agency.id}`}
                className="block bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-shadow"
              >
                <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {agency.address}, {agency.city}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Reviews — public read, client write */}
      <ReviewsSection serviceId={Number(id)} />
    </div>
  )
}
