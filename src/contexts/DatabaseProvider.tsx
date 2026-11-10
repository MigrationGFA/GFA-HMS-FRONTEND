import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { db } from '@/db/database';

const TickCtx = createContext(0);
const ReadyCtx = createContext(true);

export const DatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = db.on('CHANGED', () => setTick(t => t + 1));
    // Brief boot skeleton while localStorage hydrates (never leave a blank flash).
    const timer = window.setTimeout(() => setReady(true), 120);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <ReadyCtx.Provider value={ready}>
      <TickCtx.Provider value={tick}>{children}</TickCtx.Provider>
    </ReadyCtx.Provider>
  );
};

export const useDbTick = () => useContext(TickCtx);
export const useDbReady = () => useContext(ReadyCtx);
