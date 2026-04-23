import { createCookie } from "@remix-run/node";

export const userCookie = createCookie("habsum_user", {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: 60 * 60 * 24 * 365,
});

export async function getSelectedUser(request: Request): Promise<string | null> {
  const header = request.headers.get("Cookie");
  const value = (await userCookie.parse(header)) as string | null;
  return value && typeof value === "string" ? value : null;
}
