import { create } from 'zustand'
import type { RecommendationItem } from '../types/scan'
interface SelectionState { selectedIds: string[]; defaultsSynced: boolean; syncDefaults: (items: RecommendationItem[]) => void; toggle: (id: string) => void; selectSafe: (items: RecommendationItem[]) => void; clear: () => void }
export const useSelectionStore = create<SelectionState>((set) => ({
  selectedIds: [], defaultsSynced: false,
  syncDefaults: (items) => set((state) => state.defaultsSynced ? state : { selectedIds: items.filter(item => item.tier === 'safe').map(item => item.id), defaultsSynced: true }),
  toggle: (id) => set((state) => ({ selectedIds: state.selectedIds.includes(id) ? state.selectedIds.filter(item => item !== id) : [...state.selectedIds, id] })),
  selectSafe: (items) => set({ selectedIds: items.filter(item => item.tier === 'safe').map(item => item.id), defaultsSynced: true }),
  clear: () => set({ selectedIds: [], defaultsSynced: true }),
}))
