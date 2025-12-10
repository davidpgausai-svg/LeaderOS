import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { User } from "@shared/schema";

type UserWithOrgName = User & { organizationName?: string | null };

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<UserWithOrgName | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: 'include',
      });
      if (res.status === 401 || res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    retry: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    return data;
  }, [queryClient]);

  const register = useCallback(async (registrationToken: string, email: string, password: string, firstName?: string, lastName?: string) => {
    const res = await fetch(`/api/auth/register/${registrationToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    return data;
  }, [queryClient]);

  const validateRegistrationToken = useCallback(async (tokenToValidate: string): Promise<boolean> => {
    const res = await fetch(`/api/auth/validate-registration-token/${tokenToValidate}`, {
      credentials: 'include',
    });
    const data = await res.json();
    return data.valid === true;
  }, []);

  const logout = useCallback(async () => {
    const csrfToken = document.cookie.match(/csrf_token=([^;]+)/)?.[1];
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : {},
    });
    queryClient.clear();
    window.location.href = '/';
  }, [queryClient]);

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    validateRegistrationToken,
    logout,
    error,
  };
}
