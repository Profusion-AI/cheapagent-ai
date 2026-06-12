import { recordDailyMetrics } from "./lib/metrics.mjs";

// useful/not-useful capture (30-day plan, Phase 4.5): one explicit button
// click sends exactly one bit. No identity, no document content, no cookie —
// the request body is `{"useful": true|false}` and nothing else is read from
// it. Anonymous use of the workbench still makes no network requests except
// the ones a person explicitly triggers; this endpoint exists only for that
// explicit click and is disclosed on the privacy page.
export const config = { path: "/api/feedback" };

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only." }), { status: 405, headers });
  }
  let useful;
  try {
    ({ useful } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Request body must be JSON." }), { status: 400, headers });
  }
  if (typeof useful !== "boolean") {
    return new Response(JSON.stringify({ error: "useful must be true or false." }), { status: 400, headers });
  }

  // Best-effort and production-gated inside the helper.
  await recordDailyMetrics(useful ? { feedback_useful: 1 } : { feedback_not_useful: 1 });

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
