import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import {
  useCreateAgencyMutation,
  useUpdateAgencyMutation,
} from '../../store/services/serviceApi'

export default function AgencyFormModal({ agency = null, onClose }) {
  const isEdit = Boolean(agency)

  const [form, setForm] = useState({
    name: agency?.name || '',
    address: agency?.address || '',
    city: agency?.city || '',
    postal_code: agency?.postal_code || '',
    phone: agency?.phone || '',
    email: agency?.email || '',
    capacity: agency?.capacity || 1,
  })

  const [create, { isLoading: creating }] = useCreateAgencyMutation()
  const [update, { isLoading: updating }] = useUpdateAgencyMutation()
  const isLoading = creating || updating

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = isEdit
      ? await update({ agencyId: agency.id, ...form })
      : await create(form)

    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success(isEdit ? 'Agence mise à jour.' : 'Agence créée.')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {isEdit ? "Modifier l'agence" : 'Nouvelle agence'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: "Nom de l'agence *", required: true },
              { name: 'address', label: 'Adresse *', required: true },
              { name: 'city', label: 'Ville *', required: true },
            ].map(({ name, label, required }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {label}
                </label>
                <input
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required={required}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
            ))}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  name="postal_code"
                  value={form.postal_code}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacité (RDV simultanés)
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={form.capacity}
                  onChange={handleChange}
                  min={1}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 bg-bna-primary text-white rounded-lg text-sm hover:bg-bna-secondary disabled:opacity-60"
              >
                {isLoading ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
