import { withAuth, ok } from "@/lib/api/handlers";
import { listUsersExcept, toPublicUser } from "@/lib/models/user";

export const GET = withAuth(async (user, request) => {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  let users = await listUsersExcept(user.id);
  if (query) {
    users = users.filter(
      (u) =>
        u.username.includes(query) ||
        u.displayName.toLowerCase().includes(query),
    );
  }
  return ok({ users });
});

export const dynamic = "force-dynamic";
