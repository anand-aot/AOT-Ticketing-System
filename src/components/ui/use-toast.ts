import { useState } from 'react';

interface Toast {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = 'default' }: Toast) => {
    setToasts((prev) => [...prev, { title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  };

  return { toast, toasts };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts } = useToast();
  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2">
        {toasts.map((t, i) => (
          <div
            key={i}
            className={`p-4 rounded shadow ${t.variant === 'destructive' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'} animate-pulse`}
          >
            <h3>{t.title}</h3>
            <p>{t.description}</p>
          </div>
        ))}
      </div>
    </>
  );
}