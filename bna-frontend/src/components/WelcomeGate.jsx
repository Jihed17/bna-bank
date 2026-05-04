import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useIsAuthenticated } from '../store/hooks'

const SKIP_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

/**
 * Landing modal shown to anonymous visitors. Three doors:
 *   - Nouveau visiteur → /register
 *   - Client           → /login
 *   - Agent            → /login
 *
 * Re-shows on every page (re)load and every navigation while the
 * visitor is not authenticated, except on auth pages where it would
 * get in the way. The "Continuer" button only dismisses the modal
 * for the current page — navigating brings it back.
 */
export default function WelcomeGate() {
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      setOpen(false)
      return
    }
    setOpen(!SKIP_PATHS.includes(pathname))
  }, [isAuthenticated, pathname])

  const dismiss = () => setOpen(false)

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
