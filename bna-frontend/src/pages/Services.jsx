import React, { useState } from 'react'
import { Link } from 'react-router-dom'

import { useGetServicesQuery } from '../store/services/serviceApi'

export default function Services() {
  const [category, setCategory] = useState('')
  const { data: services = [], isLoading, error } = useGetServicesQuery(
    category ? { category } : {},
  )

  const categories = [
    { value: '', label: 'Tous les services' },
    { value: 'retail', label: 'Particuliers' },
    { value: 'corporate', label: 'Entreprises' },
    { value: 'investment', label: 'Investissement' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'digital', label: 'Digital' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement des services...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Impossible de charger les services.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Nos services</h1>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors
              ${category === value
                ? 'bg-bna-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {services.length === 0 ? (
        <p className="text-gray-500">Aucun service disponible.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Link
              key={service.id}
              to={`/services/${service.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-bna-primary text-2xl mb-3">
                {service.icon || '🏦'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {service.name}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-2">
                {service.description || service.category_display}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs bg-bna-light text-bna-primary px-2 py-1 rounded-full">
                  {service.duration_minutes} min
                </span>
                <span className="text-xs text-gray-400">
                  {service.type_display}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
