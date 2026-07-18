import "server-only";

import { listAdminActivity, type AdminActivityDto } from "@/lib/server/access-repository";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

export type AdminOverviewDto = {
  members: { total: number; invited: number; active: number; suspended: number; revoked: number };
  plans: { free: number; plus: number };
  support: { open: number; needsReply: number; resolved: number };
  usage: { documentBytes: number; aiEvents: number };
  recentActivity: AdminActivityDto[];
};

const DOCUMENT_PAGE_SIZE = 1_000;

async function sumDocumentBytes() {
  const admin = createSupabaseAdminClient();
  let total = 0;
  let from = 0;

  while (true) {
    const { data, error } = await admin
      .from("vault_documents")
      .select("size_bytes")
      .range(from, from + DOCUMENT_PAGE_SIZE - 1);
    if (error) throw new Error("ADMIN_OVERVIEW_DOCUMENTS_FAILED");

    const rows = data ?? [];
    total += rows.reduce((sum, row) => sum + Number(row.size_bytes ?? 0), 0);
    if (rows.length < DOCUMENT_PAGE_SIZE) return total;
    from += DOCUMENT_PAGE_SIZE;
  }
}

export async function getAdminOverview(): Promise<AdminOverviewDto> {
  const admin = createSupabaseAdminClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [
    totalMembers,
    invitedMembers,
    activeMembers,
    suspendedMembers,
    revokedMembers,
    freePlans,
    plusPlans,
    openTickets,
    needsReplyTickets,
    resolvedTickets,
    aiEvents,
    documentBytes,
    activity,
  ] = await Promise.all([
    admin.from("app_members").select("user_id", { count: "exact", head: true }),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).eq("status", "invited"),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).eq("status", "suspended"),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).eq("status", "revoked"),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).eq("plan", "free"),
    admin.from("app_members").select("user_id", { count: "exact", head: true }).in("plan", ["plus", "family"]),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open").eq("last_message_by", "member"),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
    admin.from("ai_usage_events").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    sumDocumentBytes(),
    listAdminActivity({ cursor: null }),
  ]);

  const counted = [
    totalMembers,
    invitedMembers,
    activeMembers,
    suspendedMembers,
    revokedMembers,
    freePlans,
    plusPlans,
    openTickets,
    needsReplyTickets,
    resolvedTickets,
    aiEvents,
  ];
  if (counted.some((result) => result.error)) throw new Error("ADMIN_OVERVIEW_COUNT_FAILED");

  return {
    members: {
      total: totalMembers.count ?? 0,
      invited: invitedMembers.count ?? 0,
      active: activeMembers.count ?? 0,
      suspended: suspendedMembers.count ?? 0,
      revoked: revokedMembers.count ?? 0,
    },
    plans: { free: freePlans.count ?? 0, plus: plusPlans.count ?? 0 },
    support: {
      open: openTickets.count ?? 0,
      needsReply: needsReplyTickets.count ?? 0,
      resolved: resolvedTickets.count ?? 0,
    },
    usage: { documentBytes, aiEvents: aiEvents.count ?? 0 },
    recentActivity: activity.items.slice(0, 5),
  };
}
