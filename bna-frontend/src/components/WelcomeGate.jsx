import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useIsAuthenticated } from '../store/hooks'

const STORAGE_KEY = 'bna_welcomed'

/**
 * One-shot landing modal shown to anonymous visitors on first arrival.
 * Three doors:
 *   - Nouveau visiteur → /register
 *   - Client           → /login
 *   - Agent            → /login
 *
 * Dismissal is persisted in localStorage so subsequent visits are
 * silent. Skipped entirely for authenticated users and for routes
 * where it would get in the way (auth pages and the welcome target
 * itself).
 */
export default function WelcomeGate() {
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [open, setOpen] = useState(false)

  // Check the storage flag *only* on first mount + when auth changes,
  // so a logout doesn't immediately re-pop the modal.
  useEffect(() => {
    if (isAuthenticated) {
      setOpen(false)
      return
    }
    const skip = ['/login', '/register', '/forgot-password'].includes(pathname)
    if (skip) {
      setOpen(false)
      return
    }
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY)
      setOpen(!seen)
    } catch {
      setOpen(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* private mode — best-effort only */
    }
    setOpen(false)
  }

  const choose = (target) => {
    dismiss()
    navigate(target)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Bienvenue sur BNA Digital
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Comment souhaitez-vous accéder à la plateforme ?
        </p>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => choose('/register')}
            className="text-left rounded-xl border border-gray-200 p-4 hover:border-bna-primary hover:bg-bna-light transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌐</span>
              <div>
                <p className="font-semibold text-gray-900">Nouveau visiteur</p>
                <p className="text-sm text-gray-500">
                  Je veux créer un compte BNA pour prendre rendez-vous.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => choose('/login')}
            className="text-left rounded-xl border border-gray-200 p-4 hover:border-bna-primary hover:bg-bna-light transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">👤</span>
              <div>
                <p className="font-semibold text-gray-900">Je suis client</p>
                <p className="text-sm text-gray-500">
                  J'ai déjà un compte BNA Digital, je me connecte.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => choose('/login')}
            className="text-left rounded-xl border border-gray-200 p-4 hover:border-bna-primary hover:bg-bna-light transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧑‍💼</span>
              <div>
                <p className="font-semibold text-gray-900">Je suis agent BNA</p>
                <p className="text-sm text-gray-500">
                  J'accède à mon planning et à ma file d'attente.
                </p>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={dismiss}
          className="mt-6 w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Continuer en visiteur sans choisir
        </button>
      </div>
    </div>
  )
}
