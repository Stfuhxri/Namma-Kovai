/**
 * AI Routing Service — Namma Kovai
 *
 * Architecture: The app resolves real data (weather, traffic, matching buses)
 * locally, then passes that context to Groq's LLM which generates ONLY
 * a friendly conversational sentence. All structured data stays app-side.
 */

import { SIMULATION_ROUTES } from './busRoutesData';

// ⚠️  Add your Groq API key here. Never commit real keys to git.
const API_KEY = process.env.GROQ_API_KEY ?? '';
const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 2;

// ─── Exported Types ─────────────────────────────────────────────────────────

export interface RouteStep {
  step_number: number;
  mode: 'WALK' | 'BUS';
  instruction: string;
  duration_min?: number;
}

export interface AIRouteResult {
  summary_title: string;
  total_time_min: number;
  primary_bus: string;
  has_weather_warning: boolean;
  weather_alert: string | null;
  weather: string;
  traffic: string;
  steps: RouteStep[];
}

export interface AIResponse {
  aiMessage: string;
  routeData: AIRouteResult;
}

// ─── Local Data Resolution ──────────────────────────────────────────────────

function findMatchingBuses(query: string) {
  const q = query.toLowerCase();
  const matches = SIMULATION_ROUTES.filter(route => {
    // Check if any stop name matches the query
    const hasMatchingStop = route.stops.some(stop =>
      stop.name.toLowerCase().includes(q) ||
      (stop.nameTa && stop.nameTa.includes(query))
    );
    // Also check route name
    const nameMatch = route.name.toLowerCase().includes(q);
    return hasMatchingStop || nameMatch;
  });

  if (matches.length > 0) return matches;

  // Fallback: return first 2 routes as "nearby" suggestions
  return SIMULATION_ROUTES.slice(0, 2);
}

function resolveContext(query: string) {
  // Mock weather/traffic (replace with real API calls in production)
  const weathers = ['Sunny & Clear', 'Moderate Rain', 'Cloudy', 'Heavy Thunderstorms', 'Partly Cloudy'];
  const traffics = ['Heavy Traffic', 'Light Traffic', 'Moderate Congestion', 'Smooth Flow'];

  const weather = weathers[Math.floor(Math.random() * weathers.length)];
  const traffic = traffics[Math.floor(Math.random() * traffics.length)];
  const isRaining = weather.includes('Rain') || weather.includes('Thunderstorms');

  const matchingBuses = findMatchingBuses(query);
  const primaryRoute = matchingBuses[0];
  const primaryBus = primaryRoute.routeNumber;

  // Calculate estimated travel time based on stops + traffic
  const baseTime = primaryRoute.stops.length * 8; // ~8 min per stop
  const trafficPenalty = traffic.includes('Heavy') ? 15 : traffic.includes('Moderate') ? 5 : 0;
  const totalTime = baseTime + trafficPenalty;

  // Build steps from the matched route's stops
  const steps: RouteStep[] = [
    { step_number: 1, mode: 'WALK', instruction: `Walk to ${primaryRoute.stops[0].name}`, duration_min: 5 },
    ...primaryRoute.stops.slice(0, -1).map((stop, i) => ({
      step_number: i + 2,
      mode: 'BUS' as const,
      instruction: `Board Bus ${primaryBus} at ${stop.name}`,
      duration_min: 8,
    })),
    { step_number: primaryRoute.stops.length + 1, mode: 'WALK' as const, instruction: `Walk to ${query}`, duration_min: 5 },
  ];

  const routeData: AIRouteResult = {
    summary_title: matchingBuses.length > 1
      ? `Via Bus ${primaryBus} (${matchingBuses.length} options)`
      : `Direct via Bus ${primaryBus}`,
    total_time_min: totalTime,
    primary_bus: primaryBus,
    has_weather_warning: isRaining,
    weather_alert: isRaining ? `⛈ ${weather} — carry an umbrella!` : null,
    weather,
    traffic,
    steps,
  };

  const allBusNumbers = matchingBuses.map(r => r.routeNumber).join(', ');

  return { weather, traffic, routeData, allBusNumbers, primaryRoute };
}

// ─── Groq API Call with Retry ───────────────────────────────────────────────

async function callGroqWithRetry(systemPrompt: string, userMessage: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.warn(`Groq API error (attempt ${attempt + 1}):`, data.error.message || data.error);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // backoff
          continue;
        }
        return null;
      }

      return data.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
      console.warn(`Groq fetch error (attempt ${attempt + 1}):`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return null;
    }
  }
  return null;
}

// ─── Main Export ────────────────────────────────────────────────────────────

export async function getAIRoute(query: string): Promise<AIResponse | null> {
  try {
    const { weather, traffic, routeData, allBusNumbers, primaryRoute } = resolveContext(query);

    const systemPrompt = `You are a friendly, concise Coimbatore public transit assistant.
The user wants to go to "${query}". Here is real-time data:
• Weather: ${weather}
• Traffic: ${traffic}
• Available buses: ${allBusNumbers} (best: ${routeData.primary_bus})
• Route: ${primaryRoute.name}
• Estimated time: ~${routeData.total_time_min} min

Write exactly 1–2 SHORT, friendly sentences recommending the best bus to take.
Mention the weather, traffic, and bus number naturally. Keep it conversational and helpful.
Do NOT output JSON, lists, or bullet points. Just a natural sentence.`;

    const aiMessage = await callGroqWithRetry(
      systemPrompt,
      `How do I get to ${query}?`
    );

    // Fallback message if Groq API is overloaded or unavailable
    const finalMessage = aiMessage ||
      `To reach ${query}, take Bus ${routeData.primary_bus} (${primaryRoute.name}). Current weather is ${weather} with ${traffic.toLowerCase()} on the roads. Estimated travel time: ~${routeData.total_time_min} min.`;

    return {
      aiMessage: finalMessage,
      routeData,
    };
  } catch (error) {
    console.error('Error in getAIRoute:', error);
    return null;
  }
}
