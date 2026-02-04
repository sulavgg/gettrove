/**
 * Haptic feedback utility for mobile devices
 * Uses the Vibration API when available
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

const hapticPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  error: [50, 50, 50],
};

export const triggerHaptic = (pattern: HapticPattern = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(hapticPatterns[pattern]);
    } catch {
      // Silently fail if vibration is not supported
    }
  }
};

export const useHaptic = () => {
  return {
    light: () => triggerHaptic('light'),
    medium: () => triggerHaptic('medium'),
    heavy: () => triggerHaptic('heavy'),
    success: () => triggerHaptic('success'),
    error: () => triggerHaptic('error'),
  };
};
