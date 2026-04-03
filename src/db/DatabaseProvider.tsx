import { useState, useEffect, type ReactNode } from 'react';
import { Provider } from 'rxdb-hooks';
import { getDatabase, type Database } from './index';

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  if (!db) return null;

  return <Provider db={db}>{children}</Provider>;
}
