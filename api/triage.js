// BlakeOS Command Center — Claude Triage
// Vercel serverless function. Requires ANTHROPIC_API_KEY set in Vercel env vars.
// The key lives server-side only — it is never shipped in the frontend bundle.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy.',
    });
  }

  const { todayKey, focus, missions = [], items = [] } = req.body || {};
  if (!items.length) {
    return res.status(200).json({
      headline: 'The board is clear — nothing open to triage.',
      top3: [], blockers: [], schedule: [], warnings: [],
    });
  }

  const prompt = `You are the Chief of Staff for a personal life operating system. Today is ${todayKey}.

Your job: triage the open board. Be direct and decisive. Priority is your call to propose — the user approves.

TODAY'S FOCUS (may be placeholder text if unset):
${JSON.stringify(focus)}

GOALS (missions, with optional target dates):
${JSON.stringify(missions)}

OPEN ITEMS (tasks and open loops — problems, decisions, waiting-on):
${JSON.stringify(items)}

Rules:
- Respond with ONLY a valid JSON object. No markdown fences, no preamble, no trailing text.
- Only reference ids that appear in OPEN ITEMS.
- All dates must be YYYY-MM-DD, today (${todayKey}) or later.
- "top3": the 3 items that matter most today, ordered. Weigh: overdue dates, goal target dates, staleness (daysOld), blockers on other work, and energy (High-energy items early). Give a one-sentence reason each.
- "blockers": items in waiting-on or otherwise stuck that are silently blocking progress. Short note on what to do (follow up, escalate, drop).
- "schedule": propose due dates ONLY for items that currently have dueDate null. Spread realistically — max 3 items per day, respect goal target dates by working backward. Skip items that genuinely can't be scheduled yet.
- "warnings": 0-3 short strings — stale decisions, overloaded days, goals with no linked work, drift from today's stated focus.

JSON shape:
{
  "headline": "one sentence: the honest read on this board right now",
  "top3": [{ "id": "...", "reason": "..." }],
  "blockers": [{ "id": "...", "note": "..." }],
  "schedule": [{ "id": "...", "date": "YYYY-MM-DD", "reason": "..." }],
  "warnings": ["..."]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || 'Anthropic API error' });
    }

    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const clean = text.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return res.status(502).json({ error: 'Triage returned unparseable output. Re-run it.' });
    }

    return res.status(200).json({
      headline: typeof parsed.headline === 'string' ? parsed.headline : '',
      top3: Array.isArray(parsed.top3) ? parsed.top3.slice(0, 3) : [],
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 3) : [],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Triage request failed' });
  }
}
