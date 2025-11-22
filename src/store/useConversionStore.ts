import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Conversion } from '../types/conversion';

interface ConversionStore {
  currentConversion: Conversion | null;
  setCurrentConversion: (conversion: Conversion | null) => void;
  clearCurrentConversion: () => void;
}

export const useConversionStore = create<ConversionStore>()(
  persist(
    (set) => ({
      currentConversion: null,
      setCurrentConversion: (conversion) => set({ currentConversion: conversion }),
      clearCurrentConversion: () => set({ currentConversion: null }),
    }),
    {
      name: 'conversion-storage',
    }
  )
);
