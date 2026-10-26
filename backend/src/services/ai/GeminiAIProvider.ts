import {
  DestinationDiscoveryRequest,
  DestinationOption,
  Trip,
  ItineraryDay,
  Activity,
} from '../../types/index.js';
import { IAIProvider, GeneratedItineraryData } from './types.js';
import {
  aiDestinationsResponseSchema,
  aiItineraryResponseSchema,
} from '../../schemas/index.js';
import {
  buildDestinationDiscoveryPrompt,
  buildItineraryGenerationPrompt,
  buildDayRegenerationPrompt,
} from './prompts.js';
import { MockAIProvider } from './MockAIProvider.js';

export class GeminiAIProvider implements IAIProvider {
  public readonly name = 'google-gemini-free';
  private apiKey?: string;
  private model: string;
  private fallback: MockAIProvider;

  constructor(apiKey?: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.fallback = new MockAIProvider();
  }

  private cleanJson(raw: string): string {
    return raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  private async callGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000); // 18s timeout

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error [${response.status}]: ${errText}`);
    }

    const data: any = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  }

  public async recommendDestinations(
    request: DestinationDiscoveryRequest
  ): Promise<DestinationOption[]> {
    try {
      const prompt = buildDestinationDiscoveryPrompt(request);
      const raw = await this.callGemini(prompt);
      const cleaned = this.cleanJson(raw);
      const parsed = JSON.parse(cleaned);
      const validated = aiDestinationsResponseSchema.parse(parsed);
      return validated.recommendations;
    } catch (err: any) {
      console.warn(`[GeminiAIProvider] Fallback to Mock due to: ${err.message}`);
      return this.fallback.recommendDestinations(request);
    }
  }

  public async generateItinerary(trip: Trip): Promise<GeneratedItineraryData> {
    try {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const dayCount = Math.max(1, Math.min(14, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1));

      const prompt = buildItineraryGenerationPrompt(trip, dayCount);
      const raw = await this.callGemini(prompt);
      const cleaned = this.cleanJson(raw);
      const parsed = JSON.parse(cleaned);
      return aiItineraryResponseSchema.parse(parsed);
    } catch (err: any) {
      console.warn(`[GeminiAIProvider] Fallback to Mock due to: ${err.message}`);
      return this.fallback.generateItinerary(trip);
    }
  }

  public async regenerateDay(
    trip: Trip,
    day: ItineraryDay,
    feedback: string,
    preserveActivities: Activity[]
  ): Promise<Activity[]> {
    try {
      const prompt = buildDayRegenerationPrompt(trip, day, feedback, preserveActivities);
      const raw = await this.callGemini(prompt);
      const cleaned = this.cleanJson(raw);
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map((act, idx) => ({
          id: `gen-${Date.now()}-${idx}`,
          itinerary_day_id: day.id,
          name: act.name,
          description: act.description || '',
          category: act.category || 'sightseeing',
          start_time: act.start_time || '10:00',
          end_time: act.end_time || '12:00',
          location_name: act.location_name || trip.destination,
          latitude: act.latitude,
          longitude: act.longitude,
          estimated_cost: act.estimated_cost || 0,
          currency: act.currency || trip.currency || 'USD',
          estimated_duration_minutes: act.estimated_duration_minutes || 90,
          verification_status: act.verification_status || 'estimated',
          display_order: idx + 1,
        }));
      }
    } catch (err: any) {
      console.warn(`[GeminiAIProvider] Fallback to Mock day regeneration due to: ${err.message}`);
    }

    return this.fallback.regenerateDay(trip, day, feedback, preserveActivities);
  }
}
