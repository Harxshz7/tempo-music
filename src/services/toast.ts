import { create } from 'zustand';

export type ToastType = 'error' | 'info' | 'success';

interface ToastState {
  message: string | null;
  type: ToastType;
  timeoutId: ReturnType<typeof setTimeout> | null;
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  message: null,
  type: 'info',
  timeoutId: null,

  showToast: (message: string, type: ToastType = 'error', durationMs = 4000) => {
    const { timeoutId } = get();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const newTimeout = setTimeout(() => {
      set({ message: null, timeoutId: null });
    }, durationMs);

    set({ message, type, timeoutId: newTimeout });
  },

  hideToast: () => {
    const { timeoutId } = get();
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    set({ message: null, timeoutId: null });
  },
}));

export function showToast(message: string, type: ToastType = 'error', durationMs = 4000) {
  useToastStore.getState().showToast(message, type, durationMs);
}
