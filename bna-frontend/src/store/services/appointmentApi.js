import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '../api/baseApi'

/**
 * RTK Query service for the Appointments domain.
 * One endpoint per AppointmentManager method on the backend.
 */
export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Appointment', 'Schedule'],

  endpoints: (builder) => ({

    requestAppointment: builder.mutation({
      query: (body) => ({
        url: '/appointments/',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Appointment'],
    }),

    getAppointments: builder.query({
      query: (params = {}) => ({ url: '/appointments/list/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Appointment'],
    }),

    getAppointment: builder.query({
      query: (appointmentId) => `/appointments/${appointmentId}/`,
      transformResponse: (response) => response.data,
      providesTags: (_r, _e, id) => [{ type: 'Appointment', id }],
    }),

    cancelAppointment: builder.mutation({
      query: ({ appointmentId, reason = '' }) => ({
        url: `/appointments/${appointmentId}/cancel/`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
      ],
    }),

    updateAppointment: builder.mutation({
      query: ({ appointmentId, ...body }) => ({
        url: `/appointments/${appointmentId}/update/`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
      ],
    }),

    acceptAppointment: builder.mutation({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}/accept/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, appointmentId) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
        'Schedule',
      ],
    }),

    rejectAppointment: builder.mutation({
      query: ({ appointmentId, reason = '' }) => ({
        url: `/appointments/${appointmentId}/reject/`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, { appointmentId }) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
        'Schedule',
      ],
    }),

    confirmAppointment: builder.mutation({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}/confirm/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, appointmentId) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
        'Schedule',
      ],
    }),

    completeAppointment: builder.mutation({
      query: (appointmentId) => ({
        url: `/appointments/${appointmentId}/complete/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, appointmentId) => [
        { type: 'Appointment', id: appointmentId },
        'Appointment',
        'Schedule',
      ],
    }),

    getAvailableSlots: builder.query({
      query: (params) => ({ url: '/appointments/slots/', params }),
      transformResponse: (response) => response.data,
    }),

    getAgentSchedule: builder.query({
      query: (params = {}) => ({ url: '/appointments/schedule/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Schedule'],
    }),

    getPendingQueue: builder.query({
      query: (params) => ({ url: '/appointments/pending/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Appointment'],
    }),
  }),
})

export const {
  useRequestAppointmentMutation,
  useGetAppointmentsQuery,
  useGetAppointmentQuery,
  useCancelAppointmentMutation,
  useUpdateAppointmentMutation,
  useAcceptAppointmentMutation,
  useRejectAppointmentMutation,
  useConfirmAppointmentMutation,
  useCompleteAppointmentMutation,
  useGetAvailableSlotsQuery,
  useGetAgentScheduleQuery,
  useGetPendingQueueQuery,
} = appointmentApi
