import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE = "albury_editor";
const sessionSeconds = 8 * 60 * 60;

export type EditorAuth = { ownerKey?: string; draftKey?: string; origin: string };
export type EditorRole = "owner" | "drafter";

export function editorAuth(): EditorAuth {
  return {
    ownerKey: process.env.ALBURY_EDITOR_OWNER_KEY,
    draftKey: process.env.ALBURY_EDITOR_DRAFT_KEY,
    origin: process.env.ALBURY_EDITOR_ORIGIN ?? "https://albury-house.vercel.app",
  };
}

function digest(s: string) { return createHash("sha256").update(s).digest(); }

export function keyMatches(actual: string, expected?: string) {
  return !!expected && expected.length >= 32 && actual.length <= 512 && timingSafeEqual(digest(actual), digest(expected));
}

function sessionSignature(value: string, key: string) {
  return createHmac("sha256", key).update("albury-editor-session:").update(value).digest("base64url");
}

function cookie(cookieValue: string, age: number, auth: EditorAuth) {
  const secure = auth.origin.startsWith("https:") ? "; Secure" : "";
  return `${COOKIE}=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`;
}

export function signIn(auth: EditorAuth) {
  const value = `${Math.floor(Date.now() / 1000) + sessionSeconds}.${randomBytes(16).toString("base64url")}`;
  return cookie(`${value}.${sessionSignature(value, auth.ownerKey!)}`, sessionSeconds, auth);
}

export function signOut(auth: EditorAuth) { return cookie("", 0, auth); }

export function draftKeyAuthorizes(request: Request, auth: EditorAuth) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  return !!bearer && !!auth.ownerKey && !keyMatches(bearer, auth.ownerKey) && keyMatches(bearer, auth.draftKey);
}

export function editorRole(request: Request, auth: EditorAuth): EditorRole | undefined {
  if (request.headers.has("authorization")) return draftKeyAuthorizes(request, auth) ? "drafter" : undefined;
  if (!auth.ownerKey || auth.ownerKey.length < 32) return undefined;
  const signed = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(value => value.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  const parts = signed?.match(/^(\d{1,12})\.([\w-]{22})\.([\w-]{43})$/);
  if (!parts || Number(parts[1]) <= Date.now() / 1000) return undefined;
  const expected = sessionSignature(`${parts[1]}.${parts[2]}`, auth.ownerKey);
  return timingSafeEqual(digest(parts[3]), digest(expected)) ? "owner" : undefined;
}
