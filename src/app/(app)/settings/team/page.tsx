import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell/page-header";
import { Empty } from "@/components/client-detail/section";
import { ConfirmButton } from "@/components/forms/confirm-button";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { InviteForm } from "@/components/team/invite-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { changeRoleAction, removeMemberAction, revokeInvitationAction } from "@/server/actions/team";
import { requireOrgContext } from "@/server/auth/context";
import { INVITE_TTL_DAYS, listMembers, listPendingInvitations } from "@/server/repositories/team";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("team.title") };
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireOrgContext();
  const { error } = await searchParams;
  const { t, tm, locale } = await getI18n();
  // Only known message keys are shown, so the query string can't inject arbitrary text.
  const errorText = typeof error === "string" && tm(error) !== error ? tm(error) : null;
  const canManage = ctx.role !== "MEMBER";
  const [members, invites] = await Promise.all([listMembers(ctx), canManage ? listPendingInvitations(ctx) : Promise.resolve([])]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <SettingsTabs active="/settings/team" />
      {errorText && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">
          {errorText}
        </p>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("team.invite")}</CardTitle>
              <CardDescription>{t("team.inviteDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <InviteForm ttlDays={INVITE_TTL_DAYS} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t("team.members")}</CardTitle>
            <CardDescription>{t("team.membersDesc")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("col.name")}</TableHead>
                <TableHead>{t("col.role")}</TableHead>
                <TableHead>{t("col.joined")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const editable = canManage && m.role !== "OWNER" && m.userId !== ctx.userId;
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">
                        {m.user.name}
                        {m.userId === ctx.userId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({t("common.you")})</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.user.email}</div>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <form action={changeRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="membershipId" value={m.id} />
                          <div className="w-32">
                            <Select name="role" defaultValue={m.role} aria-label={t("team.roleOf", { name: m.user.name })}>
                              <option value="MEMBER">{t("role.MEMBER")}</option>
                              <option value="ADMIN">{t("role.ADMIN")}</option>
                            </Select>
                          </div>
                          <Button type="submit" variant="ghost" size="sm">{t("common.save")}</Button>
                        </form>
                      ) : (
                        <Badge variant={m.role === "OWNER" ? "outline" : "neutral"}>{t(`role.${m.role}`)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(m.createdAt, locale)}</TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <ConfirmButton action={removeMemberAction} fields={{ membershipId: m.id }} label={t("common.remove")} confirmLabel={t("common.remove")} message={t("team.removeConfirm", { name: m.user.name })} variant="ghost" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{t("team.pending")}</CardTitle>
              <CardDescription>{t("team.pendingDesc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            {invites.length === 0 ? (
              <Empty>{t("team.noPending")}</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("col.email")}</TableHead>
                    <TableHead>{t("col.role")}</TableHead>
                    <TableHead>{t("col.expires")}</TableHead>
                    <TableHead>{t("col.invitedBy")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell><Badge variant="neutral">{t(`role.${i.role}`)}</Badge></TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(i.expiresAt, locale)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.invitedBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmButton action={revokeInvitationAction} fields={{ id: i.id }} label={t("team.revoke")} confirmLabel={t("team.revoke")} message={t("team.revokeConfirm")} variant="ghost" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
