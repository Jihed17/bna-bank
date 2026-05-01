import React, { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'

import { extractError } from '../../store/api/baseApi'
import { useCancelAppointmentMutation } from '../../store/services/appointmentApi'

export default function CancelModal({ appointment, onClose }) {
  const [reason, setReason] = useState('')
  const [cancel, { isLoading }] = useCancelAppointmentMutation()

  const handleConfirm = async () => {
    const result = await cancel({
      appointmentId: appointment.id,
      reason: reason || 'Annulé par le client.',
    })
    if (result.error) {
      toast.error(extractError(result.error))
    } else {
      toast.success('Rendez-vous annulé.')
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
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Annuler ce rendez-vous ?
          </h2>
          <p className="text-sm text-gray-500 mb-1">
            <span className="font-medium">
              {appointment.service_name || appointment.service?.name}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {new Date(appointment.scheduled_at).toLocaleString('fr-TN', {
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motif d'annulation (optionnel)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Changement de plans, indisponibilité..."
              className="block w-full rounded-lg border-gray-200 text-sm focus:border-red-400 focus:ring-red-400"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium"
            >
              Garder le RDV
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 py-2 px-4 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-sm font-medium"
            >
              {isLoading ? 'Annulation...' : "Confirmer l'annulation"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
