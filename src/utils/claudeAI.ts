/**
 * Claude AI Advisor — replaces Gemini throughout the app.
 * Uses the Anthropic /v1/messages API directly (no SDK needed).
 */

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === 'text');
  return textBlock?.text ?? '';
}

// ─── Strategy Race Insight ────────────────────────────────────────────────────

export async function getStrategyRaceInsight(params: {
  avalancheInterest: number;
  snowballInterest: number;
  avalancheMonths: number;
  snowballMonths: number;
  snowballFirstWin: number;
  avalancheFirstWin: number;
}): Promise<string> {
  const {
    avalancheInterest, snowballInterest,
    avalancheMonths, snowballFirstWin, avalancheFirstWin,
  } = params;
  const interestSaved = Math.round(snowballInterest - avalancheInterest);

  return callClaude(
    `You are a sharp, encouraging personal finance coach. 
     Speak in punchy, confident sentences — max 2 sentences total.
     No bullet points. No markdown. Sound like a live race update.`,
    `Avalanche saves $${interestSaved} in interest and finishes in ${avalancheMonths} months.
     Snowball gets the first card paid off in ${snowballFirstWin} months vs ${avalancheFirstWin} for Avalanche.
     Give a punchy 2-sentence race update. Pick a side or call it close.`,
    256
  );
}

// ─── Bright Plan (Full AI Strategy) ──────────────────────────────────────────

export async function getBrightPlan(params: {
  income: number;
  expenses: number;
  budget: number;
  totalDebt: number;
  preferredStrategy: string;
  cards: { name: string; balance: number; apr: number; min: number; promos: number }[];
}): Promise<string> {
  const { income, expenses, budget, totalDebt, preferredStrategy, cards } = params;

  return callClaude(
    `You are an elite personal finance strategist — direct, specific, and data-driven.
     Write in 3–4 punchy sentences. Reference specific cards by name.
     No bullet points. No markdown headers. Sound authoritative, not generic.`,
    `Financial snapshot:
     - Monthly income: $${income.toLocaleString()}
     - Monthly expenses: $${expenses.toLocaleString()}
     - Monthly debt budget: $${budget.toLocaleString()}
     - Total debt: $${totalDebt.toLocaleString()}
     - Current strategy: ${preferredStrategy}
     - Cards: ${JSON.stringify(cards)}

     Tell this person exactly where their next dollar should go.
     Should they stick with ${preferredStrategy} or pivot? Mention specific cards.
     Keep it punchy and professional (3–4 sentences max).`,
    512
  );
}

// ─── Calendar Day AI Summary ──────────────────────────────────────────────────

export async function getCalendarDaySummary(params: {
  date: string;
  events: { title: string; amount?: number; type: string }[];
  totalDebt: number;
  monthlyBudget: number;
}): Promise<string> {
  const { date, events, totalDebt, monthlyBudget } = params;

  return callClaude(
    `You are a concise financial calendar assistant.
     Summarize what this day means for the user's debt payoff in 1–2 sentences.
     Be specific and actionable. No markdown.`,
    `Date: ${date}
     Events: ${JSON.stringify(events)}
     Total debt: $${totalDebt.toLocaleString()}
     Monthly budget: $${monthlyBudget.toLocaleString()}
     
     What should the user know or do today?`,
    256
  );
}

// ─── Net Worth Insight ────────────────────────────────────────────────────────

export async function getNetWorthInsight(params: {
  totalDebt: number;
  totalAssets: number;
  netWorth: number;
  dti: number;
  monthlyIncome: number;
}): Promise<string> {
  const { totalDebt, totalAssets, netWorth, dti, monthlyIncome } = params;

  return callClaude(
    `You are a candid personal finance advisor. 
     Give a 2–3 sentence assessment of this person's financial health.
     Be honest but constructive. No markdown. No bullet points.`,
    `Financial health snapshot:
     - Total debt: $${totalDebt.toLocaleString()}
     - Total assets: $${totalAssets.toLocaleString()}
     - Net worth: $${netWorth.toLocaleString()}
     - Debt-to-income ratio: ${dti.toFixed(1)}%
     - Monthly income: $${monthlyIncome.toLocaleString()}
     
     Give a candid 2–3 sentence assessment and one specific action they should take.`,
    384
  );
}

// ─── Statement Scanner (image → card data) ────────────────────────────────────

export async function scanStatementImage(base64Data: string, mimeType: string): Promise<{
  bank?: string;
  name?: string;
  lastFour?: string;
  balance?: number;
  limit?: number;
  apr?: number;
  minPayment?: number;
  dueDate?: number;
  interestCharged?: number;
  statementDate?: string;
  promoAPR?: number;
  promoExpiry?: string;
  promoType?: string;
  promoAmount?: number;
  network?: string;
  accountType?: string;
}> {
  const isPDF = mimeType === 'application/pdf';

  // Build content array — PDFs use document type, images use image type
  const mediaContent = isPDF
    ? {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: base64Data,
        },
      }
    : {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: (
            ['image/jpeg','image/png','image/gif','image/webp'].includes(mimeType)
              ? mimeType
              : 'image/jpeg'
          ) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64Data,
        },
      };

  const extractPrompt = `Extract every piece of financial data from this credit card statement and return ONLY valid JSON with no markdown, no explanation:
{
  "bank": "issuing bank name",
  "name": "card product name",
  "lastFour": "last 4 digits as string",
  "balance": current balance as number,
  "limit": credit limit as number,
  "apr": purchase APR as number,
  "minPayment": minimum payment due as number,
  "dueDate": payment due day of month as integer 1-31,
  "interestCharged": interest charged this period as number (0 if none),
  "statementDate": closing date as "YYYY-MM-DD",
  "network": "Visa, MasterCard, American Express, Discover, or null",
  "accountType": "Credit Card, Buy Now Pay Later, Personal Loan, or PayPal Credit",
  "promoAPR": promotional rate as number or null,
  "promoExpiry": promo end date as "YYYY-MM-DD" or null,
  "promoType": "Balance Transfer, Deferred Interest, Purchase Promo, or null",
  "promoAmount": balance at promo rate as number or null
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: `You are an expert financial document parser. Extract data precisely. Return ONLY valid JSON, nothing else.`,
      messages: [
        {
          role: 'user',
          content: [mediaContent, { type: 'text' as const, text: extractPrompt }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? '{}';

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse Claude response as JSON');
  }
}
