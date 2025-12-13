import { create } from 'zustand';

interface UpgradeModalState {
  isOpen: boolean;
  triggerReason: 'limit_reached' | 'manual' | 'feature_locked';
  limitType?: 'priorities' | 'projects' | 'users';
  openModal: (reason?: 'limit_reached' | 'manual' | 'feature_locked', limitType?: 'priorities' | 'projects' | 'users') => void;
  closeModal: () => void;
}

export const useUpgradeModal = create<UpgradeModalState>((set) => ({
  isOpen: false,
  triggerReason: 'manual',
  limitType: undefined,
  openModal: (reason = 'manual', limitType) => set({ 
    isOpen: true, 
    triggerReason: reason,
    limitType 
  }),
  closeModal: () => set({ 
    isOpen: false,
    triggerReason: 'manual',
    limitType: undefined
  }),
}));
