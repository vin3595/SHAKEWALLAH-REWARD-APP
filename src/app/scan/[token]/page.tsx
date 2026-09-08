import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClaimForm } from "./ClaimForm";

export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.kind === "staff") redirect("/staff/login");

  const { token } = await params;
  const outlet = await prisma.outlet.findUnique({ where: { qrToken: token }, include: { restaurant: true } });

  if (!outlet) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-lg font-semibold">Unknown outlet</h1>
        <p className="text-sm text-stone-600">This QR code doesn&apos;t match a restaurant on the platform.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">
          {outlet.restaurant.name} · Claim points
        </p>
        <h1 className="mt-1 text-lg font-semibold">{outlet.name}</h1>
      </div>
      <ClaimForm outletToken={token} />
    </main>
  );
}
