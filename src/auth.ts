import NextAuth from "next-auth";

const auth0Domain = process.env.AUTH0_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const oidcIssuer = process.env.AUTH_OIDC_ISSUER ?? (auth0Domain ? `https://${auth0Domain}/` : undefined);

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.AUTH0_SECRET,
  providers: [
    {
      id: "oidc",
      name: "Acceso corporativo",
      type: "oidc",
      issuer: oidcIssuer,
      clientId: process.env.AUTH_OIDC_CLIENT_ID ?? process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET ?? process.env.AUTH0_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          audience: process.env.AUTH_OIDC_AUDIENCE,
        },
      },
      profile(profile) {
        return {
          id: String(profile.sub),
          name: typeof profile.name === "string" ? profile.name : null,
          email: typeof profile.email === "string" ? profile.email : null,
        };
      },
    },
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 },
  callbacks: {
    authorized({ auth: session, request }) {
      if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/app")) {
        return Boolean(session);
      }
      return true;
    },
    jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
        token.accessTokenExpiresAt = account.expires_at;
      }
      return token;
    },
    session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.accessTokenExpiresAt =
        typeof token.accessTokenExpiresAt === "number" ? token.accessTokenExpiresAt : undefined;
      return session;
    },
  },
});
