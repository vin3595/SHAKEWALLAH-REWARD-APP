"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Segment = {
  id: string;
  name: string;
  ruleType: "INACTIVE_DAYS" | "MIN_LIFETIME_SPEND" | "MIN_VISITS";
  ruleValue: number;
  matchCount: number;
};

type Campaign = {
  id: string;
  name: string;
  message: string;
  bonusPoints: number;
  status: "DRAFT" | "SENT";
  segmentName: string | null;
  recipientCount: number;
};

const RULE_LABEL: Record<Segment["ruleType"], string> = {
  INACTIVE_DAYS: "Inactive for at least (days)",
  MIN_LIFETIME_SPEND: "Lifetime spend at least (₹)",
  MIN_VISITS: "Approved visits at least",
};

export function CampaignsClient({
  initialSegments,
  initialCampaigns,
}: {
  initialSegments: Segment[];
  initialCampaigns: Campaign[];
}) {
  const router = useRouter();
  const [segments, setSegments] = useState(initialSegments);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [error, setError] = useState<string | null>(null);

  const [segName, setSegName] = useState("");
  const [ruleType, setRuleType] = useState<Segment["ruleType"]>("INACTIVE_DAYS");
  const [ruleValue, setRuleValue] = useState("30");
  const [segBusy, setSegBusy] = useState(false);

  const [campName, setCampName] = useState("");
  const [message, setMessage] = useState("");
  const [bonusPoints, setBonusPoints] = useState("0");
  const [segmentId, setSegmentId] = useState<string>("");
  const [campBusy, setCampBusy] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function createSegment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSegBusy(true);
    const res = await fetch("/api/staff/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: segName, ruleType, ruleValue: Number(ruleValue) }),
    });
    const data = await res.json();
    setSegBusy(false);
    if (!res.ok) return setError(data.error);
    setSegments((s) => [{ ...data.segment, matchCount: data.matchCount }, ...s]);
    setSegName("");
  }

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCampBusy(true);
    const res = await fetch("/api/staff/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: campName,
        message,
        bonusPoints: Number(bonusPoints) || 0,
        segmentId: segmentId || undefined,
      }),
    });
    const data = await res.json();
    setCampBusy(false);
    if (!res.ok) return setError(data.error);
    const segment = segments.find((s) => s.id === segmentId);
    setCampaigns((c) => [
      {
        id: data.campaign.id,
        name: data.campaign.name,
        message: data.campaign.message,
        bonusPoints: data.campaign.bonusPoints,
        status: data.campaign.status,
        segmentName: segment?.name ?? null,
        recipientCount: 0,
      },
      ...c,
    ]);
    setCampName("");
    setMessage("");
    setBonusPoints("0");
    setSegmentId("");
  }

  async function sendCampaign(id: string) {
    setError(null);
    setSendingId(id);
    const res = await fetch(`/api/staff/campaigns/${id}/send`, { method: "POST" });
    const data = await res.json();
    setSendingId(null);
    if (!res.ok) return setError(data.error);
    setCampaigns((c) =>
      c.map((camp) => (camp.id === id ? { ...camp, status: "SENT", recipientCount: data.recipientCount } : camp))
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">Segments</h2>
        <form onSubmit={createSegment} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              value={segName}
              onChange={(e) => setSegName(e.target.value)}
              placeholder="e.g. Lapsed regulars"
              className="col-span-2 rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            />
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as Segment["ruleType"])}
              className="rounded border border-stone-300 px-3 py-2 text-sm"
            >
              {Object.entries(RULE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              required
              type="number"
              min="1"
              value={ruleValue}
              onChange={(e) => setRuleValue(e.target.value)}
              className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            />
          </div>
          <button disabled={segBusy} className="self-start rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Create segment
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {segments.map((segment) => (
            <li key={segment.id} className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <div>
                <p className="font-medium">{segment.name}</p>
                <p className="text-xs text-stone-500">
                  {RULE_LABEL[segment.ruleType]}: {segment.ruleValue}
                </p>
              </div>
              <p className="font-mono tabular-nums text-rose-700">{segment.matchCount} matched</p>
            </li>
          ))}
          {segments.length === 0 && <p className="text-sm text-stone-500">No segments yet.</p>}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-stone-700">Campaigns</h2>
        <form onSubmit={createCampaign} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
          <input
            required
            value={campName}
            onChange={(e) => setCampName(e.target.value)}
            placeholder="Campaign name"
            className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
          />
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="We miss you! Come back this week for a bonus."
            className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="rounded border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">All members</option>
              {segments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.matchCount})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(e.target.value)}
              placeholder="Bonus points"
              className="rounded border border-stone-300 px-3 py-2 text-sm outline-none focus:border-rose-600"
            />
          </div>
          <button disabled={campBusy} className="self-start rounded bg-rose-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            Save as draft
          </button>
        </form>

        <ul className="flex flex-col gap-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{campaign.name}</p>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    campaign.status === "SENT" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {campaign.status}
                </span>
              </div>
              <p className="text-stone-600">{campaign.message}</p>
              <p className="text-xs text-stone-500">
                {campaign.segmentName ?? "All members"}
                {campaign.bonusPoints > 0 ? ` · +${campaign.bonusPoints} pts` : ""}
                {campaign.status === "SENT" ? ` · sent to ${campaign.recipientCount}` : ""}
              </p>
              {campaign.status === "DRAFT" && (
                <button
                  onClick={() => sendCampaign(campaign.id)}
                  disabled={sendingId === campaign.id}
                  className="self-start rounded bg-rose-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Send now
                </button>
              )}
            </li>
          ))}
          {campaigns.length === 0 && <p className="text-sm text-stone-500">No campaigns yet.</p>}
        </ul>
      </section>
    </div>
  );
}
