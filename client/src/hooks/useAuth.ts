import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const storedToken = localStorage.getItem('jwt');
      if (!storedToken) return null;
      
      const res = await fetch("/api/auth/user", {
        headers: { 'Authorization': `Bearer ${storedToken}` },
      });
      if (res.status === 401 || res.status === 404) {
        localStorage.removeItem('jwt');
        return null;
      }
      if (!res.ok) {
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    retry: false,
    enabled: !!token,
  });

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('jwt', data.token);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    return data;
  }, [queryClient]);

  const register = useCallback(async (registrationToken: string, email: string, password: string, firstName?: string, lastName?: string) => {
    const res = await fetch(`/api/auth/register/${registrationToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('jwt', data.token);
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    return data;
  }, [queryClient]);

  const validateRegistrationToken = useCallback(async (tokenToValidate: string): Promise<boolean> => {
    const res = await fetch(`/api/auth/validate-registration-token/${tokenToValidate}`);
    const data = await res.json();
    return data.valid === true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('jwt');
    queryClient.clear();
    window.location.href = '/';
  }, [queryClient]);

  return {
    user: token ? user : null,
    isLoading: token ? isLoading : false,
    isAuthenticated: !!token && !!user,
    login,
    register,
    validateRegistrationToken,
    logout,
    error,
  };
}
