import { create } from 'zustand';

type Role = 'executive' | 'leader';

interface RoleStore {
  currentRole: Role;
  currentUser: {
    id: string;
    name: string;
    initials: string;
    role: Role;
  } | null;
  setCurrentUser: (user: {
    id: string;
    name: string;
    initials: string;
    role: Role;
  }) => void;
  // Permission helpers
  canEditStrategies: () => boolean;
  canEditTactics: () => boolean;
  canCreateStrategies: () => boolean;
  canCreateTactics: () => boolean;
  canWriteReports: () => boolean;
  canManageUsers: () => boolean;
}

export const useRole = create<RoleStore>((set, get) => ({
  currentRole: 'executive',
  currentUser: {
    id: '1',
    name: 'John Doe',
    initials: 'JD',
    role: 'executive'
  },
  setCurrentUser: (user) => set({ 
    currentUser: user, 
    currentRole: user.role 
  }),

  // Permission methods
  canEditStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'executive';
  },
  
  canEditTactics: () => {
    // Both executives and leaders can edit tactics
    return true;
  },
  
  canCreateStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'executive';
  },
  
  canCreateTactics: () => {
    // Both roles can create tactics
    return true;
  },
  
  canWriteReports: () => {
    // Both executives and leaders can write reports
    return true;
  },
  
  canManageUsers: () => {
    const { currentUser } = get();
    return currentUser?.role === 'executive';
  },
}));
