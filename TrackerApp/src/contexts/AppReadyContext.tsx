import React, { createContext, useContext, ReactNode } from 'react';

interface AppReadyContextValue {
  isReady: boolean;
}

const AppReadyContext = createContext<AppReadyContextValue>({ isReady: false });

export function AppReadyProvider({
  isReady,
  children,
}: {
  isReady: boolean;
  children: ReactNode;
}) {
  return (
    <AppReadyContext.Provider value={{ isReady }}>
      {children}
    </AppReadyContext.Provider>
  );
}

/** Returns true once all stores have finished initial SQLite hydration. */
export function useAppReady(): boolean {
  return useContext(AppReadyContext).isReady;
}
