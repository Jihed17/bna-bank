import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import {
  useCreateServiceMutation,
  useUpdateServiceMutation,
} from '../../store/services/serviceApi'

const CATEGORIES = [
  { value: 'retail', label: 'Particuliers' },
  { value: 'corporate', label: 'Entreprises' },
  { value: 'investment', label: 'Investissement' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'digital', label: 'Digital' },
]

const TYPES = [
  { value: 'account', label: 'Gestion de compte' },
  { value: 'credit', label: 'Crédit et financement' },
  { value: 'card', label: 'Carte bancaire' },
  { value: 'transfer', label: 'Virement et paiement' },
  { value: 'advisory', label: 'Conseil et patrimoine' },
  { value: 'other', label: 'Autre' },
]

export default function ServiceFormModal({ service = null, onClose }) {
  const isEdit = Boolean(service)

  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    category: service?.category || 'retail',
    type: service?.type || 'account',
    duration_minutes: service?.duration_minutes || 30,
    icon: service?.icon || '',
    order: service?.order || 0,
  })

  const [create, { isLoading: creating }] = useCreateServiceMutation()
  const [update, { isLoading: updating }] = useUpdateServiceMutation()
  const isLoading = creating || updating

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = isEdit
      ? await update({ serviceId: service.id, ...form })
      : await create(form)

    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success(isEdit ? 'Service mis à jour.' : 'Service créé.')
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
            {isEdit ? 'Modifier le service' : 'Nouveau service'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du service *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catégorie *
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                >
                  {CATEGORIES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                >
                  {TYPES.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (minutes)
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={form.duration_minutes}
                  onChange={handleChange}
                  min={5}
                  max={480}
                  className="block w-full rounded-lg border-gray-200 text-sm focus:border-bna-primary focus:ring-bna-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icône (emoji)
                </label>
                <input
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  placeholder="🏦"
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
