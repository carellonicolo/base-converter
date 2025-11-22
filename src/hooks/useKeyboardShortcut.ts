import { useEffect } from 'react';

type KeyCombo = string; // e.g., 'ctrl+k', 'cmd+shift+p'

/**
 * Hook to register keyboard shortcuts
 * @param combo - The key combination (e.g., 'ctrl+k')
 * @param callback - The callback to execute
 * @param enabled - Whether the shortcut is enabled
 */
export function useKeyboardShortcut(
  combo: KeyCombo,
  callback: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const parts = combo.toLowerCase().split('+');
      const key = parts[parts.length - 1];
      const modifiers = parts.slice(0, -1);

      // Check if all modifiers are pressed
      const hasCtrl = modifiers.includes('ctrl') ? event.ctrlKey : !event.ctrlKey;
      const hasShift = modifiers.includes('shift') ? event.shiftKey : !event.shiftKey;
      const hasAlt = modifiers.includes('alt') ? event.altKey : !event.altKey;
      const hasMeta = modifiers.includes('cmd') || modifiers.includes('meta')
        ? event.metaKey
        : !event.metaKey;

      // Normalize the key for comparison
      const hasKey = event.key.toLowerCase() === key.toLowerCase();

      if (hasCtrl && hasShift && hasAlt && hasMeta && hasKey) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [combo, callback, enabled]);
}
