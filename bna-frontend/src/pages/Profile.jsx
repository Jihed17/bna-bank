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
  })
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
      })
    }
  }, [user])

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    const result = await updateProfile(profileForm)
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Profil mis à jour !')
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
