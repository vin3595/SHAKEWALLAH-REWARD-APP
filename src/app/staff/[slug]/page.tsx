import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { ClaimsList } from "./ClaimsList";
import { FulfillForm } from "./FulfillForm";

async function signOut(slug: string) {
  "use server";
  await clearSessionCookie();
  redirect(`/staff/${slug}/login`);
}

export default async function StaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const session = await getSession();
  if (!session || session.kind !== "staff") redirect(`/staff/${slug}/login`);
  if (session.restaurantId !== restaurant.id) redirect(`/staff/${slug}/login`);

  const staff = await prisma.staffUser.findUniqueOrThrow({ where: { id: session.sub } });

  const where =
    staff.role === "BRAND_ADMIN"
      ? { outlet: { restaurantId: restaurant.id }, status: "PENDING" as const }
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
            {restaurant.name} · {staff.role === "BRAND_ADMIN" ? "Brand admin" : "Outlet staff"}
          </p>
          <h1 className="text-lg font-semibold">{staff.name}</h1>
        </div>
        <form action={signOut.bind(null, slug)}>
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

      {staff.role === "BRAND_ADMIN" && (
        <section className="flex flex-col gap-3 border-t border-stone-200 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-stone-700">Marketing</h2>
            <Link href={`/staff/${slug}/campaigns`} className="text-sm text-rose-700 underline">
              Segments &amp; campaigns →
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
