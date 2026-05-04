import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { extractError } from '../../store/api/baseApi'
import { useVerifyEmailMutation } from '../../store/services/identityApi'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [verifyEmail] = useVerifyEmailMutation()
  const [state, setState] = useState({ status: 'pending', message: '' })

  useEffect(() => {
    if (!token) {
      setState({
        status: 'error',
        message: "Aucun jeton détecté dans l'URL — utilisez le lien reçu par email.",
      })
      return
    }

    let cancelled = false
    ;(async () => {
      const result = await verifyEmail({ token })
      if (cancelled) return

      if (result.error) {
        setState({ status: 'error', message: extractError(result.error) })
      } else {
        setState({ status: 'success', message: '' })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token, verifyEmail])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Vérification de votre email
        </h2>

        {state.status === 'pending' && (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bna-primary" />
            <p className="text-sm text-gray-600">Vérification en cours…</p>
          </div>
        )}

        {state.status === 'success' && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800 text-center">
            <p className="font-semibold mb-2">Email vérifié avec succès.</p>
            <p>Votre compte est maintenant actif. Vous pouvez vous connecter.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800 text-center">
            <p className="font-semibold mb-2">Vérification impossible.</p>
            <p>{state.message}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-bna-primary hover:underline">
            Aller à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
