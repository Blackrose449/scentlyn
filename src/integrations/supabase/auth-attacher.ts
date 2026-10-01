import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "./client";

/**
 * Attaches the signed-in user's bearer token to every server-function call so
 * `requireSupabaseAuth` can validate it on the server.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let token: string | undefined;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  } catch {
    token = undefined;
  }
  return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
});
