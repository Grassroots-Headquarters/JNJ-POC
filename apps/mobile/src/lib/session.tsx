import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/lib/supabase";

type SessionState = {
  /** Undefined until the stored session has been read from AsyncStorage. */
  session: Session | null | undefined;
};

const SessionContext = createContext<SessionState>({ session: undefined });

/** Tracks the Supabase session so the router can gate screens on it. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    // INITIAL_SESSION delivers the persisted session on start-up; later events follow logins and logouts.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={{ session }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
