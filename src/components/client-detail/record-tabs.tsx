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
import { formatDate, formatHours, formatMoney, formatRelativeDays } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import type { T } from "@/i18n/translate";
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

function period(t: T, locale: Locale, start: Date, end: Date | null) {
  return end ? t("period.range", { from: formatDate(start, locale), to: formatDate(end, locale) }) : t("period.since", { from: formatDate(start, locale) });
}

/** Same rules as the engine: an inactive record without end date is excluded; otherwise dates decide. */
async function RecordState({ start, end, active = true, today }: { start: Date; end: Date | null; active?: boolean; today: Date }) {
  const { t } = await getI18n();
  if (!active && end === null) return <Badge variant="neutral">{t("recordState.inactive")}</Badge>;
  if (dayNumber(start) > dayNumber(today)) return <Badge variant="neutral">{t("recordState.upcoming")}</Badge>;
  if (isWithin(today, start, end)) {
    return end && dayNumber(end) === dayNumber(today) ? (
      <Badge variant="warning">{t("recordState.endsToday")}</Badge>
    ) : (
      <Badge variant="positive">{t("recordState.active")}</Badge>
    );
  }
  return <Badge variant="neutral">{t("recordState.ended")}</Badge>;
}

async function OneTimeBadge() {
  const { t } = await getI18n();
  return <Badge variant="neutral">{t("recordState.one-time")}</Badge>;
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function ServicesTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.services.find((s) => s.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "services");
  const { t, locale } = await getI18n();
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.name }) : t("add.service")}>
          <ServiceForm {...formProps(detail, "services", editing?.id)} defaults={serviceDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title={t("services.title")} description={t("services.description")} addHref={tabHref(client.id, "services", { new: "1" })} addLabel={t("add.service")} flush>
        {client.services.length === 0 ? (
          <Empty>{t("services.empty")}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.service")}</TableHead>
                <TableHead className="text-right">{t("col.price")}</TableHead>
                <TableHead className="text-right">{t("col.monthlyEquiv")}</TableHead>
                <TableHead className="text-right">{t("col.supplierCost")}</TableHead>
                <TableHead>{t("col.period")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
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
                      <div className="text-xs text-muted-foreground">{[t(`serviceType.${s.type}`), s.supplier].filter(Boolean).join(" · ")}</div>
                    </TableCell>
                    <TableCell className="text-right"><AmountPer amount={price} interval={s.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right tabular-nums">{s.billingInterval === "ONE_TIME" ? "—" : formatMoney(toMonthly(price, s.billingInterval), settings.currency)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {cost.isZero() ? "—" : <AmountPer amount={cost} interval={s.costInterval ?? s.billingInterval} currency={settings.currency} />}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.billingInterval === "ONE_TIME" ? formatDate(s.startDate, locale) : period(t, locale, s.startDate, s.endDate)}</TableCell>
                    <TableCell>
                      {s.billingInterval === "ONE_TIME" ? <OneTimeBadge /> : <RecordState start={s.startDate} end={s.endDate} active={s.isActive} today={settings.today} />}
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "services", { edit: s.id })} deleteAction={deleteServiceAction} id={s.id} returnTo={returnTo} what="what.service" />
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

export async function DomainsTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.domains.find((d) => d.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "domains");
  const { t, locale } = await getI18n();
  const todayNum = dayNumber(settings.today);
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.domain }) : t("add.domain")}>
          <DomainForm {...formProps(detail, "domains", editing?.id)} defaults={domainDefaults(editing, today, isoDate(addYears(settings.today, 1)))} />
        </FormPanel>
      )}
      <Section title={t("domains.title")} description={t("domains.description")} addHref={tabHref(client.id, "domains", { new: "1" })} addLabel={t("add.domain")} flush>
        {client.domains.length === 0 ? (
          <Empty>{t("domains.empty")}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.domain")}</TableHead>
                <TableHead className="text-right">{t("col.pricePerYear")}</TableHead>
                <TableHead className="text-right">{t("col.costPerYear")}</TableHead>
                <TableHead className="text-right">{t("col.profitPerYear")}</TableHead>
                <TableHead>{t("col.renewal")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {client.domains.map((d) => {
                const figures = detail.bySource.get(d.id);
                const days = dayNumber(d.renewalDate) - todayNum;
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
                      {figures?.costPhase === "FIRST_YEAR" && <div className="text-xs">{t("domain.firstYearPrice")}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{figures ? formatMoney(figures.annualProfit, settings.currency) : "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm tabular-nums">{formatDate(d.renewalDate, locale)}</div>
                      <div className={soon ? (days < 0 ? "text-xs text-critical" : "text-xs text-warning") : "text-xs text-muted-foreground"}>
                        {t("domain.autoRenewState", { when: formatRelativeDays(days, t), state: t(d.autoRenew ? "state.on" : "state.off") })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === "ACTIVE" ? "positive" : d.status === "EXPIRING" ? "warning" : d.status === "EXPIRED" ? "critical" : "neutral"}>
                        {t(`domainStatus.${d.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "domains", { edit: d.id })} deleteAction={deleteDomainAction} id={d.id} returnTo={returnTo} what="what.domain" />
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

export async function HostingTab({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.hosting.find((h) => h.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "hosting");
  const { t, locale } = await getI18n();
  return (
    <div className="space-y-6">
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.product }) : t("add.hosting")}>
          <HostingForm {...formProps(detail, "hosting", editing?.id)} defaults={hostingDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title={t("hosting.title")} addHref={tabHref(client.id, "hosting", { new: "1" })} addLabel={t("add.hosting")} flush>
        {client.hosting.length === 0 ? (
          <Empty>{t("hosting.empty")}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.product")}</TableHead>
                <TableHead className="text-right">{t("col.price")}</TableHead>
                <TableHead className="text-right">{t("col.cost")}</TableHead>
                <TableHead className="text-right">{t("col.profitPerMonth")}</TableHead>
                <TableHead>{t("col.renewal")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
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
                    <TableCell className="text-sm tabular-nums">{h.renewalDate ? formatDate(h.renewalDate, locale) : "—"}</TableCell>
                    <TableCell><RecordState start={h.startDate} end={h.endDate} today={settings.today} /></TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "hosting", { edit: h.id })} deleteAction={deleteHostingAction} id={h.id} returnTo={returnTo} what="what.hosting" />
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

export async function OtherCostsSection({ detail, mode }: Props) {
  const { client, settings } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.costs.find((c) => c.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "costs");
  const { t, locale } = await getI18n();
  return (
    <>
      {(mode.isNew || editing) && (
        <FormPanel title={editing ? t("services.edit", { name: editing.name }) : t("add.cost")}>
          <CostForm {...formProps(detail, "costs", editing?.id)} defaults={costDefaults(editing, today, settings.defaultBillingInterval)} />
        </FormPanel>
      )}
      <Section title={t("otherCosts.title")} description={t("otherCosts.description")} addHref={tabHref(client.id, "costs", { new: "1" })} addLabel={t("add.cost")} flush>
        {client.costs.length === 0 ? (
          <Empty>{t("otherCosts.empty")}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.name")}</TableHead>
                <TableHead className="text-right">{t("col.amount")}</TableHead>
                <TableHead className="text-right">{t("col.monthlyEquiv")}</TableHead>
                <TableHead>{t("col.period")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
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
                      <div className="text-xs text-muted-foreground">{t(`costCategory.${c.category}`)}</div>
                    </TableCell>
                    <TableCell className="text-right"><AmountPer amount={amount} interval={c.billingInterval} currency={settings.currency} /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.billingInterval === "ONE_TIME" ? "—" : formatMoney(toMonthly(amount, c.billingInterval), settings.currency)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.billingInterval === "ONE_TIME" ? formatDate(c.startDate, locale) : period(t, locale, c.startDate, c.endDate)}</TableCell>
                    <TableCell>
                      {c.billingInterval === "ONE_TIME" ? <OneTimeBadge /> : <RecordState start={c.startDate} end={c.endDate} today={settings.today} />}
                    </TableCell>
                    <TableCell>
                      <RowActions editHref={tabHref(client.id, "costs", { edit: c.id })} deleteAction={deleteCostAction} id={c.id} returnTo={returnTo} what="what.cost" />
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

export async function TimeTab({ detail, mode }: Props) {
  const { client, settings, profitability } = detail;
  const today = isoDate(settings.today);
  const editing = mode.editId ? client.timeEntries.find((e) => e.id === mode.editId) : undefined;
  const returnTo = tabHref(client.id, "time");
  const { t, locale } = await getI18n();
  const entries = client.timeEntries.map((e) => ({ ...e, hoursD: toMoney(e.hours), rateD: toMoney(e.hourlyCost) }));
  const totalHours = sum(entries.map((e) => e.hoursD));
  const totalCost = sum(entries.map((e) => labourCost({ date: e.date, hours: e.hoursD, hourlyCost: e.rateD })));
  const w = profitability.labourWindow;
  return (
    <div className="space-y-6">
      <FormPanel title={editing ? t("time.editTitle") : t("time.logTitle")}>
        <TimeEntryForm
          key={editing?.id ?? "new"}
          {...formProps(detail, "time", editing?.id)}
          submitLabel={editing ? t("common.saveChanges") : t("time.logTitle")}
          cancelHref={editing ? returnTo : undefined}
          defaults={timeEntryDefaults(editing, today, settings.defaultHourlyCost)}
        />
      </FormPanel>
      <Section
        title={t("time.entries")}
        description={t("time.summary", {
          hours: formatHours(w.hours),
          cost: formatMoney(w.cost, settings.currency),
          from: formatDate(w.from, locale),
          to: formatDate(w.to, locale),
          monthly: formatMoney(profitability.monthly.labour, settings.currency),
          totalHours: formatHours(totalHours),
          totalCost: formatMoney(totalCost, settings.currency),
        })}
        flush
      >
        {entries.length === 0 ? (
          <Empty>{t("time.empty")}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.date")}</TableHead>
                <TableHead>{t("col.description")}</TableHead>
                <TableHead className="text-right">{t("col.hours")}</TableHead>
                <TableHead className="text-right">{t("col.internalRate")}</TableHead>
                <TableHead className="text-right">{t("col.labourCost")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.slice(0, TIME_ROWS_SHOWN).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums">{formatDate(e.date, locale)}</TableCell>
                  <TableCell className="max-w-96 truncate whitespace-normal">{e.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatHours(e.hoursD)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(e.rateD, settings.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(labourCost({ date: e.date, hours: e.hoursD, hourlyCost: e.rateD }), settings.currency)}</TableCell>
                  <TableCell>
                    <RowActions editHref={tabHref(client.id, "time", { edit: e.id })} deleteAction={deleteTimeEntryAction} id={e.id} returnTo={returnTo} what="what.timeEntry" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {entries.length > TIME_ROWS_SHOWN && (
          <p className="px-3 pt-3 text-xs text-muted-foreground">{t("time.truncated", { shown: TIME_ROWS_SHOWN, total: entries.length })}</p>
        )}
      </Section>
    </div>
  );
}
