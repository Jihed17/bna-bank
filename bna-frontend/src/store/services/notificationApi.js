import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '../api/baseApi'

/**
 * RTK Query service for the Notifications domain.
 *
 * Polling: pages activate polling by passing { pollingInterval: ms }
 * to useGetNotificationsQuery / useGetUnreadCountQuery — the
 * NotificationListenerClient uses this in Phase 8.
 */
export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification'],

  endpoints: (builder) => ({

    getNotifications: builder.query({
      query: (params = {}) => ({ url: '/notifications/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Notification'],
    }),

    getUnreadCount: builder.query({
      query: () => '/notifications/unread-count/',
      transformResponse: (response) => response.data.unread_count,
      providesTags: ['Notification'],
    }),

    markRead: builder.mutation({
      query: (notificationId) => ({
        url: `/notifications/${notificationId}/read/`,
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkReadMutation,
} = notificationApi
