import { create } from 'zustand';

type Role = 'executive' | 'leader';

interface RoleStore {
  currentRole: Role;
  setRole: (role: Role) => void;
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
}

export const useRole = create<RoleStore>((set) => ({
  currentRole: 'executive',
  setRole: (role) => set({ currentRole: role }),
  currentUser: {
    id: '1',
    name: 'John Doe',
    initials: 'JD',
    role: 'executive'
  },
  setCurrentUser: (user) => set({ currentUser: user }),
}));
