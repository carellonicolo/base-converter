import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Check, CircleAlert, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            role={t.type === 'error' ? 'alert' : 'status'}
            onClick={() => remove(t.id)}
          >
            <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0 }}>
              {t.type === 'success' ? <Check size={18} /> : t.type === 'error' ? <CircleAlert size={18} /> : <Info size={18} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): (message: string, type?: ToastType) => void {
  return useContext(ToastCtx);
}
