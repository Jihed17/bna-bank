import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import { useRegisterMutation } from '../../store/services/identityApi'

/**
 * Register flow — admin-approval edition:
 *   1. POST /identity/register/  → backend creates GUEST in PENDING status
 *   2. NO auto-login (the new account is not yet ACTIVE)
 *   3. Show success screen explaining the next step
 *
 * The login page will refuse the credentials with "compte non actif" until
 * an admin approves the registration via the AdminDashboard pending tab.
 */
export default function Register() {
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()

  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const result = await register(form)
    if (result.error) {
      toast.error(extractError(result.error))
      return
    }

    toast.success('Compte créé. En attente de validation.')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Compte créé !
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Votre demande d'inscription a été envoyée à un administrateur BNA.
            Vous recevrez un email dès que votre compte sera activé.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            En attendant, vous pouvez parcourir les services et agences sans
            être connecté.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate('/services')}
              className="w-full py-2 px-4 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
            >
              Parcourir les services
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2 px-4 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Aller à la page de connexion
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Créer un compte
        </h2>
        <p className="text-center text-sm text-gray-500 -mt-4">
          Votre demande sera examinée par un administrateur.
        </p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {[
            { name: 'first_name', label: 'Prénom', type: 'text' },
            { name: 'last_name', label: 'Nom', type: 'text' },
            { name: 'email', label: 'Email', type: 'email' },
            { name: 'phone', label: 'Téléphone', type: 'tel' },
            { name: 'password', label: 'Mot de passe', type: 'password' },
          ].map(({ name, label, type }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700">
                {label}
              </label>
              <input
                type={type}
                name={name}
                required={name !== 'phone'}
                minLength={name === 'password' ? 8 : undefined}
                value={form[name]}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-bna-primary text-white rounded-md hover:bg-bna-secondary disabled:opacity-60"
          >
            {isLoading ? 'Création...' : 'Créer mon compte'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-bna-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
