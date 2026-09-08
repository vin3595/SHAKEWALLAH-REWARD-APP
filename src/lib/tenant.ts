import { prisma } from "@/lib/prisma";

// v1 ships one deployment per brand (env-configured), matching Phase 1 of
// the architecture plan. Phase 3 adds subdomain-based tenant resolution —
// the schema is already multi-tenant, only this lookup needs to change.
export function currentTenantSlug() {
  return process.env.TENANT_SLUG ?? "shakewallah";
}

export async function getCurrentTenant() {
  return prisma.tenant.findUniqueOrThrow({
    where: { slug: currentTenantSlug() },
  });
}
