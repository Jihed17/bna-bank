import React, { useState } from 'react'
import toast from 'react-hot-toast'

import AgencyFormModal from '../clients/admin/AgencyFormModal'
import AgentAssignPanel from '../clients/admin/AgentAssignPanel'
import PendingRegistrationsPanel from '../clients/admin/PendingRegistrationsPanel'
import ServiceFormModal from '../clients/admin/ServiceFormModal'
import { extractError } from '../store/api/baseApi'
import {
  useGetAgentsQuery,
  useGetPendingGuestsQuery,
} from '../store/services/identityApi'
import {
  useCloseAgencyMutation,
  useGetAgenciesQuery,
  useGetServicesQuery,
  useReactivateServiceMutation,
  useSuspendServiceMutation,
} from '../store/services/serviceApi'

export default function AdminDashboard() {
  const [tab, setTab] = useState('services')

  const [serviceModal, setServiceModal] = useState(null) // null | 'create' | service object
  const [agencyModal, setAgencyModal] = useState(null)
  const [assignPanel, setAssignPanel] = useState(null) // service object

  const { data: services = [], isLoading: loadingServices } = useGetServicesQuery({})
  const { data: agencies = [], isLoading: loadingAgencies } = useGetAgenciesQuery({})
  const { data: agents = [] } = useGetAgentsQuery()
  const { data: pending = [] } = useGetPendingGuestsQuery(undefined, {
    pollingInterval: 60_000,
  })

  const [suspendService] = useSuspendServiceMutation()
  const [reactivateService] = useReactivateServiceMutation()
  const [closeAgency] = useCloseAgencyMutation()

  const handleSuspend = async (id) => {
    const r = await suspendService(id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success('Service suspendu.')
  }

  const handleReactivate = async (id) => {
    const r = await reactivateService(id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success('Service réactivé.')
  }

  const handleCloseAgency = async (id) => {
    if (!window.confirm('Confirmer la fermeture de cette agence ?')) return
    const r = await closeAgency(id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success('Agence fermée.')
  }

  const TABS = [
    { id: 'services', label: '⚙️ Services' },
    { id: 'agencies', label: '🏢 Agences' },
    {
      id: 'pending',
      label: pending.length > 0
        ? `👥 Inscriptions (${pending.length})`
        : '👥 Inscriptions',
    },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'services' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setServiceModal('create')}
              className="px-4 py-2 bg-bna-primary text-white rounded-lg text-sm hover:bg-bna-secondary"
            >
              + Nouveau service
            </button>
          </div>

          {loadingServices ? (
            <p className="text-gray-400">Chargement...</p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{service.icon || '🏦'}</span>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full
                          ${service.is_active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'}`}
                      >
                        {service.is_active ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {service.category_display} · {service.type_display} ·{' '}
                      {service.duration_minutes} min
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => setAssignPanel(service)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Agents
                    </button>
                    <button
                      onClick={() => setServiceModal(service)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Modifier
                    </button>
                    {service.is_active ? (
                      <button
                        onClick={() => handleSuspend(service.id)}
                        className="text-xs px-3 py-1.5 text-red-500 border border-red-100 rounded-lg hover:bg-red-50"
                      >
                        Suspendre
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReactivate(service.id)}
                        className="text-xs px-3 py-1.5 text-green-600 border border-green-100 rounded-lg hover:bg-green-50"
                      >
                        Réactiver
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'agencies' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setAgencyModal('create')}
              className="px-4 py-2 bg-bna-primary text-white rounded-lg text-sm hover:bg-bna-secondary"
            >
              + Nouvelle agence
            </button>
          </div>

          {loadingAgencies ? (
            <p className="text-gray-400">Chargement...</p>
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{agency.name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full
                          ${agency.status === 'open'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'}`}
                      >
                        {agency.status_display}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {agency.address}, {agency.city} · {agency.capacity} RDV max
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => setAgencyModal(agency)}
                      className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                      Modifier
                    </button>
                    {agency.status === 'open' && (
                      <button
                        onClick={() => handleCloseAgency(agency.id)}
                        className="text-xs px-3 py-1.5 text-red-500 border border-red-100 rounded-lg hover:bg-red-50"
                      >
                        Fermer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'pending' && <PendingRegistrationsPanel />}

      {serviceModal && (
        <ServiceFormModal
          service={serviceModal === 'create' ? null : serviceModal}
          onClose={() => setServiceModal(null)}
        />
      )}
      {agencyModal && (
        <AgencyFormModal
          agency={agencyModal === 'create' ? null : agencyModal}
          onClose={() => setAgencyModal(null)}
        />
      )}
      {assignPanel && (
        <AgentAssignPanel
          service={assignPanel}
          agents={agents}
          onClose={() => setAssignPanel(null)}
        />
      )}
    </div>
  )
}
