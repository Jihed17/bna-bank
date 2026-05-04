import React, { useEffect, useRef, useState } from 'react'
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
  const [imagePreview, setImagePreview] = useState(null)
  const fileInputRef = useRef(null)
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
  })

  // Local preview while a new file is picked but not yet uploaded.
  useEffect(() => {
    if (!identityImage) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(identityImage)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [identityImage])

  const displayedAvatar = imagePreview || user?.identity_image_url || null

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
        {/* Avatar header */}
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-32 h-32 rounded-full border-2 border-gray-200 bg-gray-50 hover:border-bna-primary overflow-hidden transition-colors group"
            aria-label="Modifier la photo de profil"
          >
            {displayedAvatar ? (
              <img
                src={displayedAvatar}
                alt="Photo de profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <span className="text-3xl">👤</span>
                <span className="text-xs mt-1">Photo</span>
              </div>
            )}
            <span className="absolute inset-x-0 bottom-0 py-1 text-[10px] font-medium uppercase tracking-wide text-white bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
              Modifier
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setIdentityImage(e.target.files?.[0] || null)}
            className="hidden"
          />
          <p className="mt-3 font-semibold text-gray-900">
            {user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email}
          </p>
          <p className="text-xs text-gray-500">{user?.role_display}</p>
          {imagePreview && (
            <p className="mt-2 text-xs text-bna-primary">
              Nouvelle photo sélectionnée — cliquez sur "Enregistrer" pour confirmer.
            </p>
          )}
        </div>

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
