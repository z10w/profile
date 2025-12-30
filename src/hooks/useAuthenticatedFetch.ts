'use client';

import { useAuth } from '@/contexts/AuthContext';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export function useAuthenticatedFetch() {
  const { accessToken, refreshTokens, logout } = useAuth();

  const fetchWithAuth = async (
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: HeadersInit = {
      ...fetchOptions.headers,
    };

    // Add authorization header if not skipping auth
    if (!skipAuth && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // If unauthorized and not skipping auth, try to refresh token
    if (response.status === 401 && !skipAuth) {
      await refreshTokens();

      // Retry the request with new token
      const newAccessToken = localStorage.getItem('accessToken');
      if (newAccessToken) {
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });
      }
    }

    // If still unauthorized after refresh, logout
    if (response.status === 401 && !skipAuth) {
      logout();
    }

    return response;
  };

  return { fetchWithAuth };
}
