import { create } from 'zustand';

type Role = 'administrator' | 'executive' | 'leader';

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
  canEditTactic: (tactic: any) => boolean;
}

export const useRole = create<RoleStore>((set, get) => ({
  currentRole: 'administrator',
  currentUser: {
    id: '1',
    name: 'John Doe',
    initials: 'JD',
    role: 'administrator'
  },
  setCurrentUser: (user) => set({ 
    currentUser: user, 
    currentRole: user.role 
  }),

  // Permission methods
  canEditStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator' || currentUser?.role === 'executive';
  },
  
  canEditTactics: () => {
    // Both executives and leaders can edit tactics
    return true;
  },
  
  canCreateStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator' || currentUser?.role === 'executive';
  },
  
  canCreateTactics: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator' || currentUser?.role === 'executive';
  },
  
  canWriteReports: () => {
    // All roles can write reports
    return true;
  },
  
  canManageUsers: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator';
  },
  
  canEditTactic: (tactic) => {
    const { currentUser } = get();
    if (currentUser?.role === 'administrator' || currentUser?.role === 'executive') {
      return true;
    }
    return currentUser?.id === tactic.assignedTo;
  },
}));
