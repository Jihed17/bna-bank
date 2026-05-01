import React, { useState } from 'react'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import {
  useAssignAgentMutation,
  useGetAgenciesQuery,
} from '../../store/services/serviceApi'

/**
 * Props:
 *   service — the service object (id, name)
 *   agents  — list of User objects with role=agent (fetched from
 *             identityApi.useGetAgentsQuery in the parent)
 *   onClose — close handler
 */
export default function AgentAssignPanel({ service, agents, onClose }) {
  const [agencyId, setAgencyId] = useState('')
  const [agentId, setAgentId] = useState('')

  const { data: agencies = [] } = useGetAgenciesQuery({})
  const [assign, { isLoading: assigning }] = useAssignAgentMutation()

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!agencyId || !agentId) return

    const result = await assign({
      serviceId: service.id,
      agent_id: Number(agentId),
      agency_id: Number(agencyId),
    })

    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Agent affecté.')
      setAgentId('')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Affecter un agent
        </h2>
        <p className="text-sm text-gray-500 mb-6">{service.name}</p>

        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agence
            </label>
            <select
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
              required
              className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
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
              Agent
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              required
              className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
            >
              <option value="">Sélectionner un agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || `${a.first_name} ${a.last_name}`} ({a.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
            >
              Fermer
            </button>
            <button
              type="submit"
              disabled={assigning}
              className="flex-1 py-2 bg-bna-primary text-white rounded-lg text-sm hover:bg-bna-secondary disabled:opacity-60"
            >
              {assigning ? 'Affectation...' : 'Affecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
