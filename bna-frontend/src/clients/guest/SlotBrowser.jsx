import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'

import { useIsAuthenticated } from '../../store/hooks'
import { useGetAvailableSlotsQuery } from '../../store/services/appointmentApi'
import {
  useGetAgenciesQuery,
  useGetServicesQuery,
} from '../../store/services/serviceApi'

/**
 * Public availability widget. Guests can verify slots before registering;
 * picking a slot redirects them through register/login with the slot
 * pre-filled in the URL params (AppointmentForm reads them).
 */
export default function SlotBrowser() {
  const isAuthenticated = useIsAuthenticated()

  const [serviceId, setServiceId] = useState('')
  const [agencyId, setAgencyId] = useState('')
  const [date, setDate] = useState(
    format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  )

  const { data: services = [] } = useGetServicesQuery({})
  const { data: agencies = [] } = useGetAgenciesQuery(
    serviceId ? { service_id: serviceId } : {},
    { skip: !serviceId },
  )
  const { data: slots = [], isFetching } = useGetAvailableSlotsQuery(
    { service_id: serviceId, agency_id: agencyId, date },
    { skip: !serviceId || !agencyId || !date },
  )

  const buildBookingUrl = (slot) => {
    const base = isAuthenticated ? '/appointments/new' : '/register'
    const params = new URLSearchParams({
      service_id: serviceId,
      agency_id: agencyId,
      slot,
    })
    return `${base}?${params.toString()}`
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Vérifier les disponibilités
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value)
              setAgencyId('')
            }}
            className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-bna-primary focus:ring-bna-primary"
          >
            <option value="">Choisir un service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Agence
          </label>
          <select
            value={agencyId}
            onChange={(e) => setAgencyId(e.target.value)}
            disabled={!serviceId}
            className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-bna-primary focus:ring-bna-primary disabled:bg-gray-50 disabled:text-gray-300"
          >
            <option value="">Choisir une agence</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
            className="block w-full rounded-lg border-gray-200 shadow-sm text-sm focus:border-bna-primary focus:ring-bna-primary"
          />
        </div>
      </div>

      {isFetching && (
        <p className="text-sm text-gray-400 animate-pulse">
          Recherche des créneaux...
        </p>
      )}

      {!isFetching && serviceId && agencyId && date && slots.length === 0 && (
        <p className="text-sm text-gray-500">
          Aucun créneau disponible pour cette date.
        </p>
      )}

      {!isFetching && slots.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {slots.length} créneau{slots.length > 1 ? 'x' : ''} disponible
            {slots.length > 1 ? 's' : ''} le{' '}
            {format(new Date(date), 'EEEE d MMMM', { locale: fr })}
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map((slot) => (
              <Link
                key={slot}
                to={buildBookingUrl(slot)}
                className="text-center py-2 px-3 rounded-lg text-sm border border-bna-primary/30 text-bna-secondary bg-bna-light hover:bg-green-100 hover:border-bna-primary transition-colors font-medium"
              >
                {new Date(slot).toLocaleTimeString('fr-TN', { timeStyle: 'short' })}
              </Link>
            ))}
          </div>
          {!isAuthenticated && (
            <p className="text-xs text-gray-400 mt-3">
              Connectez-vous ou créez un compte pour réserver un créneau.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
