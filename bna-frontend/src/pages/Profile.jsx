import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

import { extractError } from '../store/api/baseApi'
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} from '../store/services/identityApi'

export default function Profile() {
  const { data: user, isLoading } = useGetProfileQuery()
  const [updateProfile, { isLoading: updating }] = useUpdateProfileMutation()
  const [changePassword, { isLoading: changingPw }] = useChangePasswordMutation()

  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    gender: '',
  })
  const [identityImage, setIdentityImage] = useState(null)
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
  })

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        gender: user.gender || '',
      })
    }
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()

    // Build a FormData so identity_image (when picked) goes with the
    // text fields in a single multipart request. fetchBaseQuery skips
    // setting Content-Type when body is FormData so the boundary is
    // preserved.
    const payload = new FormData()
    Object.entries(profileForm).forEach(([k, v]) => {
      // Allow empty string for gender (lets the user "unset" their choice).
      if (v !== null && v !== undefined) payload.append(k, v)
    })
    if (identityImage) payload.append('identity_image', identityImage)

    const result = await updateProfile(payload)
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Profil mis à jour !')
      setIdentityImage(null)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    const result = await changePassword(pwForm)
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Mot de passe modifié !')
      setPwForm({ current_password: '', new_password: '' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Mon profil</h1>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="mb-4">
          <p className="text-sm text-gray-500">Email</p>
          <p className="font-medium text-gray-900">{user?.email}</p>
        </div>
        <div className="mb-4">
          <p className="text-sm text-gray-500">Rôle</p>
          <p className="font-medium text-gray-900">{user?.role_display}</p>
        </div>
        {user?.role === 'agent' && (
          <div className="mb-4">
            <p className="text-sm text-gray-500">Agence de rattachement</p>
            <p className="font-medium text-gray-900">
              {user.agency_name || (
                <span className="text-gray-400 italic">
                  Aucune — contactez un administrateur pour être affecté
                </span>
              )}
            </p>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4 mt-6">
          {[
            { name: 'first_name', label: 'Prénom' },
            { name: 'last_name', label: 'Nom' },
            { name: 'phone', label: 'Téléphone' },
          ].map(({ name, label }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type="text"
                name={name}
                value={profileForm[name]}
                onChange={(e) =>
                  setProfileForm((f) => ({ ...f, [name]: e.target.value }))
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
              />
            </div>
          ))}

          {/* Gender */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">
              Civilité
            </span>
            <div className="flex gap-3">
              {[
                { value: '',       label: 'Non précisé' },
                { value: 'male',   label: 'Homme' },
                { value: 'female', label: 'Femme' },
              ].map(({ value, label }) => (
                <label
                  key={value || 'unset'}
                  className={`flex-1 flex items-center justify-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors
                    ${profileForm.gender === value
                      ? 'border-bna-primary bg-bna-light text-bna-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={value}
                    checked={profileForm.gender === value}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, gender: e.target.value }))
                    }
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
              Pièce d'identité
            </label>
            {user?.identity_image_url ? (
              <div className="mb-2 flex items-center gap-3">
                <a
                  href={user.identity_image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={user.identity_image_url}
                    alt="Pièce d'identité"
                    className="w-24 h-16 object-cover rounded border border-gray-200"
                  />
                </a>
                <span className="text-xs text-gray-500">
                  Document enregistré — choisissez un fichier pour le remplacer.
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">
                Aucune pièce d'identité enregistrée pour le moment.
              </p>
            )}
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
          </div>

          <button
            type="submit"
            disabled={updating}
            className="px-6 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary disabled:opacity-60"
          >
            {updating ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Modifier le mot de passe
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              name="current_password"
              required
              value={pwForm.current_password}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, current_password: e.target.value }))
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              name="new_password"
              required
              minLength={8}
              value={pwForm.new_password}
              onChange={(e) =>
                setPwForm((f) => ({ ...f, new_password: e.target.value }))
              }
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-bna-primary focus:ring-bna-primary"
            />
          </div>
          <button
            type="submit"
            disabled={changingPw}
            className="px-6 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary disabled:opacity-60"
          >
            {changingPw ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
