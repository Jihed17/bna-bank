import { useDispatch, useSelector } from 'react-redux'

import {
  selectAuthIsLoading,
  selectCurrentUser,
  selectIsAdmin,
  selectIsAgent,
  selectIsAuthenticated,
  selectIsClient,
  selectIsGuest,
  selectUserRole,
} from './slices/authSlice'
import {
  selectPanelOpen,
  selectToastQueue,
} from './slices/notificationsSlice'

// Use everywhere instead of raw useDispatch
export const useAppDispatch = () => useDispatch()

// ── Auth hooks ─────────────────────────────────────────────────────────────

export const useCurrentUser = () => useSelector(selectCurrentUser)
export const useIsAuthenticated = () => useSelector(selectIsAuthenticated)
export const useAuthIsLoading = () => useSelector(selectAuthIsLoading)
export const useUserRole = () => useSelector(selectUserRole)
export const useIsGuest = () => useSelector(selectIsGuest)
export const useIsClient = () => useSelector(selectIsClient)
export const useIsAgent = () => useSelector(selectIsAgent)
export const useIsAdmin = () => useSelector(selectIsAdmin)

// ── Notification UI hooks ──────────────────────────────────────────────────

export const useNotificationPanel = () => useSelector(selectPanelOpen)
export const useToastQueue = () => useSelector(selectToastQueue)
