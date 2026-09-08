import { NextResponse } from "next/server";
import { listActiveRestaurants } from "@/lib/restaurant";

export async function GET() {
  const restaurants = await listActiveRestaurants();
  return NextResponse.json({ restaurants });
}
