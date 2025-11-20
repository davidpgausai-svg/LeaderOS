import { create } from 'zustand';
import type { User } from '@shared/schema';

type Role = 'administrator' | 'co_lead' | 'view';

interface RoleStore {
  currentRole: Role;
  currentUser: User | null;
  assignedStrategyIds: string[];
  setCurrentUser: (user: User) => void;
  setAssignedStrategyIds: (strategyIds: string[]) => void;
  loadAssignedStrategyIds: () => Promise<void>;
  // Permission helpers
  canEditStrategies: () => boolean;
  canEditTactics: () => boolean;
  canCreateStrategies: () => boolean;
  canCreateTactics: () => boolean;
  canWriteReports: () => boolean;
  canManageUsers: () => boolean;
  canEditTactic: (tactic: any) => boolean;
  canEditAllStrategies: () => boolean;
  isStrategyAssigned: (strategyId: string) => boolean;
}

export const useRole = create<RoleStore>((set, get) => ({
  currentRole: 'administrator',
  currentUser: null,
  assignedStrategyIds: [],
  
  setCurrentUser: (user) => set({ 
    currentUser: user, 
    currentRole: (user.role || 'co_lead') as Role
  }),

  setAssignedStrategyIds: (strategyIds) => set({ assignedStrategyIds: strategyIds }),

  loadAssignedStrategyIds: async () => {
    const { currentUser } = get();
    if (!currentUser) return;

    // Administrators see all strategies, no need to fetch assignments
    if (currentUser.role === 'administrator') {
      set({ assignedStrategyIds: [] });
      return;
    }

    try {
      const response = await fetch(`/api/users/${currentUser.id}/strategy-assignments`);
      if (response.ok) {
        const assignments = await response.json();
        const strategyIds = assignments.map((a: any) => a.strategyId);
        set({ assignedStrategyIds: strategyIds });
      }
    } catch (error) {
      console.error('Failed to load assigned strategy IDs', error);
    }
  },

  // Permission methods
  canEditStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator';
  },
  
  canEditTactics: () => {
    const { currentUser } = get();
    // Administrators and Co-Leads can edit tactics, View users cannot
    return currentUser?.role === 'administrator' || currentUser?.role === 'co_lead';
  },
  
  canCreateStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator';
  },
  
  canCreateTactics: () => {
    const { currentUser } = get();
    // Administrators and Co-Leads can create tactics
    return currentUser?.role === 'administrator' || currentUser?.role === 'co_lead';
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
    if (currentUser?.role === 'administrator') {
      return true;
    }
    if (currentUser?.role === 'co_lead') {
      // Co-Leads can edit tactics if they're assigned to them
      try {
        const accountableLeaders = JSON.parse(tactic.accountableLeaders || '[]');
        return accountableLeaders.includes(currentUser.id);
      } catch {
        return false;
      }
    }
    return false;
  },

  canEditAllStrategies: () => {
    const { currentUser } = get();
    return currentUser?.role === 'administrator';
  },

  isStrategyAssigned: (strategyId) => {
    const { currentUser, assignedStrategyIds } = get();
    // Administrators can access all strategies
    if (currentUser?.role === 'administrator') {
      return true;
    }
    // Co-Lead and View users can only access assigned strategies
    return assignedStrategyIds.includes(strategyId);
  },
}));
