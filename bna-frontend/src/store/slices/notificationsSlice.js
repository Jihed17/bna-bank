import { createSlice } from '@reduxjs/toolkit'

/**
 * UI state for the notification panel and toast queue.
 * Server-side notification data lives in notificationApi cache,
 * NOT in this slice.
 */
export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    panelOpen: false,
    lastSeenAt: null,
    toastQueue: [],
  },

  reducers: {
    openPanel: (state) => { state.panelOpen = true },
    closePanel: (state) => { state.panelOpen = false },
    togglePanel: (state) => { state.panelOpen = !state.panelOpen },

    markLastSeen: (state) => {
      state.lastSeenAt = new Date().toISOString()
    },

    pushToast: (state, action) => {
      state.toastQueue.push({
        id: Date.now(),
        message: action.payload.message,
        type: action.payload.type || 'info',
      })
    },

    dismissToast: (state, action) => {
      state.toastQueue = state.toastQueue.filter(
        (t) => t.id !== action.payload,
      )
    },
  },
})

export const {
  openPanel,
  closePanel,
  togglePanel,
  markLastSeen,
  pushToast,
  dismissToast,
} = notificationsSlice.actions

export const selectPanelOpen = (state) => state.notifications.panelOpen
export const selectLastSeenAt = (state) => state.notifications.lastSeenAt
export const selectToastQueue = (state) => state.notifications.toastQueue
