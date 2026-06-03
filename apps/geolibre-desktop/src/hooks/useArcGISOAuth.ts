import { useCallback, useEffect, useState } from "react";
import {
  clearStoredToken,
  loadStoredToken,
  signInWithArcGISOnline,
  storeToken,
  type ArcGISOAuthToken,
} from "../lib/arcgis-oauth";

const CLIENT_ID = import.meta.env.VITE_ARCGIS_CLIENT_ID as string | undefined;

export interface ArcGISOAuthState {
  /** Configured client ID — undefined means OAuth is not set up. */
  clientId: string | undefined;
  token: ArcGISOAuthToken | null;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

export function useArcGISOAuth(): ArcGISOAuthState {
  const [token, setToken] = useState<ArcGISOAuthToken | null>(() => loadStoredToken());
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically clear expired tokens
  useEffect(() => {
    if (!token) return;
    const ms = token.expiresAt - Date.now();
    if (ms <= 0) {
      setToken(null);
      clearStoredToken();
      return;
    }
    const timer = setTimeout(() => {
      setToken(null);
      clearStoredToken();
    }, ms);
    return () => clearTimeout(timer);
  }, [token]);

  const signIn = useCallback(async () => {
    if (!CLIENT_ID) return;
    setIsSigningIn(true);
    setError(null);
    try {
      const next = await signInWithArcGISOnline(CLIENT_ID);
      storeToken(next);
      setToken(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Don't surface "cancelled" as a red error
      if (!message.toLowerCase().includes("cancel")) {
        setError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setError(null);
  }, []);

  return { clientId: CLIENT_ID, token, isSigningIn, error, signIn, signOut };
}
