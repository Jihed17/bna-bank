import { createSlice } from '@reduxjs/toolkit'

/**
 * Auth slice — owns access/refresh tokens and the user profile.
 *
 * Hydration: the initial state reads from localStorage at module-load time
 * so a returning authenticated user is rendered without a flash of the
 * login page. main.jsx dispatches hydrationComplete() to flip isLoading
 * to false after the store is built.
 *
 * Persistence: every reducer that mutates auth fields calls _persist(),
 * keeping localStorage in sync with Redux state.
 */

const _persist = (state) => {
  try {
    if (state.access) {
      localStorage.setItem('bna_access', state.access)
      localStorage.setItem('bna_refresh', state.refresh || '')
      localStorage.setItem('bna_user', JSON.stringify(state.user || {}))
    } else {
      localStorage.removeItem('bna_access')
      localStorage.removeItem('bna_refresh')
      localStorage.removeItem('bna_user')
    }
  } catch (_) {
    // localStorage may be unavailable (SSR, private browsing).
  }
}

const _hydrate = () => {
  try {
    const access = localStorage.getItem('bna_access')
    const refresh = localStorage.getItem('bna_refresh')
    const user = JSON.parse(localStorage.getItem('bna_user') || 'null')
    if (access) {
      return { access, refresh, user, isAuthenticated: true, isLoading: false }
    }
  } catch (_) {
    // ignore
  }
  return { access: null, refresh: null, user: null, isAuthenticated: false, isLoading: false }
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ..._hydrate(),
    isLoading: true,
  },

  reducers: {
    loginSuccess: (state, action) => {
      state.access = action.payload.access
      state.refresh = action.payload.refresh
      state.user = action.payload.user
      state.isAuthenticated = true
      state.isLoading = false
      _persist(state)
    },

    tokenRefreshed: (state, action) => {
      state.access = action.payload.access
      state.refresh = action.payload.refresh ?? state.refresh
      _persist(state)
    },

    profileUpdated: (state, action) => {
      state.user = { ...state.user, ...action.payload }
      _persist(state)
    },

    logout: (state) => {
      state.access = null
      state.refresh = null
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      _persist(state)
    },

    hydrationComplete: (state) => {
      state.isLoading = false
    },
  },
})

export const {
  loginSuccess,
  tokenRefreshed,
  profileUpdated,
  logout,
  hydrationComplete,
} = authSlice.actions

// ── Selectors ──────────────────────────────────────────────────────────────

export const selectCurrentUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthIsLoading = (state) => state.auth.isLoading
export const selectAccessToken = (state) => state.auth.access
export const selectUserRole = (state) => state.auth.user?.role ?? null

export const selectIsGuest = (state) => !state.auth.isAuthenticated
export const selectIsClient = (state) => state.auth.user?.role === 'client'
export const selectIsAgent = (state) => state.auth.user?.role === 'agent'
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin'
