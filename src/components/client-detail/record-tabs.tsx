import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostForm } from "@/components/records/cost-form";
import {
  costDefaults,
  domainDefaults,
  hostingDefaults,
  isoDate,
  serviceDefaults,
  timeEntryDefaults,
} from "@/components/records/defaults";
import { DomainForm } from "@/components/records/domain-form";
import { HostingForm } from "@/components/records/hosting-form";
import { ServiceForm } from "@/components/records/service-form";
import { TimeEntryForm } from "@/components/records/time-entry-form";
import { formatDate, formatMoney, formatRelativeDays } from "@/lib/format";
import { COST_CATEGORY_LABELS, DOMAIN_STATUS_LABELS, SERVICE_TYPE_LABELS } from "@/lib/labels";
import { addYears, dayNumber, isWithin, labourCost, sum, toMoney, toMonthly } from "@/lib/profitability";
import {
  deleteCostAction,
  deleteDomainAction,
  deleteHostingAction,
  deleteServiceAction,
  deleteTimeEntryAction,
} from "@/server/actions/records";
import type { ClientDetail } from "@/server/services/clients";
import { AmountPer } from "./money";
import { RowActions } from "./row-actions";
import { Empty, FormPanel, Section } from "./section";
import { tabHref, type ClientTab } from "./tabs";

export interface TabMode {
  isNew: boolean;
  editId: string | null;
}

type Props = { detail: ClientDetail; mode: TabMode };

function formProps(detail: ClientDetail, tab: ClientTab, recordId?: string) {
  const href = tabHref(detail.client.id, tab);
  return { clientId: detail.client.id, recordId, returnTo: href, cancelHref: href, currency: detail.settings.currency };
}

function period(start: Date, end: Date | null) {
  return end ? `${formatDate(start)} – ${formatDate(end)}` : `Since ${formatDate(start)}`;
}

/** Same rules as the engine: an inactive record without end date is excluded; otherwise dates decide. */
function RecordState({ start, end, active = true, today }: { start: Date; end: Date | null; active?: boolean; today: Date }) {
  if (!active && end === null) return <Badge variant="neutral">Inactive</Badge>;
  if (dayNumber(start) > dayNumber(today)) return <Badge variant="neutral">Upcoming</Badge>;
  if (isWithin(today, start, end)) {
    return end && dayNumber(end) === dayNumber(today) ? <Badge variant="warning">Ends today</Badge> : <Badge variant="positive">Active</Badge>;
  }
  return <Badge variant="neutral">Ended</Badge>;
}

// ─── Services ────────────────────────────────────────────────────────────────

export function ServicesTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.services.find((s) => s.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "services");
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? `Edit ${editing.name}` : "Add service"}>
          <ServiceForm {...formProps(detail, "services", editing?.id)} defaults={serviceDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title="Services" description="What this client pays you for, and what each service costs you." addHref={tabHref(client.id, "services", { new: "1" })} addLabel="Add service" flush>
        {client.services.length === 0 ? (
          <Empty>No services yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Monthly equiv.</TableHead>
                <TableHead className="text-right">Supplier cost</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.services.map((s) => {
                const price = toMoney(s.sellingPrice);
                const cost = toMoney(s.supplierCost);
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{[SERVICE_TYPE_LABELS[s.type], s.supplier].filter(Boolean).join(" · ")}</div>
                    </TableCell>
                    <TableCell className="text-right"><AmountPer amount={price} interval={s.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right tabular-nums">{s.billingInterval === "ONE_TIME" ? "—" : formatMoney(toMonthly(price, s.billingInterval), settings.currency)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cost.isZero() ? "—" : <AmountPer amount={cost} interval={s.costInterval ?? s.billingInterval} currency={settings.currency} />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.billingInterval === "ONE_TIME" ? formatDate(s.startDate) : period(s.startDate, s.endDate)}</TableCell>
                    <TableCell>
                      {s.billingInterval === "ONE_TIME" ? <Badge variant="neutral">One-time</Badge> : <RecordState start={s.startDate} end={s.endDate} active={s.isActive} today={settings.today} />}
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "services", { edit: s.id })} deleteAction={deleteServiceAction} id={s.id} returnTo={returnTo} what="service" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export function DomainsTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.domains.find((d) => d.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "domains");
  const t = dayNumber(settings.today);
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? `Edit ${editing.domain}` : "Add domain"}>
          <DomainForm {...formProps(detail, "domains", editing?.id)} defaults={domainDefaults(editing, today, isoDate(addYears(settings.today, 1)))} />
        </FormPanel>
      )}
      <Section title="Domains" description="Billed yearly. Costs use the first-year price, then the renewal price." addHref={tabHref(client.id, "domains", { new: "1" })} addLabel="Add domain" flush>
        {client.domains.length === 0 ? (
          <Empty>No domains yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead className="text-right">Price / year</TableHead>
                <TableHead className="text-right">Cost / year</TableHead>
                <TableHead className="text-right">Profit / year</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.domains.map((d) => {
                const figures = detail.bySource.get(d.id);
                const days = dayNumber(d.renewalDate) - t;
                const soon = d.status !== "CANCELLED" && days <= 30;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.domain}</div>
                      <div className="text-xs text-muted-foreground">{d.registrar ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(toMoney(d.sellingPrice), settings.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {figures ? formatMoney(figures.annualCosts, settings.currency) : "—"}
                      {figures?.costPhase === "FIRST_YEAR" && <div className="text-xs">first-year price</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{figures ? formatMoney(figures.annualProfit, settings.currency) : "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm tabular-nums">{formatDate(d.renewalDate)}</div>
                      <div className={soon ? (days < 0 ? "text-xs text-critical" : "text-xs text-warning") : "text-xs text-muted-foreground"}>
                        {formatRelativeDays(days)} · auto-renew {d.autoRenew ? "on" : "off"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === "ACTIVE" ? "positive" : d.status === "EXPIRING" ? "warning" : d.status === "EXPIRED" ? "critical" : "neutral"}>
                        {DOMAIN_STATUS_LABELS[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "domains", { edit: d.id })} deleteAction={deleteDomainAction} id={d.id} returnTo={returnTo} what="domain" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

// ─── Hosting ─────────────────────────────────────────────────────────────────

export function HostingTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.hosting.find((h) => h.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "hosting");
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? `Edit ${editing.product}` : "Add hosting"}>
          <HostingForm {...formProps(detail, "hosting", editing?.id)} defaults={hostingDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title="Hosting" addHref={tabHref(client.id, "hosting", { new: "1" })} addLabel="Add hosting" flush>
        {client.hosting.length === 0 ? (
          <Empty>No hosting products yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit / month</TableHead>
                <TableHead>Renewal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.hosting.map((h) => {
                const price = toMoney(h.sellingPrice);
                const cost = toMoney(h.purchaseCost);
                return (
                  <TableRow key={h.id}>
                    <TableCell>
                      <div className="font-medium">{h.product}</div>
                      <div className="text-xs text-muted-foreground">{[h.provider, h.server].filter(Boolean).join(" · ") || "—"}</div>
                    </TableCell>
                    <TableCell className="text-right"><AmountPer amount={price} interval={h.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right text-muted-foreground"><AmountPer amount={cost} interval={h.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(detail.bySource.get(h.id)?.monthlyProfit ?? toMoney("0"), settings.currency)}</TableCell>
                    <TableCell className="text-sm tabular-nums">{h.renewalDate ? formatDate(h.renewalDate) : "—"}</TableCell>
                    <TableCell><RecordState start={h.startDate} end={h.endDate} today={settings.today} /></TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "hosting", { edit: h.id })} deleteAction={deleteHostingAction} id={h.id} returnTo={returnTo} what="hosting product" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

// ─── Other costs (used inside the Costs tab) ─────────────────────────────────

export function OtherCostsSection({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.costs.find((c) => c.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "costs");
  return (
    <>
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? `Edit ${editing.name}` : "Add cost"}>
          <CostForm {...formProps(detail, "costs", editing?.id)} defaults={costDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title="Other client costs" description="Subscriptions, plugins, freelancers and other costs made for this client." addHref={tabHref(client.id, "costs", { new: "1" })} addLabel="Add cost" flush>
        {client.costs.length === 0 ? (
          <Empty>No other costs yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Monthly equiv.</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.costs.map((c) => {
                const amount = toMoney(c.amount);
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{COST_CATEGORY_LABELS[c.category]}</div>
                    </TableCell>
                    <TableCell className="text-right"><AmountPer amount={amount} interval={c.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.billingInterval === "ONE_TIME" ? "—" : formatMoney(toMonthly(amount, c.billingInterval), settings.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.billingInterval === "ONE_TIME" ? formatDate(c.startDate) : period(c.startDate, c.endDate)}</TableCell>
                    <TableCell>
                      {c.billingInterval === "ONE_TIME" ? <Badge variant="neutral">One-time</Badge> : <RecordState start={c.startDate} end={c.endDate} today={settings.today} />}
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "costs", { edit: c.id })} deleteAction={deleteCostAction} id={c.id} returnTo={returnTo} what="cost" />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Section>
    </>
  );
}

// ─── Time ────────────────────────────────────────────────────────────────────

const TIME_ROWS_SHOWN = 100;

export function TimeTab({ detail, mode }: Props) {
  const { client, settings, profitability } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.timeEntries.find((t) => t.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "time");
  const entries = client.timeEntries.map((t) => ({ ...t, hoursD: toMoney(t.hours), rateD: toMoney(t.hourlyCost) }));
  const totalHours = sum(entries.map((e) => e.hoursD));
  const totalCost = sum(entries.map((e) => labourCost({ date: e.date, hours: e.hoursD, hourlyCost: e.rateD })));
  const w = profitability.labourWindow;
  return (
    <div className="space-y-6">
      <FormPanel title={editing ? "Edit time entry" : "Log time"}>
        <TimeEntryForm
          key={editing?.id ?? "new"}
          {...formProps(detail, "time", editing?.id)}
          submitLabel={editing ? "Save changes" : "Log time"}
          cancelHref={editing ? returnTo : undefined}
          defaults={timeEntryDefaults(editing, today, settings.defaultHourlyCost)}
        />
      </FormPanel>
      <Section
        title="Time entries"
        description={
          <>
            {w.hours.toFixed(2).replace(".", ",")} h ({formatMoney(w.cost, settings.currency)}) in the labour window {formatDate(w.from)} – {formatDate(w.to)} → {formatMoney(profitability.monthly.labour, settings.currency)} / month. All time: {totalHours.toFixed(2).replace(".", ",")} h, {formatMoney(totalCost, settings.currency)}.
          </>
        }
        flush
      >
        {entries.length === 0 ? (
          <Empty>No time logged yet.</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Internal rate</TableHead>
                <TableHead className="text-right">Labour cost</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.slice(0, TIME_ROWS_SHOWN).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{formatDate(e.date)}</TableCell>
                  <TableCell className="max-w-96 truncate whitespace-normal">{e.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.hoursD.toFixed(2).replace(".", ",")}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(e.rateD, settings.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(labourCost({ date: e.date, hours: e.hoursD, hourlyCost: e.rateD }), settings.currency)}</TableCell>
                  <TableCell>
                    <RowActions editHref={tabHref(client.id, "time", { edit: e.id })} deleteAction={deleteTimeEntryAction} id={e.id} returnTo={returnTo} what="time entry" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {entries.length > TIME_ROWS_SHOWN && (
          <p className="px-3 pt-3 text-xs text-muted-foreground">Showing the latest {TIME_ROWS_SHOWN} of {entries.length} entries. Totals include all entries.</p>
        )}
      </Section>
    </div>
  );
}
