import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'

import { logout, tokenRefreshed } from '../slices/authSlice'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Base query with automatic JWT injection and one-shot token refresh on 401.
 *
 * On every request:
 *   1. Reads the access token from Redux state.
 *   2. Injects it as Authorization: Bearer {token}.
 *
 * On 401 response:
 *   1. Attempts a single token refresh using the refresh token from state.
 *   2. If refresh succeeds: dispatches tokenRefreshed and retries the request.
 *   3. If refresh fails: dispatches logout and clears state.
 *
 * This is the VBD Security utility on the frontend — every API service
 * imports baseQueryWithReauth from here and never calls fetchBaseQuery
 * directly.
 */
const baseQueryWithAuth = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.access
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQueryWithAuth(args, api, extraOptions)

  if (result.error?.status === 401) {
    const refreshToken = api.getState().auth.refresh

    if (refreshToken) {
      const refreshResult = await baseQueryWithAuth(
        {
          url: '/auth/token/refresh/',
          method: 'POST',
          body: { refresh: refreshToken },
        },
        api,
        extraOptions,
      )

      if (refreshResult.data) {
        api.dispatch(tokenRefreshed({
          access: refreshResult.data.access,
          refresh: refreshResult.data.refresh ?? refreshToken,
        }))
        result = await baseQueryWithAuth(args, api, extraOptions)
      } else {
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

/**
 * Error normaliser.
 * The backend always returns { error, code } on failure
 * (see core/exceptions.bna_exception_handler).
 * RTK Query wraps this in result.error.data.
 *
 * Components: extractError(result.error) → human string for toast.
 */
export const extractError = (error) => {
  if (!error) return null
  if (error.data?.error) return error.data.error
  if (error.error) return error.error
  return "Une erreur inattendue s'est produite."
}
