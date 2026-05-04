import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import { useRequestPasswordResetMutation } from '../../store/services/identityApi'

export default function ForgotPassword() {
  const [requestReset, { isLoading }] = useRequestPasswordResetMutation()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await requestReset({ email })

    if (result.error) {
      toast.error(extractError(result.error))
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Mot de passe oublié
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Saisissez votre email — nous vous enverrons un lien de
            réinitialisation valable 1 heure.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            Si un compte existe pour <strong>{email}</strong>, un email avec
            le lien de réinitialisation vient de partir. Pensez à vérifier
            vos spams.
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-bna-primary text-white rounded-md hover:bg-bna-secondary disabled:opacity-60"
            >
              {isLoading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-bna-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
