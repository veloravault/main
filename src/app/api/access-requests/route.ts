import { after } from "next/server";
import { parseAccessRequestInput } from "@/lib/access/validation";
import {
  accessRequestWindowStart,
  ACCESS_REQUEST_IP_LIMIT,
  ACCESS_REQUEST_PAIR_LIMIT,
  cleanupExpiredRateLimits,
  consumeAccessRequestRateLimit,
  insertAccessRequest,
} from "@/lib/server/access-repository";
import { handleAccessRequest } from "@/lib/server/access-request-handler";
import {
  assertSameOrigin,
  fingerprintAccessRequest,
  fingerprintAccessRequestIp,
  readBoundedJson,
  RequestSecurityError,
} from "@/lib/server/request-security";

const MAX_REQUEST_BYTES = 8_192;

export async function POST(request: Request) {
  return handleAccessRequest(request, {
    maxRequestBytes: MAX_REQUEST_BYTES,
    after,
    assertSameOrigin,
    readBoundedJson,
    parseAccessRequestInput,
    now: () => new Date(),
    accessRequestWindowStart,
    fingerprintAccessRequest,
    fingerprintAccessRequestIp,
    accessRequestPairLimit: ACCESS_REQUEST_PAIR_LIMIT,
    accessRequestIpLimit: ACCESS_REQUEST_IP_LIMIT,
    consumeAccessRequestRateLimit,
    insertAccessRequest,
    cleanupExpiredRateLimits,
    isRequestSecurityError: (error): error is RequestSecurityError => error instanceof RequestSecurityError,
  });
}
