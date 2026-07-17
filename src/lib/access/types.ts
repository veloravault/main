export const MEMBER_STATUSES = ["invited", "active", "suspended", "revoked"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type InviteCursor = { requestedAt: string; id: string };
