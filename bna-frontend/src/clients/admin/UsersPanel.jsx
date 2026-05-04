import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import SearchBar, { matchesQuery } from '../../components/SearchBar'
import { extractError } from '../../store/api/baseApi'
import {
  useArchiveAccountMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useReactivateAccountMutation,
  useSuspendAccountMutation,
} from '../../store/services/identityApi'

const STATUS_BADGE = {
  active:    { label: 'Actif',      cls: 'bg-green-50 text-green-700' },
  pending:   { label: 'En attente', cls: 'bg-yellow-50 text-yellow-700' },
  suspended: { label: 'Suspendu',   cls: 'bg-orange-50 text-orange-700' },
  closed:    { label: 'Archivé',    cls: 'bg-gray-100 text-gray-500' },
}

const STATUS_FILTERS = [
  { value: 'all',       label: 'Tous' },
  { value: 'active',    label: 'Actifs' },
  { value: 'suspended', label: 'Suspendus' },
  { value: 'closed',    label: 'Archivés' },
  { value: 'pending',   label: 'En attente' },
]

/**
 * Admin panel listing all users of a given role (client / agent), with
 * filters by status and quick actions: suspend, reactivate, archive,
 * delete.
 *
 * The backend `delete_user` falls back to archiving when an FK prevents
 * a hard delete — both outcomes block login (status=suspended/closed).
 */
export default function UsersPanel({ role }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')

  const { data: users = [], isLoading } = useGetUsersQuery({
    role,
    status: statusFilter,
  })

  const filteredUsers = useMemo(
    () => users.filter((u) => matchesQuery(
      query,
      u.first_name,
      u.last_name,
      u.full_name,
      u.email,
      u.phone,
      u.agency_name,
    )),
    [users, query],
  )

  const [suspend, { isLoading: suspending }] = useSuspendAccountMutation()
  const [reactivate, { isLoading: reactivating }] = useReactivateAccountMutation()
  const [archive, { isLoading: archiving }] = useArchiveAccountMutation()
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation()
  const busy = suspending || reactivating || archiving || deleting

  const handleSuspend = async (user) => {
    if (!window.confirm(`Suspendre ${user.email} ? L'utilisateur ne pourra plus se connecter.`)) return
    const r = await suspend(user.id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success(`${user.email} suspendu.`)
  }

  const handleReactivate = async (user) => {
    const r = await reactivate(user.id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success(`${user.email} réactivé.`)
  }

  const handleArchive = async (user) => {
    if (!window.confirm(
      `Archiver ${user.email} ? Le compte sera bloqué et conservé pour l'audit.`,
    )) return
    const r = await archive(user.id)
    if (r.error) toast.error(extractError(r.error))
    else toast.success(`${user.email} archivé.`)
  }

  const handleDelete = async (user) => {
    if (!window.confirm(
      `Supprimer ${user.email} ? Si l'utilisateur a un historique (RDV, avis), il sera archivé à la place.`,
    )) return
    const r = await deleteUser(user.id)
    if (r.error) {
      toast.error(extractError(r.error))
    } else {
      const mode = r.data?.data?.mode || 'deleted'
      toast.success(
        mode === 'archived'
          ? `${user.email} archivé (a un historique).`
          : `${user.email} supprimé définitivement.`,
      )
    }
  }

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder={role === 'agent'
          ? 'Rechercher un agent (nom, email, agence…)'
          : 'Rechercher un client (nom, email, téléphone…)'}
        className="mb-4 max-w-md"
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors
              ${statusFilter === value
                ? 'bg-bna-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-gray-400">Chargement...</p>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-gray-500">
            {users.length === 0
              ? `Aucun ${role === 'agent' ? 'agent' : 'client'} dans cette catégorie.`
              : `Aucun ${role === 'agent' ? 'agent' : 'client'} ne correspond à « ${query} ».`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const badge = STATUS_BADGE[user.status] || {
              label: user.status,
              cls: 'bg-gray-100 text-gray-600',
            }
            const isActive = user.status === 'active'
            const isSuspendedOrClosed = ['suspended', 'closed'].includes(user.status)

            return (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {user.full_name || `${user.first_name} ${user.last_name}`}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {user.email}
                    {user.phone && ` · ${user.phone}`}
                  </p>
                  {role === 'agent' && (
                    <p className="text-xs text-gray-400 mt-1">
                      Agence : {user.agency_name || (
                        <span className="italic">non rattaché</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  {isActive && (
                    <button
                      onClick={() => handleSuspend(user)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-60"
                    >
                      Suspendre
                    </button>
                  )}
                  {isSuspendedOrClosed && (
                    <button
                      onClick={() => handleReactivate(user)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 border border-green-200 text-green-600 rounded-lg hover:bg-green-50 disabled:opacity-60"
                    >
                      Réactiver
                    </button>
                  )}
                  {user.status !== 'closed' && (
                    <button
                      onClick={() => handleArchive(user)}
                      disabled={busy}
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                    >
                      Archiver
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={busy}
                    className="text-xs px-3 py-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-60"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
