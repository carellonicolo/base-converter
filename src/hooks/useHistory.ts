import { useHistoryStore } from '../store/useHistoryStore';
import { ConversionType } from '../types/conversion';

/**
 * Hook to manage conversion history
 */
export function useHistory() {
  const {
    history,
    favorites,
    addToHistory,
    removeFromHistory,
    clearHistory,
    toggleFavorite,
    addTag,
    removeTag,
    filterHistory,
    searchHistory,
    getStats,
  } = useHistoryStore();

  const addConversion = (
    type: ConversionType,
    input: string,
    output: string | Record<string, string>,
    metadata?: Record<string, any>
  ) => {
    addToHistory({
      type,
      input,
      output,
      metadata,
    });
  };

  return {
    history,
    favorites,
    add: addConversion,
    remove: removeFromHistory,
    clear: clearHistory,
    toggleFavorite,
    addTag,
    removeTag,
    filter: filterHistory,
    search: searchHistory,
    stats: getStats(),
  };
}
