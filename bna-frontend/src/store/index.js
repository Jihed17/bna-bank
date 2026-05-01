import { configureStore } from '@reduxjs/toolkit'

import { appointmentApi } from './services/appointmentApi'
import { identityApi } from './services/identityApi'
import { notificationApi } from './services/notificationApi'
import { reviewApi } from './services/reviewApi'
import { serviceApi } from './services/serviceApi'
import { authSlice } from './slices/authSlice'
import { notificationsSlice } from './slices/notificationsSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    notifications: notificationsSlice.reducer,

    [identityApi.reducerPath]: identityApi.reducer,
    [serviceApi.reducerPath]: serviceApi.reducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
    [reviewApi.reducerPath]: reviewApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      identityApi.middleware,
      serviceApi.middleware,
      appointmentApi.middleware,
      notificationApi.middleware,
      reviewApi.middleware,
    ),
})

export default store
