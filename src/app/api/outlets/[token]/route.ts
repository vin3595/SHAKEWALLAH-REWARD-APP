import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const outlet = await prisma.outlet.findUnique({
    where: { qrToken: token },
    include: { restaurant: { select: { name: true, slug: true } } },
  });
  if (!outlet) {
    return NextResponse.json({ error: "Unknown outlet QR code." }, { status: 404 });
  }
  return NextResponse.json({ id: outlet.id, name: outlet.name, restaurant: outlet.restaurant });
}
