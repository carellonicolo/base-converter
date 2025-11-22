import { ConversionType } from './conversion';

export interface HistoryItem {
  id: string;
  type: ConversionType;
  timestamp: number;
  input: string;
  output: string | Record<string, string>;
  favorite: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface HistoryFilters {
  type?: ConversionType;
  dateFrom?: number;
  dateTo?: number;
  searchQuery?: string;
  favorites?: boolean;
  tags?: string[];
}

export interface HistoryStats {
  totalConversions: number;
  conversionsByType: Record<ConversionType, number>;
  mostUsedType: ConversionType;
  favoriteCount: number;
}
