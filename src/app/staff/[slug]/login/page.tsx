import { notFound } from "next/navigation";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { StaffLoginForm } from "./StaffLoginForm";

export default async function StaffLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Staff sign-in</p>
        <h1 className="mt-1 text-2xl font-semibold">{restaurant.name} dashboard</h1>
      </div>
      <StaffLoginForm restaurantSlug={slug} />
    </main>
  );
}
