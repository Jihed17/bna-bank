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
 * The form is sent as multipart/form-data when an identity image is
 * provided so the file goes through the same request as the rest.
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
    gender: '',
  })
  const [identityImage, setIdentityImage] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Always use FormData when an image is attached. For pure-text we
    // could send JSON, but FormData works just as well and keeps a
    // single code path.
    const payload = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) payload.append(k, v)
    })
    if (identityImage) payload.append('identity_image', identityImage)

    const result = await register(payload)
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
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Créer un compte
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Votre demande sera examinée par un administrateur.
          </p>
        </div>

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

          {/* Gender — radio for clarity (only 2 options) */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Civilité
            </span>
            <div className="flex gap-4">
              {[
                { value: 'male',   label: 'Homme' },
                { value: 'female', label: 'Femme' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 border rounded-md cursor-pointer transition-colors
                    ${form.gender === value
                      ? 'border-bna-primary bg-bna-light text-bna-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={form.gender === value}
                    onChange={handleChange}
                    className="hidden"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Identity document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pièce d'identité <span className="text-gray-400 font-normal">(optionnel)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setIdentityImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-bna-light file:text-bna-primary hover:file:bg-bna-primary/10"
            />
            {identityImage && (
              <p className="mt-1 text-xs text-gray-500">
                Sélectionné : {identityImage.name}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              Photo de votre CIN ou passeport — accélère la validation par l'admin.
            </p>
          </div>

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
