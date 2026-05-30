import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

import { extractError } from '../store/api/baseApi'
import {
  useGetAppointmentQuery,
  useGetAvailableSlotsQuery,
  useRequestAppointmentMutation,
  useUpdateAppointmentMutation,
} from '../store/services/appointmentApi'
import {
  useGetAgenciesQuery,
  useGetServicesQuery,
} from '../store/services/serviceApi'

/**
 * Dual-mode form:
 *   - /appointments/new[?service_id=&agency_id=&slot=]    → create
 *   - /appointments/:id/edit                              → edit
 *
 * In edit mode the service and agency are read-only (changing them is
 * essentially a new appointment); only the slot and reason are editable,
 * and only while the appointment is still PENDING.
 */
export default function AppointmentForm() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { id: editId } = useParams()
  const isEdit = Boolean(editId)

  // Existing appointment (only in edit mode).
  const {
    data: existing,
    isLoading: loadingExisting,
    error: editError,
  } = useGetAppointmentQuery(editId, { skip: !isEdit })

  // URL pre-fill (create mode only).
  const prefilledSlot = searchParams.get('slot') || ''
  const prefilledServiceId = searchParams.get('service_id') || ''
  const prefilledAgencyId = searchParams.get('agency_id') || ''

  const [serviceId, setServiceId] = useState(prefilledServiceId)
  const [agencyId, setAgencyId] = useState(prefilledAgencyId)
  const [slot, setSlot] = useState(prefilledSlot)
  const [date, setDate] = useState(
    prefilledSlot
      ? new Date(prefilledSlot).toISOString().split('T')[0]
      : '',
  )
  const [reason, setReason] = useState('')

  // Once the existing appointment loads (edit mode), seed the form.
  useEffect(() => {
    if (!isEdit || !existing) return
    setServiceId(String(existing.service?.id ?? existing.service_id ?? ''))
    setAgencyId(String(existing.agency?.id ?? existing.agency_id ?? ''))
    setSlot(existing.scheduled_at)
    setDate(new Date(existing.scheduled_at).toISOString().split('T')[0])
    setReason(existing.reason || '')
  }, [isEdit, existing])

  const { data: services = [] } = useGetServicesQuery({})
  const { data: agencies = [] } = useGetAgenciesQuery(
    serviceId ? { service_id: serviceId } : {},
    { skip: !serviceId },
  )
  const { data: slots = [] } = useGetAvailableSlotsQuery(
    { service_id: serviceId, agency_id: agencyId, date },
    { skip: !serviceId || !agencyId || !date },
  )

  const [requestAppointment, { isLoading: creating }] = useRequestAppointmentMutation()
  const [updateAppointment, { isLoading: updating }] = useUpdateAppointmentMutation()
  const isLoading = creating || updating

  // In create mode, when the user changes the service, reset agency/date/slot —
  // but never on the very first render so URL pre-fill survives.
  const initialServiceId = useState(prefilledServiceId)[0]
  useEffect(() => {
    if (isEdit) return
    if (serviceId === initialServiceId) return
    setAgencyId('')
    setDate('')
    setSlot('')
  }, [isEdit, serviceId, initialServiceId])

  // Edit-mode guard: the API rejects non-PENDING anyway, but the UX is
  // friendlier if we redirect early.
  if (isEdit && existing && existing.status !== 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Modification impossible
        </h1>
        <p className="text-gray-500 mb-6">
          Seuls les rendez-vous en attente peuvent être modifiés.
          <br />
          Pour changer ce rendez-vous, annulez-le et créez-en un nouveau.
        </p>
        <button
          onClick={() => navigate(`/appointments/${editId}`)}
          className="px-6 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
        >
          Retour au rendez-vous
        </button>
      </div>
    )
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement…</p>
      </div>
    )
  }

  if (isEdit && editError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Rendez-vous introuvable.</p>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!slot) {
      toast.error('Veuillez choisir un créneau.')
      return
    }

    if (isEdit) {
      const result = await updateAppointment({
        appointmentId: Number(editId),
        scheduled_at: slot,
        reason,
      })
      if (result.error) {
        toast.error(extractError(result.error))
        return
      }
      toast.success('Rendez-vous modifié.')
      navigate(`/appointments/${editId}`)
    } else {
      const result = await requestAppointment({
        service_id: Number(serviceId),
        agency_id: Number(agencyId),
        scheduled_at: slot,
        reason,
      })
      if (result.error) {
        toast.error(extractError(result.error))
        return
      }
      toast.success('Rendez-vous demandé avec succès !')
      navigate('/appointments')
    }
  }

  const selectedService = services.find((s) => String(s.id) === String(serviceId))
  const selectedAgency = agencies.find((a) => String(a.id) === String(agencyId))

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {isEdit ? 'Modifier le rendez-vous' : 'Prendre un rendez-vous'}
      </h1>

      {isEdit && existing && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800">
          Référence <span className="font-mono">{existing.reference}</span> ·
          en attente d'agent. Vous pouvez ajuster le créneau et le motif.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Service
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            disabled={isEdit}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="">Sélectionner un service</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="text-xs text-gray-400 mt-1">
              Pour changer de service, annulez et recréez.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agence
          </label>
          <select
            value={agencyId}
            onChange={(e) => {
              setAgencyId(e.target.value)
              setDate('')
              setSlot('')
            }}
            required
            disabled={!serviceId || isEdit}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">Sélectionner une agence</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date souhaitée
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setSlot('')
            }}
            required
            disabled={!agencyId}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {date && agencyId && serviceId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Créneau disponible
            </label>
            {slots.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucun créneau disponible pour cette date.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`py-2 px-3 rounded-lg text-sm border transition-colors
                      ${slot === s
                        ? 'bg-bna-primary text-white border-bna-primary'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-bna-accent'}`}
                  >
                    {new Date(s).toLocaleTimeString('fr-TN', { timeStyle: 'short' })}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motif (optionnel)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Décrivez brièvement l'objet de votre rendez-vous..."
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
          />
        </div>

        {/* Confirmation summary */}
        {slot && serviceId && agencyId && (
          <div className="bg-bna-light border border-bna-primary/20 rounded-xl p-4 text-sm">
            <p className="font-medium text-bna-secondary mb-2">Récapitulatif</p>
            <p className="text-bna-primary">
              Service : {selectedService?.name || existing?.service?.name}
            </p>
            <p className="text-bna-primary">
              Agence : {selectedAgency?.name || existing?.agency?.name}
            </p>
            <p className="text-bna-primary">
              Créneau :{' '}
              {format(parseISO(slot), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !slot}
          className="w-full py-3 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary disabled:opacity-60 font-medium"
        >
          {isLoading
            ? 'Envoi en cours...'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Confirmer la demande'}
        </button>
      </form>
    </div>
  )
}
