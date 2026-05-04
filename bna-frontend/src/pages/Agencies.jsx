import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  useGetAgenciesQuery,
  useGetAgencyCitiesQuery,
} from '../store/services/serviceApi'

export default function Agencies() {
  const [city, setCity] = useState('')

  const { data: cities = [] } = useGetAgencyCitiesQuery()
  const { data: agencies = [], isLoading, error } = useGetAgenciesQuery({
    status: 'open',
    ...(city ? { city } : {}),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement des agences...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Impossible de charger les agences.</p>
      </div>
    )
  }

  const filters = [{ value: '', label: 'Toutes' }, ...cities.map((c) => ({ value: c, label: c }))]

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nos agences</h1>
        <p className="text-sm text-gray-500">
          {agencies.length} agence{agencies.length > 1 ? 's' : ''}
          {city ? ` à ${city}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCity(value)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors
              ${city === value
                ? 'bg-bna-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {agencies.length === 0 ? (
        <p className="text-gray-500">
          Aucune agence{city ? ` à ${city}` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agencies.map((agency) => (
            <Link
              key={agency.id}
              to={`/agencies/${agency.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold text-gray-900">{agency.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{agency.address}</p>
              <p className="text-sm font-medium text-bna-primary mt-1">{agency.city}</p>
              {agency.phone && (
                <p className="text-sm text-gray-400 mt-2">{agency.phone}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
