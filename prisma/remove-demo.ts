/**
 * Removes the public demo account from a deployed database.
 * Runs during the Vercel build only when REMOVE_DEMO_DATA=true. Idempotent.
 *
 * Safety: the demo organization is deleted only if the demo user is its
 * only member. If real users joined it, the organization and its data are
 * kept, ownership moves to the longest-standing other member, and only the
 * demo user is removed.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_EMAIL = "demo@clientprofit.test";
const DEMO_SLUG = "demo-agency";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  const org = await db.organization.findUnique({ where: { slug: DEMO_SLUG }, include: { memberships: { orderBy: { createdAt: "asc" } } } });

  if (org) {
    const others = org.memberships.filter((m) => m.userId !== user?.id);
    if (others.length === 0) {
      await db.organization.delete({ where: { id: org.id } });
      console.log(`[remove-demo] Deleted demo organization "${org.name}" and all its data.`);
    } else {
      const heir = others.find((m) => m.role === "OWNER") ?? others.find((m) => m.role === "ADMIN") ?? others[0]!;
      await db.membership.update({ where: { id: heir.id }, data: { role: "OWNER" } });
      console.log(`[remove-demo] Kept "${org.name}": it has ${others.length} other member(s). Ownership moved to membership ${heir.id}.`);
    }
  } else {
    console.log("[remove-demo] No demo organization found.");
  }

  if (user) {
    await db.user.delete({ where: { id: user.id } }); // sessions, accounts and memberships cascade
    console.log(`[remove-demo] Deleted demo user ${DEMO_EMAIL}.`);
  } else {
    console.log("[remove-demo] No demo user found.");
  }
}

main()
  .catch((e) => {
    console.error("[remove-demo] Failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
