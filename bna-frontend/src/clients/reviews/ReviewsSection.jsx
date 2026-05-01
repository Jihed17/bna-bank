import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

import { extractError } from '../../store/api/baseApi'
import {
  useCurrentUser,
  useIsAuthenticated,
  useIsClient,
} from '../../store/hooks'
import {
  useCreateReviewMutation,
  useDeleteReviewMutation,
  useGetReviewsForServiceQuery,
  useUpdateReviewMutation,
} from '../../store/services/reviewApi'

/**
 * Reviews block embedded in ServiceDetail.
 * - Public: list of published reviews + average rating.
 * - Authenticated client: form to publish, edit, or delete OWN review.
 *
 * Permission gating:
 *   - useIsClient covers CLIENT, AGENT, ADMIN — only GUEST is excluded.
 *   - The backend Manager re-checks; this is just UX.
 */
function StarsDisplay({ rating, size = 'sm' }) {
  const sz = size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={`${sz} text-yellow-500 select-none`}>
      {'★'.repeat(rating)}
      <span className="text-gray-200">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

function StarsPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${
            n <= value ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-300'
          }`}
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function ReviewsSection({ serviceId }) {
  const isAuthenticated = useIsAuthenticated()
  const isClient = useIsClient()
  const currentUser = useCurrentUser()

  const { data: reviews = [], isLoading } = useGetReviewsForServiceQuery(serviceId, {
    skip: !serviceId,
  })

  const [createReview, { isLoading: creating }] = useCreateReviewMutation()
  const [updateReview, { isLoading: updating }] = useUpdateReviewMutation()
  const [deleteReview] = useDeleteReviewMutation()

  // Find the current user's review, if any.
  const ownReview = currentUser
    ? reviews.find((r) => r.author_id === currentUser.id)
    : null

  // Form state — separate so we can edit ownReview later.
  const [rating, setRating] = useState(ownReview?.rating || 5)
  const [comment, setComment] = useState(ownReview?.comment || '')
  const [editing, setEditing] = useState(false)

  React.useEffect(() => {
    if (ownReview) {
      setRating(ownReview.rating)
      setComment(ownReview.comment || '')
    }
  }, [ownReview?.id, ownReview?.rating, ownReview?.comment])

  const avg =
    reviews.length === 0
      ? 0
      : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      toast.error('Veuillez choisir entre 1 et 5 étoiles.')
      return
    }

    if (ownReview && editing) {
      const result = await updateReview({
        reviewId: ownReview.id,
        rating,
        comment,
      })
      if (result.error) toast.error(extractError(result.error))
      else {
        toast.success('Avis mis à jour.')
        setEditing(false)
      }
    } else if (!ownReview) {
      const result = await createReview({
        service_id: Number(serviceId),
        rating,
        comment,
      })
      if (result.error) toast.error(extractError(result.error))
      else {
        toast.success('Avis publié — merci !')
        setRating(5)
        setComment('')
      }
    }
  }

  const handleDelete = async () => {
    if (!ownReview) return
    if (!window.confirm('Supprimer votre avis ?')) return
    const result = await deleteReview(ownReview.id)
    if (result.error) toast.error(extractError(result.error))
    else {
      toast.success('Avis supprimé.')
      setRating(5)
      setComment('')
      setEditing(false)
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Avis clients
        </h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarsDisplay rating={Math.round(avg)} size="md" />
            <span className="text-sm text-gray-500">
              {avg.toFixed(1)} · {reviews.length} avis
            </span>
          </div>
        )}
      </div>

      {/* Compose / edit form (auth-gated) */}
      {isAuthenticated && isClient && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
          {ownReview && !editing ? (
            <div>
              <p className="text-sm text-gray-500 mb-2">Votre avis</p>
              <div className="flex items-center gap-3 mb-2">
                <StarsDisplay rating={ownReview.rating} size="md" />
                <span className="text-xs text-gray-400">
                  publié{' '}
                  {formatDistanceToNow(new Date(ownReview.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
              {ownReview.comment && (
                <p className="text-sm text-gray-700 mb-3">{ownReview.comment}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  className="text-xs px-3 py-1.5 border border-red-100 rounded-lg text-red-500 hover:bg-red-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {ownReview ? 'Modifier votre avis' : 'Publier un avis'}
              </p>
              <div className="mb-3">
                <StarsPicker value={rating} onChange={setRating} />
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Décrivez votre expérience (optionnel)…"
                className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2 bg-bna-primary text-white rounded-lg text-sm hover:bg-bna-secondary disabled:opacity-60"
                >
                  {ownReview ? 'Enregistrer' : 'Publier'}
                </button>
                {ownReview && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false)
                      setRating(ownReview.rating)
                      setComment(ownReview.comment || '')
                    }}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <p className="text-sm text-gray-500 mb-4">
          <a href="/login" className="text-bna-primary hover:underline">
            Connectez-vous
          </a>{' '}
          pour publier votre avis.
        </p>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement des avis…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-500">
          Aucun avis pour le moment. Soyez le premier !
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-100 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <StarsDisplay rating={r.rating} />
                  <span className="text-sm font-medium text-gray-900">
                    {r.author_name}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(r.created_at), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm text-gray-700">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
