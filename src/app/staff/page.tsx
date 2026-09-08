import { redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClaimsList } from "./ClaimsList";
import { FulfillForm } from "./FulfillForm";

async function signOut() {
  "use server";
  await clearSessionCookie();
  redirect("/staff/login");
}

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/staff/login");
  if (session.kind === "customer") redirect("/");

  const staff = await prisma.staffUser.findUniqueOrThrow({ where: { id: session.sub } });

  const where =
    staff.role === "BRAND_ADMIN"
      ? { outlet: { tenantId: staff.tenantId }, status: "PENDING" as const }
      : { outletId: staff.outletId ?? "__none__", status: "PENDING" as const };

  const claims = await prisma.billClaim.findMany({
    where,
    include: { customer: { select: { phone: true, name: true } }, outlet: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
            {staff.role === "BRAND_ADMIN" ? "Brand admin" : "Outlet staff"}
          </p>
          <h1 className="text-lg font-semibold">{staff.name}</h1>
        </div>
        <form action={signOut}>
          <button className="text-sm text-stone-500 underline">Sign out</button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">Pending bill claims</h2>
        <ClaimsList initialClaims={claims} showOutlet={staff.role === "BRAND_ADMIN"} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">Fulfil a redemption</h2>
        <FulfillForm />
      </section>
    </main>
  );
}
