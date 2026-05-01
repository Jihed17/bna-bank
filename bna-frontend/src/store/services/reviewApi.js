import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQueryWithReauth } from '../api/baseApi'

/**
 * RTK Query service for the Reviews domain.
 * One endpoint per ReviewManager method on the backend.
 */
export const reviewApi = createApi({
  reducerPath: 'reviewApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Review'],

  endpoints: (builder) => ({

    getReviewsForService: builder.query({
      query: (serviceId) => ({
        url: '/reviews/',
        params: { service_id: serviceId },
      }),
      transformResponse: (response) => response.data,
      providesTags: (_r, _e, serviceId) => [
        { type: 'Review', id: `service-${serviceId}` },
        'Review',
      ],
    }),

    getMyReviews: builder.query({
      query: () => '/reviews/me/',
      transformResponse: (response) => response.data,
      providesTags: ['Review'],
    }),

    createReview: builder.mutation({
      query: (body) => ({
        url: '/reviews/create/',
        method: 'POST',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Review'],
    }),

    updateReview: builder.mutation({
      query: ({ reviewId, ...body }) => ({
        url: `/reviews/${reviewId}/`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Review'],
    }),

    deleteReview: builder.mutation({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Review'],
    }),

    hideReview: builder.mutation({
      query: (reviewId) => ({
        url: `/reviews/${reviewId}/hide/`,
        method: 'POST',
      }),
      transformResponse: (response) => response.data,
      invalidatesTags: ['Review'],
    }),
  }),
})

export const {
  useGetReviewsForServiceQuery,
  useGetMyReviewsQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
  useDeleteReviewMutation,
  useHideReviewMutation,
} = reviewApi
