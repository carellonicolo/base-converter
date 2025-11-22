import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HistoryItem, HistoryFilters, HistoryStats } from '../types/history';
import { ConversionType } from '../types/conversion';

interface HistoryStore {
  history: HistoryItem[];
  favorites: HistoryItem[];

  // Actions
  addToHistory: (item: Omit<HistoryItem, 'id' | 'timestamp' | 'favorite'>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  toggleFavorite: (id: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;

  // Filters & Search
  filterHistory: (filters: HistoryFilters) => HistoryItem[];
  searchHistory: (query: string) => HistoryItem[];

  // Statistics
  getStats: () => HistoryStats;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      favorites: [],

      addToHistory: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          favorite: false,
        };

        set((state) => ({
          history: [newItem, ...state.history].slice(0, 100), // Keep last 100
        }));
      },

      removeFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
          favorites: state.favorites.filter((item) => item.id !== id),
        }));
      },

      clearHistory: () => {
        set({ history: [], favorites: [] });
      },

      toggleFavorite: (id) => {
        set((state) => {
          const item = state.history.find((h) => h.id === id);
          if (!item) return state;

          const updatedHistory = state.history.map((h) =>
            h.id === id ? { ...h, favorite: !h.favorite } : h
          );

          const updatedFavorites = item.favorite
            ? state.favorites.filter((f) => f.id !== id)
            : [...state.favorites, { ...item, favorite: true }];

          return {
            history: updatedHistory,
            favorites: updatedFavorites,
          };
        });
      },

      addTag: (id, tag) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id
              ? { ...item, tags: [...(item.tags || []), tag] }
              : item
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          history: state.history.map((item) =>
            item.id === id
              ? { ...item, tags: (item.tags || []).filter((t) => t !== tag) }
              : item
          ),
        }));
      },

      filterHistory: (filters) => {
        const { history } = get();

        return history.filter((item) => {
          if (filters.type && item.type !== filters.type) return false;
          if (filters.favorites && !item.favorite) return false;
          if (filters.dateFrom && item.timestamp < filters.dateFrom) return false;
          if (filters.dateTo && item.timestamp > filters.dateTo) return false;
          if (filters.tags && filters.tags.length > 0) {
            const itemTags = item.tags || [];
            if (!filters.tags.some((tag) => itemTags.includes(tag))) return false;
          }
          if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const inputMatch = item.input.toLowerCase().includes(query);
            const outputMatch = typeof item.output === 'string'
              ? item.output.toLowerCase().includes(query)
              : JSON.stringify(item.output).toLowerCase().includes(query);
            if (!inputMatch && !outputMatch) return false;
          }

          return true;
        });
      },

      searchHistory: (query) => {
        const { history } = get();
        const lowerQuery = query.toLowerCase();

        return history.filter((item) => {
          const inputMatch = item.input.toLowerCase().includes(lowerQuery);
          const outputMatch = typeof item.output === 'string'
            ? item.output.toLowerCase().includes(lowerQuery)
            : JSON.stringify(item.output).toLowerCase().includes(lowerQuery);
          const tagsMatch = (item.tags || []).some((tag) =>
            tag.toLowerCase().includes(lowerQuery)
          );

          return inputMatch || outputMatch || tagsMatch;
        });
      },

      getStats: () => {
        const { history } = get();

        const conversionsByType = history.reduce((acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {} as Record<ConversionType, number>);

        const mostUsedType = Object.entries(conversionsByType).reduce(
          (max, [type, count]) =>
            count > (conversionsByType[max as ConversionType] || 0)
              ? (type as ConversionType)
              : max,
          'base' as ConversionType
        );

        return {
          totalConversions: history.length,
          conversionsByType,
          mostUsedType,
          favoriteCount: history.filter((item) => item.favorite).length,
        };
      },
    }),
    {
      name: 'history-storage',
    }
  )
);
