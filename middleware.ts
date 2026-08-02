import { NextRequest, NextResponse } from "next/server";

type Role = "player" | "gm" | "moderator" | "admin";

const ROLE_RANK: Record<Role, number> = { player: 1, gm: 2, moderator: 3, admin: 4 };

function decodeJWTPayload(token: string): { userId?: string; role?: Role } | null {
  try {
    const part = token.split(".")[1];
    return JSON.parse(atob(part));
  } catch {
    return null;
  }
}

function hasMinRole(actual: Role | undefined, required: Role): boolean {
  return ROLE_RANK[actual ?? "player"] >= ROLE_RANK[required];
}

// Routes requiring a minimum role
const ROLE_GATES: [string, Role][] = [
  ["/Admin_tools", "moderator"],
];

// Routes requiring any authenticated user
const AUTH_REQUIRED = [
  "/Tournaments", "/wallet", "/profile", "/payment",
  "/lobby",       "/PremiumPlan", "/teams", "/feedback",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Require login for protected pages
  if (AUTH_REQUIRED.some((p) => pathname.startsWith(p))) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
  }

  // Require minimum role for specific pages
  const gate = ROLE_GATES.find(([p]) => pathname.startsWith(p));
  if (gate) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url));
    const payload = decodeJWTPayload(token);
    if (!hasMinRole(payload?.role, gate[1])) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/Admin_tools",
    "/Admin_tools/:path+",
    "/Tournaments",
    "/Tournaments/:path+",
    "/wallet",
    "/wallet/:path+",
    "/profile",
    "/profile/:path+",
    "/payment",
    "/payment/:path+",
    "/lobby",
    "/lobby/:path+",
    "/PremiumPlan",
    "/PremiumPlan/:path+",
    "/teams",
    "/teams/:path+",
    "/feedback",
    "/feedback/:path+",
  ],
};
