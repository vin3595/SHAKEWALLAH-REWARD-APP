import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function requireCustomer() {
  const session = await getSession();
  if (!session || session.kind !== "customer") {
    return { session: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireStaff() {
  const session = await getSession();
  if (!session || session.kind !== "staff") {
    return { session: null, error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireBrandAdmin() {
  const { session, error } = await requireStaff();
  if (error) return { session: null, error };
  if (session!.role !== "BRAND_ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Brand admin only." }, { status: 403 }) };
  }
  return { session, error: null };
}
