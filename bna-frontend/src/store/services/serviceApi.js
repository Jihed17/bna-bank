import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '../api/baseApi'

/**
 * RTK Query service for the Services domain. One endpoint per
 * ServiceManager method on the backend.
 *
 * Public reads use AllowAny on the backend. Admin writes return 403
 * for non-admin tokens — surfaced as result.error in components.
 */
export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Service', 'Agency', 'AgentAssignment'],

  endpoints: (builder) => ({

    // ── Public reads ───────────────────────────────────────────────────────

    getServices: builder.query({
      query: (params = {}) => ({ url: '/services/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Service'],
    }),

    getService: builder.query({
      query: (serviceId) => `/services/${serviceId}/`,
      transformResponse: (response) => response.data,
      providesTags: (_r, _e, id) => [{ type: 'Service', id }],
    }),

    getAgencies: builder.query({
      query: (params = {}) => ({ url: '/services/agencies/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['Agency'],
    }),

    getAgencyCities: builder.query({
      query: () => '/services/agencies/cities/',
      transformResponse: (response) => response.data,
      providesTags: ['Agency'],
    }),

    getAgency: builder.query({
      query: (agencyId) => `/services/agencies/${agencyId}/`,
      transformResponse: (response) => response.data,
      providesTags: (_r, _e, id) => [{ type: 'Agency', id }],
    }),

    // ── Admin service writes ───────────────────────────────────────────────

    createService: builder.mutation({
      query: (body) => ({ url: '/services/create/', method: 'POST', body }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Service'],
    }),

    updateService: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/services/${serviceId}/update/`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, { serviceId }) => [
        { type: 'Service', id: serviceId },
        'Service',
      ],
    }),

    suspendService: builder.mutation({
      query: (serviceId) => ({
        url: `/services/${serviceId}/suspend/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, serviceId) => [
        { type: 'Service', id: serviceId },
        'Service',
      ],
    }),

    reactivateService: builder.mutation({
      query: (serviceId) => ({
        url: `/services/${serviceId}/reactivate/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, serviceId) => [
        { type: 'Service', id: serviceId },
        'Service',
      ],
    }),

    assignAgent: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/services/${serviceId}/agents/`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['AgentAssignment'],
    }),

    removeAgent: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/services/${serviceId}/agents/remove/`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AgentAssignment'],
    }),

    configureServiceHours: builder.mutation({
      query: ({ serviceId, ...body }) => ({
        url: `/services/${serviceId}/hours/`,
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Agency'],
    }),

    // ── Admin agency writes ────────────────────────────────────────────────

    createAgency: builder.mutation({
      query: (body) => ({
        url: '/services/agencies/create/',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Agency'],
    }),

    updateAgency: builder.mutation({
      query: ({ agencyId, ...body }) => ({
        url: `/services/agencies/${agencyId}/update/`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, { agencyId }) => [
        { type: 'Agency', id: agencyId },
        'Agency',
      ],
    }),

    closeAgency: builder.mutation({
      query: (agencyId) => ({
        url: `/services/agencies/${agencyId}/close/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_r, _e, agencyId) => [
        { type: 'Agency', id: agencyId },
        'Agency',
      ],
    }),
  }),
})

export const {
  useGetServicesQuery,
  useGetServiceQuery,
  useGetAgenciesQuery,
  useGetAgencyCitiesQuery,
  useGetAgencyQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useSuspendServiceMutation,
  useReactivateServiceMutation,
  useAssignAgentMutation,
  useRemoveAgentMutation,
  useConfigureServiceHoursMutation,
  useCreateAgencyMutation,
  useUpdateAgencyMutation,
  useCloseAgencyMutation,
} = serviceApi
