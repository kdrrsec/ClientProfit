/**
 * Demo data. Idempotent: removes and recreates the demo organization and
 * demo user only. All dates are relative to today so renewals, labour
 * windows and the 12-month chart always look realistic.
 *
 *   pnpm db:seed   →   demo@clientprofit.test / demo12345
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { addDays, addMonths, addYears } from "../src/lib/profitability/dates";
import { todayInTimeZone } from "../src/lib/time";

const DEMO_EMAIL = "demo@clientprofit.test";
const DEMO_PASSWORD = "demo12345";
const DEMO_SLUG = "demo-agency";
const HOURLY_COST = "50";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const today = todayInTimeZone("Europe/Amsterdam");
const monthsAgo = (n: number) => addMonths(today, -n);
const inDays = (n: number) => addDays(today, n);

type ServiceSeed = Omit<Prisma.ServiceUncheckedCreateInput, "organizationId" | "clientId">;
type DomainSeed = Omit<Prisma.DomainUncheckedCreateInput, "organizationId" | "clientId">;
type HostingSeed = Omit<Prisma.HostingUncheckedCreateInput, "organizationId" | "clientId">;
type CostSeed = Omit<Prisma.CostUncheckedCreateInput, "organizationId" | "clientId">;

interface ClientSeed {
  client: Omit<Prisma.ClientUncheckedCreateInput, "organizationId">;
  services?: ServiceSeed[];
  domains?: DomainSeed[];
  hosting?: HostingSeed[];
  costs?: CostSeed[];
  /** Hours logged per month since startDate, spread over tasks. */
  monthlyHours?: { hours: string; description: string }[];
}

function clients(): ClientSeed[] {
  return [
    {
      client: {
        companyName: "Kapsalon Zafer",
        contactName: "Zafer Yılmaz",
        email: "info@kapsalonzafer.nl",
        phone: "+31 20 123 4567",
        website: "https://kapsalonzafer.nl",
        city: "Amsterdam",
        status: "ACTIVE",
        startDate: monthsAgo(14),
      },
      services: [
        { name: "Website build", type: "WEBSITE", billingInterval: "ONE_TIME", sellingPrice: "1200", startDate: monthsAgo(14) },
        { name: "Website", type: "WEBSITE", billingInterval: "MONTHLY", sellingPrice: "89", startDate: monthsAgo(14) },
        { name: "Hosting", type: "HOSTING", billingInterval: "MONTHLY", sellingPrice: "15", supplier: "TransIP", supplierCost: "4", startDate: monthsAgo(14) },
        { name: "Maintenance", type: "MAINTENANCE", billingInterval: "MONTHLY", sellingPrice: "32", startDate: monthsAgo(14) },
      ],
      domains: [
        {
          domain: "kapsalonzafer.nl", registrar: "TransIP", purchaseCost: "0", renewalCost: "6", sellingPrice: "9",
          registeredAt: monthsAgo(14), renewalDate: addYears(monthsAgo(14), 2), autoRenew: true,
        },
      ],
      monthlyHours: [{ hours: "1.5", description: "Website maintenance & updates" }],
    },
    {
      client: {
        companyName: "Bakkerij De Vries",
        contactName: "Anouk de Vries",
        email: "anouk@bakkerijdevries.nl",
        website: "https://bakkerijdevries.nl",
        city: "Utrecht",
        status: "ACTIVE",
        startDate: monthsAgo(10),
      },
      services: [
        { name: "Website", type: "WEBSITE", billingInterval: "MONTHLY", sellingPrice: "149", startDate: monthsAgo(10) },
        { name: "Maintenance", type: "MAINTENANCE", billingInterval: "MONTHLY", sellingPrice: "49", startDate: monthsAgo(10) },
      ],
      hosting: [
        {
          product: "Managed WordPress", provider: "TransIP", server: "wp-ams-02", billingInterval: "MONTHLY",
          purchaseCost: "7", sellingPrice: "20", startDate: monthsAgo(10), renewalDate: inDays(12),
        },
      ],
      domains: [
        {
          domain: "bakkerijdevries.nl", registrar: "TransIP", purchaseCost: "0", renewalCost: "12", sellingPrice: "24",
          registeredAt: addDays(addYears(today, -1), 25), renewalDate: inDays(25), autoRenew: true,
        },
      ],
      costs: [
        { name: "Elementor Pro", category: "PLUGIN", amount: "59", billingInterval: "YEARLY", startDate: monthsAgo(10), renewalDate: inDays(60) },
      ],
      monthlyHours: [
        { hours: "1.25", description: "Content updates" },
        { hours: "0.75", description: "Plugin updates & backups" },
      ],
    },
    {
      client: {
        companyName: "Van Dijk Installatietechniek",
        contactName: "Mark van Dijk",
        email: "mark@vandijk-installatie.nl",
        website: "https://vandijk-installatie.nl",
        city: "Amersfoort",
        vatNumber: "NL001234567B01",
        chamberOfCommerce: "12345678",
        status: "ACTIVE",
        startDate: monthsAgo(7),
        contractRenewalDate: inDays(20),
      },
      services: [
        { name: "Website build", type: "WEBSITE", billingInterval: "ONE_TIME", sellingPrice: "2500", startDate: monthsAgo(7) },
        { name: "Growth package (website + SEO)", type: "SEO", billingInterval: "MONTHLY", sellingPrice: "299", startDate: monthsAgo(7) },
      ],
      domains: [
        {
          domain: "vandijk-installatie.nl", registrar: "Versio", purchaseCost: "5", renewalCost: "12", sellingPrice: "24",
          registeredAt: monthsAgo(7), renewalDate: addYears(monthsAgo(7), 1), autoRenew: true,
        },
      ],
      costs: [
        { name: "Semrush seat", category: "SAAS", amount: "60", billingInterval: "MONTHLY", startDate: monthsAgo(7) },
        { name: "Freelance copywriter", category: "FREELANCER", amount: "40", billingInterval: "MONTHLY", startDate: monthsAgo(7) },
      ],
      monthlyHours: [{ hours: "1", description: "SEO reporting" }],
    },
    {
      client: {
        companyName: "Studio Noord",
        contactName: "Lisa Bakker",
        email: "lisa@studionoord.nl",
        website: "https://studionoord.nl",
        city: "Groningen",
        status: "ACTIVE",
        startDate: monthsAgo(5),
        notes: "Webshop with many custom requests. Hours are consistently above the maintenance budget.",
      },
      services: [
        { name: "Webshop maintenance", type: "MAINTENANCE", billingInterval: "MONTHLY", sellingPrice: "75", startDate: monthsAgo(5) },
      ],
      hosting: [
        {
          product: "WooCommerce VPS", provider: "Hetzner", server: "vps-nbg-11", billingInterval: "MONTHLY",
          purchaseCost: "30", sellingPrice: "35", startDate: monthsAgo(5), renewalDate: inDays(40),
        },
      ],
      domains: [
        {
          domain: "studionoord.nl", registrar: "Versio", purchaseCost: "0", renewalCost: "14", sellingPrice: "15",
          registeredAt: addDays(addYears(today, -1), 8), renewalDate: inDays(8), autoRenew: false,
        },
      ],
      monthlyHours: [
        { hours: "3", description: "Webshop support" },
        { hours: "2", description: "Custom product filters" },
      ],
    },
    {
      client: {
        companyName: "Fysio Centrum Oost",
        contactName: "Daan Visser",
        email: "daan@fysiocentrumoost.nl",
        website: "https://fysiocentrumoost.nl",
        city: "Rotterdam",
        status: "ACTIVE",
        startDate: monthsAgo(3),
      },
      services: [
        { name: "Website", type: "WEBSITE", billingInterval: "MONTHLY", sellingPrice: "59", startDate: monthsAgo(3) },
        // Supplier cost intentionally left at 0 → shows up under "Attention needed".
        { name: "Booking plugin licence", type: "LICENSE", billingInterval: "MONTHLY", sellingPrice: "10", startDate: monthsAgo(3) },
      ],
      hosting: [
        {
          product: "Shared hosting", provider: "Antagonist", billingInterval: "MONTHLY",
          purchaseCost: "9", sellingPrice: "12", startDate: monthsAgo(3), renewalDate: inDays(9),
        },
      ],
      monthlyHours: [{ hours: "1", description: "Booking flow tweaks" }],
    },
    {
      client: {
        companyName: "Café Centraal",
        contactName: "Sem Jansen",
        email: "sem@cafecentraal.nl",
        city: "Haarlem",
        status: "LEAD",
        notes: "Interested in a new website + hosting. Proposal sent.",
      },
    },
  ];
}

async function main() {
  // Remove previous demo data only.
  await db.organization.deleteMany({ where: { slug: DEMO_SLUG } });
  await db.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const user = await db.user.create({
    data: { name: "Demo User", email: DEMO_EMAIL, emailVerified: true },
  });
  await db.account.create({
    data: { userId: user.id, accountId: user.id, providerId: "credential", password: await hashPassword(DEMO_PASSWORD) },
  });
  const org = await db.organization.create({
    data: {
      name: "Demo Agency",
      slug: DEMO_SLUG,
      defaultHourlyCost: HOURLY_COST,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  for (const seed of clients()) {
    const organizationId = org.id;
    const client = await db.client.create({ data: { ...seed.client, organizationId } });
    const ids = { organizationId, clientId: client.id };

    if (seed.services?.length) await db.service.createMany({ data: seed.services.map((s) => ({ ...s, ...ids })) });
    if (seed.domains?.length) await db.domain.createMany({ data: seed.domains.map((d) => ({ ...d, ...ids })) });
    if (seed.hosting?.length) await db.hosting.createMany({ data: seed.hosting.map((h) => ({ ...h, ...ids })) });
    if (seed.costs?.length) await db.cost.createMany({ data: seed.costs.map((c) => ({ ...c, ...ids })) });

    if (seed.monthlyHours && seed.client.startDate) {
      const start = new Date(seed.client.startDate);
      const entries: Prisma.TimeEntryCreateManyInput[] = [];
      // One set of entries per month, on the 10th and 20th, from start until today (max 12 months).
      for (let m = 0; m < 12; m++) {
        seed.monthlyHours.forEach((task, i) => {
          const base = addMonths(today, -m);
          const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), i === 0 ? 10 : 20));
          if (date < start || date > today) return;
          entries.push({ ...ids, userId: user.id, date, description: task.description, hours: task.hours, hourlyCost: HOURLY_COST });
        });
      }
      if (entries.length) await db.timeEntry.createMany({ data: entries });
    }
  }

  console.log(`Seeded "${org.name}" with ${clients().length} clients.`);
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
