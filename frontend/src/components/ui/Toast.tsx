import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  show: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}

export function Toast({ show, message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -20, x: '-50%' }}
          className="fixed top-6 left-1/2 z-[9999] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border bg-white min-w-[300px]"
        >
          {type === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
          {type === 'error' && <XCircle className="text-red-500" size={20} />}
          {type === 'info' && <Info className="text-blue-500" size={20} />}
          <span className="text-sm font-medium text-neutral-700">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useToast() {
  const [toastState, setToastState] = useState({
    show: false,
    message: '',
    type: 'info' as ToastType,
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToastState({ show: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToastState((prev) => ({ ...prev, show: false }));
  }, []);

  return {
    toastState,
    showToast,
    hideToast,
    ToastComponent: (
      <Toast
        show={toastState.show}
        message={toastState.message}
        type={toastState.type}
        onClose={hideToast}
      />
    ),
  };
}
