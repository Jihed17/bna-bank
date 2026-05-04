import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import NotificationBell from '../../clients/notifications/NotificationBell'
import NotificationPanel from '../../clients/notifications/NotificationPanel'
import {
  useCurrentUser,
  useIsAdmin,
  useIsAgent,
  useIsAuthenticated,
} from '../../store/hooks'
import { useLogoutMutation } from '../../store/services/identityApi'

export default function Navbar() {
  const navigate = useNavigate()
  const isAuthenticated = useIsAuthenticated()
  const isAdmin = useIsAdmin()
  const isAgent = useIsAgent()
  const user = useCurrentUser()
  const [menuOpen, setMenuOpen] = useState(false)

  const [logout] = useLogoutMutation()

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('bna_refresh')
    await logout({ refresh: refreshToken || '' })
    toast.success('Déconnexion réussie.')
    navigate('/')
  }

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

        <Link to="/" className="text-2xl font-bold text-bna-primary">
          BNA Digital
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/services" className="text-gray-600 hover:text-bna-primary text-sm">
            Services
          </Link>
          <Link to="/agencies" className="text-gray-600 hover:text-bna-primary text-sm">
            Agences
          </Link>
          <Link to="/assistant" className="text-gray-600 hover:text-bna-primary text-sm">
            Assistant
          </Link>

          {isAuthenticated ? (
            <>
              {isAgent ? (
                <Link to="/agent" className="text-gray-600 hover:text-bna-primary text-sm">
                  Mon planning
                </Link>
              ) : (
                <Link to="/dashboard" className="text-gray-600 hover:text-bna-primary text-sm">
                  Dashboard
                </Link>
              )}
              {!isAgent && !isAdmin && (
                <Link
                  to="/appointments"
                  className="text-gray-600 hover:text-bna-primary text-sm"
                >
                  Mes RDV
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="text-gray-600 hover:text-bna-primary text-sm">
                  Admin
                </Link>
              )}
              <div className="relative">
                <NotificationBell />
                <NotificationPanel />
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-gray-600 hover:text-bna-primary text-sm"
              >
                {user?.identity_image_url ? (
                  <img
                    src={user.identity_image_url}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-bna-light text-bna-primary flex items-center justify-center text-xs font-semibold">
                    {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </span>
                )}
                <span>{user?.first_name || 'Profil'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-gray-600 hover:text-bna-primary">
                Connexion
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 bg-bna-primary text-white rounded-lg hover:bg-bna-secondary"
              >
                S'inscrire
              </Link>
            </>
          )}
        </div>

        <button
          className="md:hidden text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-4 py-4 space-y-3">
          <Link to="/services" className="block text-gray-700">
            Services
          </Link>
          <Link to="/agencies" className="block text-gray-700">
            Agences
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="block text-gray-700">
                Dashboard
              </Link>
              <Link to="/appointments" className="block text-gray-700">
                Mes RDV
              </Link>
              <Link to="/notifications" className="block text-gray-700">
                Notifications
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 text-gray-700"
              >
                {user?.identity_image_url ? (
                  <img
                    src={user.identity_image_url}
                    alt=""
                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-bna-light text-bna-primary flex items-center justify-center text-xs font-semibold">
                    {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                  </span>
                )}
                <span>Profil</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="block text-gray-700">
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="block text-red-500">
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-gray-700">
                Connexion
              </Link>
              <Link to="/register" className="block text-gray-700">
                S'inscrire
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
