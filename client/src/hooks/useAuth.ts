import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    enabled: !!token,
  });

  const login = async (email: string, password: string) => {
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
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const res = await fetch('/api/auth/register', {
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
  };

  const logout = () => {
    localStorage.removeItem('jwt');
    queryClient.clear();
    window.location.href = '/';
  };

  return {
    user: token ? user : null,
    isLoading: token ? isLoading : false,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    error,
  };
}
