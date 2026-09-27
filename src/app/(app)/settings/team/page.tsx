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
import { changeRoleAction, removeMemberAction, revokeInvitationAction } from "@/server/actions/team";
import { requireOrgContext } from "@/server/auth/context";
import { INVITE_TTL_DAYS, listMembers, listPendingInvitations } from "@/server/repositories/team";

export const metadata: Metadata = { title: "Team" };

const ROLE_LABEL = { OWNER: "Owner", ADMIN: "Admin", MEMBER: "Member" } as const;

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const ctx = await requireOrgContext();
  const { error } = await searchParams;
  const canManage = ctx.role !== "MEMBER";
  const [members, invites] = await Promise.all([listMembers(ctx), canManage ? listPendingInvitations(ctx) : Promise.resolve([])]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Settings" description="Company details and the defaults behind every profit calculation." />
      <SettingsTabs active="/settings/team" />
      {typeof error === "string" && error.length < 200 && (
        <p role="alert" className="rounded-md bg-critical-bg px-3 py-2 text-sm text-critical">
          {error}
        </p>
      )}

      {canManage && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invite a colleague</CardTitle>
              <CardDescription>Everyone in your organization sees the same clients and figures.</CardDescription>
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
            <CardTitle>Members</CardTitle>
            <CardDescription>Owners and admins can change settings and manage the team. Members can work with all client data.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
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
                        {m.userId === ctx.userId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.user.email}</div>
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <form action={changeRoleAction} className="flex items-center gap-2">
                          <input type="hidden" name="membershipId" value={m.id} />
                          <div className="w-32">
                            <Select name="role" defaultValue={m.role} aria-label={`Role of ${m.user.name}`}>
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </Select>
                          </div>
                          <Button type="submit" variant="ghost" size="sm">Save</Button>
                        </form>
                      ) : (
                        <Badge variant={m.role === "OWNER" ? "outline" : "neutral"}>{ROLE_LABEL[m.role]}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      {editable && (
                        <ConfirmButton action={removeMemberAction} fields={{ membershipId: m.id }} label="Remove" confirmLabel="Remove" message={`Remove ${m.user.name}?`} variant="ghost" />
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
              <CardTitle>Pending invitations</CardTitle>
              <CardDescription>Links that haven&apos;t been used yet. Revoke one to make its link stop working.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            {invites.length === 0 ? (
              <Empty>No pending invitations.</Empty>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell><Badge variant="neutral">{ROLE_LABEL[i.role]}</Badge></TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{formatDate(i.expiresAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{i.invitedBy?.name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <ConfirmButton action={revokeInvitationAction} fields={{ id: i.id }} label="Revoke" confirmLabel="Revoke" message="Revoke this invitation?" variant="ghost" />
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
