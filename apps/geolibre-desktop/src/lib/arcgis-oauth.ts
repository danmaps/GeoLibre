/**
 * ArcGIS Online OAuth 2.0 with PKCE (Proof Key for Code Exchange).
 *
 * Uses @noble/hashes for SHA-256 so it works without a secure context —
 * required when serving over plain HTTP (e.g. internal intranet).
 *
 * Register your app at:
 *   https://www.arcgis.com/home/item.html → New Item → Application
 * Set redirect URI to: http://gisapps.sce.com/geolibre/
 * Then set VITE_ARCGIS_CLIENT_ID in your .env.local.
 */

import { sha256 } from "@noble/hashes/sha2.js";

const AGOL_AUTHORIZE_URL = "https://www.arcgis.com/sharing/rest/oauth2/authorize";
const AGOL_TOKEN_URL = "https://www.arcgis.com/sharing/rest/oauth2/token";
const AGOL_USER_URL = "https://www.arcgis.com/sharing/rest/community/self";

export interface ArcGISOAuthToken {
  accessToken: string;
  expiresAt: number; // ms since epoch
  username: string;
}

// ── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(48);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.random() * 256;
  }
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = sha256(data);
  return btoa(String.fromCharCode(...digest))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ── OAuth popup flow ──────────────────────────────────────────────────────────

const POPUP_MESSAGE_TYPE = "arcgis-oauth-callback";
const SESSION_STORAGE_KEY = "arcgis_oauth_token";

function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Initiate an OAuth PKCE login via a popup window.
 * Returns the token info when the user completes sign-in, or throws on error/cancel.
 */
export async function signInWithArcGISOnline(clientId: string): Promise<ArcGISOAuthToken> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();
  const state = Math.random().toString(36).slice(2);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  const authorizeUrl = `${AGOL_AUTHORIZE_URL}?${params.toString()}`;

  const code = await openOAuthPopup(authorizeUrl, state);
  return exchangeCodeForToken(code, verifier, clientId, redirectUri);
}

function openOAuthPopup(authorizeUrl: string, expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const width = 600;
    const height = 700;
    const left = Math.max(0, (screen.width - width) / 2);
    const top = Math.max(0, (screen.height - height) / 2);
    const popup = window.open(
      authorizeUrl,
      "arcgis-oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error("Popup blocked. Allow popups for this site and try again."));
      return;
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.type !== POPUP_MESSAGE_TYPE) return;
      window.removeEventListener("message", onMessage);
      clearInterval(pollTimer);
      if (event.data.error) {
        reject(new Error(event.data.error));
      } else if (event.data.state !== expectedState) {
        reject(new Error("OAuth state mismatch — possible CSRF."));
      } else {
        resolve(event.data.code as string);
      }
    }

    window.addEventListener("message", onMessage);

    // Detect if the user closes the popup manually
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        window.removeEventListener("message", onMessage);
        reject(new Error("Sign-in cancelled."));
      }
    }, 500);
  });
}

async function exchangeCodeForToken(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string,
): Promise<ArcGISOAuthToken> {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const response = await fetch(AGOL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (json.error) {
    throw new Error(json.error_description ?? json.error);
  }
  if (!json.access_token) {
    throw new Error("No access token returned.");
  }

  const username = await fetchAGOLUsername(json.access_token);

  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000,
    username,
  };
}

async function fetchAGOLUsername(accessToken: string): Promise<string> {
  const url = `${AGOL_USER_URL}?f=json&token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url);
  if (!response.ok) return "ArcGIS user";
  const json = (await response.json()) as { username?: string; fullName?: string };
  return json.fullName ?? json.username ?? "ArcGIS user";
}

// ── Session storage persistence ───────────────────────────────────────────────

function loadStoredToken(): ArcGISOAuthToken | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const token = JSON.parse(raw) as ArcGISOAuthToken;
    if (token.expiresAt < Date.now()) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

// ── Shared external store ─────────────────────────────────────────────────────
// All consumers of the token subscribe here so they stay in sync without
// needing a React context or prop drilling.

type TokenSubscriber = () => void;
const tokenSubscribers = new Set<TokenSubscriber>();
let currentToken: ArcGISOAuthToken | null = loadStoredToken();

function notifyTokenSubscribers(): void {
  for (const sub of tokenSubscribers) sub();
}

export function subscribeArcGISToken(subscriber: TokenSubscriber): () => void {
  tokenSubscribers.add(subscriber);
  return () => tokenSubscribers.delete(subscriber);
}

export function getArcGISToken(): ArcGISOAuthToken | null {
  return currentToken;
}

export function storeToken(token: ArcGISOAuthToken): void {
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(token));
  currentToken = token;
  notifyTokenSubscribers();
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  currentToken = null;
  notifyTokenSubscribers();
}

// ── OAuth callback handler ────────────────────────────────────────────────────

/**
 * Call this early in app startup (before rendering).
 * If the page is a popup returning from ArcGIS OAuth, it posts the code to the
 * opener and closes itself, preventing a full app render.
 *
 * Returns true if the page is handling an OAuth callback (app should not render).
 */
export function handleOAuthCallbackIfNeeded(): boolean {
  if (!window.opener) return false;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  const error = params.get("error");
  const errorDescription = params.get("error_description");

  if (!code && !error) return false;

  window.opener.postMessage(
    {
      type: POPUP_MESSAGE_TYPE,
      code: code ?? undefined,
      state: state ?? undefined,
      error: error ? (errorDescription ?? error) : undefined,
    },
    window.location.origin,
  );
  window.close();
  return true;
}
