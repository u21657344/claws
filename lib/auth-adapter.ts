import type { Adapter, AdapterUser, AdapterSession } from "@auth/core/adapters";
import { createAdminClient } from "./supabase";

function toUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: (row.name as string) ?? null,
    image: (row.image as string) ?? null,
    emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
  };
}

function toSession(row: Record<string, unknown>): AdapterSession {
  return {
    sessionToken: row.session_token as string,
    userId: row.user_id as string,
    expires: new Date(row.expires as string),
  };
}

export function CustomAdapter(): Adapter {
  return {
    async createUser(user) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_users")
        .insert({
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          email_verified: user.emailVerified?.toISOString() ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return toUser(data);
    },

    async getUser(id) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_users")
        .select()
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toUser(data) : null;
    },

    async getUserByEmail(email) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_users")
        .select()
        .eq("email", email)
        .maybeSingle();
      if (error) throw error;
      return data ? toUser(data) : null;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const sb = createAdminClient();
      const { data: account, error } = await sb
        .from("auth_accounts")
        .select("user_id")
        .match({ provider, provider_account_id: providerAccountId })
        .maybeSingle();
      if (error) throw error;
      if (!account?.user_id) return null;
      const { data: user, error: userError } = await sb
        .from("auth_users")
        .select()
        .eq("id", account.user_id)
        .maybeSingle();
      if (userError) throw userError;
      return user ? toUser(user) : null;
    },

    async updateUser(user) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_users")
        .update({
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
          email_verified: user.emailVerified?.toISOString() ?? null,
        })
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      return toUser(data);
    },

    async linkAccount(account) {
      const sb = createAdminClient();
      const { error } = await sb.from("auth_accounts").upsert({
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        provider_account_id: account.providerAccountId,
        refresh_token: account.refresh_token ?? null,
        access_token: account.access_token ?? null,
        expires_at: account.expires_at ?? null,
        token_type: account.token_type ?? null,
        scope: account.scope ?? null,
        id_token: account.id_token ?? null,
        session_state: account.session_state ?? null,
      }, { onConflict: "provider,provider_account_id" });
      if (error) throw error;
    },

    async createSession({ sessionToken, userId, expires }) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_sessions")
        .insert({
          session_token: sessionToken,
          user_id: userId,
          expires: expires.toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return toSession(data);
    },

    async getSessionAndUser(sessionToken) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_sessions")
        .select("*, auth_users(*)")
        .eq("session_token", sessionToken)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        session: toSession(data),
        user: toUser(data.auth_users as Record<string, unknown>),
      };
    },

    async updateSession(session) {
      const sb = createAdminClient();
      const { data, error } = await sb
        .from("auth_sessions")
        .update({ expires: session.expires?.toISOString() })
        .eq("session_token", session.sessionToken)
        .select()
        .single();
      if (error) throw error;
      return toSession(data);
    },

    async deleteSession(sessionToken) {
      const sb = createAdminClient();
      await sb.from("auth_sessions").delete().eq("session_token", sessionToken);
    },
  };
}
