import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import { useConfirmPasswordResetMutation } from '../../store/services/identityApi'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [confirmReset, { isLoading }] = useConfirmPasswordResetMutation()
  const [form, setForm] = useState({ new_password: '', confirm: '' })

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!token) {
      toast.error('Lien invalide : jeton manquant.')
      return
    }
    if (form.new_password !== form.confirm) {
      toast.error('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (form.new_password.length < 8) {
      toast.error('Le mot de passe doit faire au moins 8 caractères.')
      return
    }

    const result = await confirmReset({
      token,
      new_password: form.new_password,
    })

    if (result.error) {
      toast.error(extractError(result.error))
      return
    }

    toast.success('Mot de passe modifié — vous pouvez vous reconnecter.')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Nouveau mot de passe
          </h2>
          {!token && (
            <p className="mt-3 text-center text-sm text-red-600">
              Aucun jeton détecté dans l'URL — utilisez le lien reçu par email.
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              name="new_password"
              required
              minLength={8}
              value={form.new_password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="confirm"
              required
              minLength={8}
              value={form.confirm}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full py-2 px-4 bg-bna-primary text-white rounded-md hover:bg-bna-secondary disabled:opacity-60"
          >
            {isLoading ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-bna-primary hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  )
}
