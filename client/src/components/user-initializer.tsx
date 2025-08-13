import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/hooks/use-role';

// Component to initialize user data from database on app startup
export function UserInitializer({ children }: { children: React.ReactNode }) {
  const { setCurrentUser, currentUser } = useRole();
  
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  useEffect(() => {
    // Find the administrator user (John Doe/David Gaus) and set as current user
    if (users && Array.isArray(users)) {
      const adminUser = users.find((user: any) => user.role === 'administrator');
      if (adminUser && (!currentUser || currentUser.name === 'John Doe')) {
        // Only update if we don't have current user data or if it's still the default
        setCurrentUser({
          id: adminUser.id,
          name: adminUser.name,
          initials: adminUser.initials,
          role: adminUser.role
        });
      }
    }
  }, [users, setCurrentUser, currentUser]);

  return <>{children}</>;
}