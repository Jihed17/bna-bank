import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import { useLoginMutation } from '../../store/services/identityApi'

export default function Login() {
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginMutation()

  const [form, setForm] = useState({ email: '', password: '' })

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(form)

    if (result.error) {
      toast.error(extractError(result.error))
      return
    }

    toast.success('Connexion réussie !')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-bna-primary hover:text-bna-secondary"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-bna-primary text-white rounded-md hover:bg-bna-secondary disabled:opacity-60"
          >
            {isLoading ? 'Connexion...' : 'Se connecter'}
          </button>
          <p className="text-center text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-bna-primary hover:underline">
              S'inscrire
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
