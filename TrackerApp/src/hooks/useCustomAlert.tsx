import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CustomAlert } from '../components/ui/CustomAlert';

interface AlertAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertOptions {
  title: string;
  message?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  actions?: AlertAction[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    destructive?: boolean
  ) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  // Start with dummy data so Modal is pre-rendered
  const [alert, setAlert] = useState<AlertOptions>({
    title: '',
    message: '',
    type: 'info',
    actions: [],
  });
  const [visible, setVisible] = useState(false);

  const showAlert = (options: AlertOptions) => {
    // Instant replace: update content immediately without hiding
    setAlert(options);
    setVisible(true);
  };

  const showSuccess = (title: string, message?: string) => {
    showAlert({
      title,
      message,
      type: 'success',
      actions: [{ text: 'OK', onPress: hideAlert }],
    });
  };

  const showError = (title: string, message?: string) => {
    showAlert({
      title,
      message,
      type: 'error',
      actions: [{ text: 'OK', onPress: hideAlert }],
    });
  };

  const showWarning = (title: string, message?: string) => {
    showAlert({
      title,
      message,
      type: 'warning',
      actions: [{ text: 'OK', onPress: hideAlert }],
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = 'Confirm',
    destructive = false
  ) => {
    showAlert({
      title,
      message,
      type: destructive ? 'warning' : 'info',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: confirmText, 
          onPress: onConfirm, 
          style: destructive ? 'destructive' : 'default' 
        },
      ],
    });
  };

  const hideAlert = () => {
    setVisible(false);
  };

  return (
    <AlertContext.Provider value={{ showAlert, showSuccess, showError, showWarning, showConfirm }}>
      {children}
      {/* Modal always mounted with pre-rendered content */}
      <CustomAlert
        visible={visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        actions={alert.actions}
        onDismiss={hideAlert}
      />
    </AlertContext.Provider>
  );
}

export function useCustomAlert(): AlertContextType {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used within an AlertProvider');
  }
  return context;
}
