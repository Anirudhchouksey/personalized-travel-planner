import { config } from '../../config/index.js';
import { IAIProvider } from './types.js';
import { MockAIProvider } from './MockAIProvider.js';
import { GeminiAIProvider } from './GeminiAIProvider.js';
import { GroqAIProvider } from './GroqAIProvider.js';
import {
  DestinationDiscoveryRequest,
  DestinationOption,
  Trip,
  ItineraryDay,
  Activity,
} from '../../types/index.js';
import { GeneratedItineraryData } from './types.js';

export class AIService {
  private activeProvider: IAIProvider;
  private providerName: string;

  constructor() {
    const selected = config.ai.provider;

    if (selected === 'gemini' && config.ai.geminiApiKey) {
      this.activeProvider = new GeminiAIProvider(config.ai.geminiApiKey, config.ai.geminiModel);
      this.providerName = 'Google Gemini (Free Tier)';
    } else if (selected === 'groq' && config.ai.groqApiKey) {
      this.activeProvider = new GroqAIProvider(config.ai.groqApiKey, config.ai.groqModel);
      this.providerName = 'Groq Cloud (Free Tier)';
    } else {
      this.activeProvider = new MockAIProvider();
      this.providerName = 'Mock AI (Built-in Demo Mode)';
    }
  }

  public getActiveProviderName(): string {
    return this.providerName;
  }

  public async recommendDestinations(req: DestinationDiscoveryRequest): Promise<DestinationOption[]> {
    return this.activeProvider.recommendDestinations(req);
  }

  public async generateItinerary(trip: Trip): Promise<GeneratedItineraryData> {
    return this.activeProvider.generateItinerary(trip);
  }

  public async regenerateDay(
    trip: Trip,
    day: ItineraryDay,
    feedback: string,
    preserveActivities: Activity[]
  ): Promise<Activity[]> {
    return this.activeProvider.regenerateDay(trip, day, feedback, preserveActivities);
  }
}

export const aiService = new AIService();
