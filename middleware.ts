import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login"
  }
});

export const config = {
  // Keep auth on app routes, but bypass static/public assets so logo/font/image
  // requests are never redirected through auth middleware.
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
