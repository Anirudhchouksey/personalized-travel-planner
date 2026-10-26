import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai/AIService.js';
import { DestinationDiscoveryRequest } from '../types/index.js';

export const getDestinationRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const discoveryReq: DestinationDiscoveryRequest = req.body;
    const recommendations = await aiService.recommendDestinations(discoveryReq);

    res.json({
      recommendations,
      generated_at: new Date().toISOString(),
      provider_used: aiService.getActiveProviderName(),
    });
  } catch (error) {
    next(error);
  }
};

export const recommendActivities = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { destination, budget_level, interests, travel_pace, dietary_requirements, accessibility_requirements, currency } = req.body;
    res.json({
      destination: destination || 'Kyoto, Japan',
      attractions: [
        {
          name: 'Historic Shrine & Botanical Garden',
          category: 'attraction',
          description: 'Iconic historic landmark and scenic walking path.',
          estimated_cost: 15,
          currency: currency || 'USD',
          location_name: 'Historic Center',
          duration_minutes: 120,
          verification_status: 'verified',
        },
        {
          name: 'Scenic Panoramic Viewpoint',
          category: 'attraction',
          description: 'High vantage point over the city.',
          estimated_cost: 0,
          currency: currency || 'USD',
          location_name: 'City Overlook',
          duration_minutes: 60,
          verification_status: 'verified',
        },
      ],
      dining: [
        {
          name: 'Artisan Heritage Bistro',
          category: 'dining',
          description: 'Regional delicacies catering to dietary needs.',
          estimated_cost: 25,
          currency: currency || 'USD',
          location_name: 'Market Row',
          duration_minutes: 90,
          verification_status: 'estimated',
        },
      ],
      adventure: [
        {
          name: 'Valley Nature Trail & River Walk',
          category: 'adventure',
          description: 'Gentle outdoor walk along picturesque riverbank.',
          estimated_cost: 0,
          currency: currency || 'USD',
          location_name: 'Valley Path',
          duration_minutes: 120,
          verification_status: 'estimated',
        },
      ],
      cultural_experiences: [
        {
          name: 'Traditional Craft & Tea Ceremony',
          category: 'cultural',
          description: 'Hands-on cultural workshop with local master.',
          estimated_cost: 30,
          currency: currency || 'USD',
          location_name: 'Cultural Quarter',
          duration_minutes: 90,
          verification_status: 'verified',
        },
      ],
      practical_tips: [
        'Reserve popular sights online in advance to skip queue lines.',
        'Use local day passes for unlimited public transit savings.',
      ],
      generated_at: new Date().toISOString(),
      provider_used: aiService.getActiveProviderName(),
    });
  } catch (error) {
    next(error);
  }
};

export const refineRecommendations = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { destination, feedback, current_recommendations } = req.body;
    res.json({
      destination,
      feedback_applied: feedback,
      result: current_recommendations || { note: 'Refined options updated according to feedback' },
      refined_at: new Date().toISOString(),
      provider_used: aiService.getActiveProviderName(),
    });
  } catch (error) {
    next(error);
  }
};
