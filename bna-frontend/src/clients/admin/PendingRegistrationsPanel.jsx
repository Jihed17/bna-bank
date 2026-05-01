import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import { extractError } from '../../store/api/baseApi'
import {
  useApproveGuestMutation,
  useDeleteUserMutation,
  useGetPendingGuestsQuery,
  useRejectGuestMutation,
} from '../../store/services/identityApi'

export default function PendingRegistrationsPanel() {
  const { data: pending = [], isLoading } = useGetPendingGuestsQuery()
  const [approve, { isLoading: approving }] = useApproveGuestMutation()
  const [reject, { isLoading: rejecting }] = useRejectGuestMutation()
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation()

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const busy = approving || rejecting || deleting

  const handleApprove = async (user) => {
    const result = await approve(user.id)
    if (result.error) toast.error(extractError(result.error))
    else toast.success(`${user.email} approuvé.`)
  }

  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    const result = await reject({
      userId: rejectTarget.id,
      reason: rejectReason,
    })
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success(`${rejectTarget.email} refusé.`)
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Supprimer définitivement ${user.email} ?`)) return
    const result = await deleteUser(user.id)
    if (result.error) toast.error(extractError(result.error))
    else toast.success(`${user.email} supprimé.`)
  }

  if (isLoading) {
    return <p className="text-gray-400">Chargement...</p>
  }

  return (
    <div>
      {pending.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="text-3xl mb-2">✨</div>
          <p className="text-gray-500">
            Aucune inscription en attente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {user.full_name || `${user.first_name} ${user.last_name}`}
                  </h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700">
                    {user.status_display}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {user.email}
                  {user.phone && ` · ${user.phone}`}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  inscrit{' '}
                  {formatDistanceToNow(new Date(user.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <button
                  onClick={() => handleApprove(user)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary disabled:opacity-60"
                >
                  Accepter
                </button>
                <button
                  onClick={() => setRejectTarget(user)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-60"
                >
                  Refuser
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={busy}
                  className="text-xs px-3 py-1.5 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-60"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-1">
              Refuser cette inscription ?
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {rejectTarget.email}
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Motif du refus (optionnel)…"
              className="block w-full rounded-lg border-gray-200 text-sm mb-4 focus:border-orange-400 focus:ring-orange-400"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-60"
              >
                {rejecting ? 'Refus…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
