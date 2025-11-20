import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/use-role';
import type { User } from '@shared/schema';

// Component to initialize user data from authenticated session
export function UserInitializer({ children }: { children: React.ReactNode }) {
  const { setCurrentUser, currentUser, loadAssignedStrategyIds } = useRole();
  
  const { data: authUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  useEffect(() => {
    // Set the authenticated user as the current user
    if (authUser && (!currentUser || currentUser.id !== authUser.id)) {
      setCurrentUser(authUser);
      // Load assigned strategy IDs for the user
      loadAssignedStrategyIds();
    }
  }, [authUser, setCurrentUser, currentUser, loadAssignedStrategyIds]);

  return <>{children}</>;
}