import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '../api/baseApi'
import {
  loginSuccess,
  logout as logoutAction,
  profileUpdated,
} from '../slices/authSlice'

/**
 * RTK Query service for the Identity domain. One endpoint per
 * IdentityManager use case on the backend.
 *
 * Backend RegisterView returns the user only — no tokens. The Register
 * page therefore chains a login() call after a successful register to
 * establish the session.
 */
export const identityApi = createApi({
  reducerPath: 'identityApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],

  endpoints: (builder) => ({

    register: builder.mutation({
      query: (body) => ({
        url: '/identity/register/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    login: builder.mutation({
      query: (body) => ({
        url: '/identity/login/',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(loginSuccess(data.data))
        } catch (_) {
          // surfaced to component via result.error
        }
      },
    }),

    logout: builder.mutation({
      query: (body) => ({
        url: '/identity/logout/',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        // Optimistically clear auth — even if the server call fails the
        // client should still be logged out locally.
        dispatch(logoutAction())
        try {
          await queryFulfilled
        } catch (_) {
          // already logged out client-side
        }
      },
    }),

    getProfile: builder.query({
      query: () => '/identity/profile/',
      transformResponse: (response) => response.data,
      providesTags: ['User'],
    }),

    updateProfile: builder.mutation({
      query: (body) => ({
        url: '/identity/profile/',
        method: 'PUT',
        body,
      }),
      transformResponse: (response) => response.data,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(profileUpdated(data))
        } catch (_) { /* component handles */ }
      },
      invalidatesTags: ['User'],
    }),

    changePassword: builder.mutation({
      query: (body) => ({
        url: '/identity/password/change/',
        method: 'PUT',
        body,
      }),
    }),

    requestPasswordReset: builder.mutation({
      query: (body) => ({
        url: '/identity/password/reset/',
        method: 'POST',
        body,
      }),
    }),

    confirmPasswordReset: builder.mutation({
      query: (body) => ({
        url: '/identity/password/reset/confirm/',
        method: 'POST',
        body,
      }),
    }),

    verifyEmail: builder.mutation({
      query: (body) => ({
        url: '/identity/verify-email/',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
    }),

    // ── Admin endpoints ────────────────────────────────────────────────────

    getAgents: builder.query({
      query: () => '/identity/users/?role=agent',
      transformResponse: (response) => response.data,
      providesTags: ['User'],
    }),

    getUsers: builder.query({
      query: (params = {}) => ({ url: '/identity/users/', params }),
      transformResponse: (response) => response.data,
      providesTags: ['User'],
    }),

    getPendingGuests: builder.query({
      query: () => '/identity/pending-guests/',
      transformResponse: (response) => response.data,
      providesTags: ['User'],
    }),

    approveGuest: builder.mutation({
      query: (userId) => ({
        url: `/identity/users/${userId}/approve/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['User'],
    }),

    rejectGuest: builder.mutation({
      query: ({ userId, reason = '' }) => ({
        url: `/identity/users/${userId}/reject/`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['User'],
    }),

    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/identity/users/${userId}/delete/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    getUserAdmin: builder.query({
      query: (userId) => `/identity/users/${userId}/`,
      transformResponse: (response) => response.data,
      providesTags: (_result, _err, userId) => [{ type: 'User', id: userId }],
    }),

    assignRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/identity/users/${userId}/role/`,
        method: 'POST',
        body: { role },
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _err, { userId }) => [
        { type: 'User', id: userId },
      ],
    }),

    suspendAccount: builder.mutation({
      query: (userId) => ({
        url: `/identity/users/${userId}/suspend/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: (_result, _err, userId) => [
        { type: 'User', id: userId },
      ],
    }),

    archiveAccount: builder.mutation({
      query: (userId) => ({
        url: `/identity/users/${userId}/archive/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['User'],
    }),

    reactivateAccount: builder.mutation({
      query: (userId) => ({
        url: `/identity/users/${userId}/reactivate/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
  useVerifyEmailMutation,
  useGetAgentsQuery,
  useGetUsersQuery,
  useGetPendingGuestsQuery,
  useApproveGuestMutation,
  useRejectGuestMutation,
  useDeleteUserMutation,
  useGetUserAdminQuery,
  useAssignRoleMutation,
  useSuspendAccountMutation,
  useArchiveAccountMutation,
  useReactivateAccountMutation,
} = identityApi
