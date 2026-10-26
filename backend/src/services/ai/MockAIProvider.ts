import {
  DestinationDiscoveryRequest,
  DestinationOption,
  Trip,
  ItineraryDay,
  Activity,
} from '../../types/index.js';
import { IAIProvider, GeneratedItineraryData } from './types.js';

export class MockAIProvider implements IAIProvider {
  public readonly name = 'mock-demo-ai';

  public async recommendDestinations(
    request: DestinationDiscoveryRequest
  ): Promise<DestinationOption[]> {
    const vibe = (request.travel_vibe || 'cultural').toLowerCase();
    const currency = request.currency || 'USD';
    const duration = request.duration_days || 7;

    const catalog: Record<string, DestinationOption[]> = {
      cultural: [
        {
          destination: 'Kyoto',
          country: 'Japan',
          match_score: 98,
          tagline: 'Centuries of tranquil temples, bamboo groves, and traditional tea ceremonies',
          highlights: ['Fushimi Inari Shrine', 'Arashiyama Bamboo Grove', 'Kinkaku-ji Golden Pavilion'],
          estimated_cost_range: `${currency} 1,600 - 2,400`,
          best_season: 'Spring (Cherry Blossoms) or Autumn',
          reasoning:
            'Exceptional match for cultural immersion with over 1,600 historic Buddhist temples and pristine heritage preservation.',
          suggested_duration_days: 6,
          accessibility_rating: 'Moderate (Historic stone paths)',
          estimated_budget_breakdown: {
            daily_accommodation: 110,
            daily_food: 45,
            daily_activities: 30,
            daily_transport: 15,
            total_estimated: 200 * duration,
            currency,
          },
        },
        {
          destination: 'Florence & Tuscany',
          country: 'Italy',
          match_score: 95,
          tagline: 'The birthplace of Renaissance masterworks, grand cathedrals, and Chianti hills',
          highlights: ['Uffizi Gallery', 'Duomo di Firenze', 'Ponte Vecchio'],
          estimated_cost_range: `${currency} 1,800 - 2,700`,
          best_season: 'May - June or September - October',
          reasoning:
            'Walkable historic city center packed with monumental art collections, world-renowned architecture, and authentic Tuscan cuisine.',
          suggested_duration_days: 7,
          accessibility_rating: 'High (Pedestrianized historic zone)',
          estimated_budget_breakdown: {
            daily_accommodation: 130,
            daily_food: 55,
            daily_activities: 40,
            daily_transport: 15,
            total_estimated: 240 * duration,
            currency,
          },
        },
        {
          destination: 'Oaxaca City',
          country: 'Mexico',
          match_score: 92,
          tagline: 'Indigenous textiles, colonial plazas, and the culinary capital of mole and mezcal',
          highlights: ['Monte Albán Zapotec Ruins', 'Santo Domingo Church', 'Mercado 20 de Noviembre'],
          estimated_cost_range: `${currency} 1,100 - 1,800`,
          best_season: 'October - March (Dry, festive season)',
          reasoning:
            'Rich indigenous craft heritage and vibrant culinary arts make it an affordable, high-yield cultural experience.',
          suggested_duration_days: 5,
          accessibility_rating: 'Moderate (Cobblestone sidewalks)',
          estimated_budget_breakdown: {
            daily_accommodation: 70,
            daily_food: 30,
            daily_activities: 20,
            daily_transport: 10,
            total_estimated: 130 * duration,
            currency,
          },
        },
        {
          destination: 'Prague',
          country: 'Czech Republic',
          match_score: 90,
          tagline: 'City of a Hundred Spires with Gothic bridges and fairytale castle grounds',
          highlights: ['Prague Castle complex', 'Charles Bridge at dawn', 'Old Town Astronomical Clock'],
          estimated_cost_range: `${currency} 1,300 - 2,000`,
          best_season: 'April - May or September - October',
          reasoning:
            'Intact medieval urban fabric and baroque courtyards with accessible public transit and affordable dining.',
          suggested_duration_days: 5,
          accessibility_rating: 'High (Extensive tram system)',
          estimated_budget_breakdown: {
            daily_accommodation: 90,
            daily_food: 35,
            daily_activities: 25,
            daily_transport: 10,
            total_estimated: 160 * duration,
            currency,
          },
        },
      ],
      adventure: [
        {
          destination: 'Queenstown & Southern Lakes',
          country: 'New Zealand',
          match_score: 99,
          tagline: 'The world capital of adrenaline, alpine fjords, and high-altitude hiking',
          highlights: ['Milford Sound cruise', 'Routeburn Track day hike', 'Remarkables mountain range'],
          estimated_cost_range: `${currency} 2,200 - 3,200`,
          best_season: 'December - March (Austral summer)',
          reasoning:
            'Unrivaled concentration of outdoor adventure sports and dramatic alpine glacial landscapes.',
          suggested_duration_days: 8,
          accessibility_rating: 'Moderate',
          estimated_budget_breakdown: {
            daily_accommodation: 150,
            daily_food: 50,
            daily_activities: 70,
            daily_transport: 30,
            total_estimated: 300 * duration,
            currency,
          },
        },
        {
          destination: 'Interlaken & Jungfrau',
          country: 'Switzerland',
          match_score: 96,
          tagline: 'Glacial valleys, paragliding over lakes, and high-alpine train ascents',
          highlights: ['Jungfraujoch Top of Europe', 'Lauterbrunnen 72 Waterfalls', 'First Cliff Walk'],
          estimated_cost_range: `${currency} 2,500 - 3,800`,
          best_season: 'June - September (Hiking season)',
          reasoning:
            'Unmatched mountaineering trails and lake adventures serviced by world-class Swiss cogwheel railways.',
          suggested_duration_days: 6,
          accessibility_rating: 'High (Accessible cable cars)',
          estimated_budget_breakdown: {
            daily_accommodation: 180,
            daily_food: 70,
            daily_activities: 80,
            daily_transport: 40,
            total_estimated: 370 * duration,
            currency,
          },
        },
        {
          destination: 'Patagonia (El Chaltén & Torres del Paine)',
          country: 'Argentina & Chile',
          match_score: 94,
          tagline: 'Jagged granite peaks, pristine turquoise lagoons, and wild windswept steppes',
          highlights: ['Mount Fitz Roy trek', 'Perito Moreno Glacier boardwalk', 'Laguna de los Tres'],
          estimated_cost_range: `${currency} 1,900 - 2,800`,
          best_season: 'November - March',
          reasoning:
            'World-class trekking capital with direct trailheads accessible right from town lodges.',
          suggested_duration_days: 9,
          accessibility_rating: 'Challenging (Rugged mountain terrain)',
          estimated_budget_breakdown: {
            daily_accommodation: 120,
            daily_food: 45,
            daily_activities: 50,
            daily_transport: 25,
            total_estimated: 240 * duration,
            currency,
          },
        },
        {
          destination: 'Reykjavik & Golden Circle',
          country: 'Iceland',
          match_score: 93,
          tagline: 'Land of active geysers, tectonic rifts, black sand beaches, and geothermal pools',
          highlights: ['Thingvellir National Park', 'Gullfoss Waterfall', 'Blue Lagoon hot springs'],
          estimated_cost_range: `${currency} 2,100 - 3,100`,
          best_season: 'June - August (Midnight Sun) or Oct - March (Northern Lights)',
          reasoning:
            'Diverse volcanic geology and geothermal wonders with reliable ring road driving infrastructure.',
          suggested_duration_days: 7,
          accessibility_rating: 'Moderate',
          estimated_budget_breakdown: {
            daily_accommodation: 160,
            daily_food: 65,
            daily_activities: 55,
            daily_transport: 35,
            total_estimated: 315 * duration,
            currency,
          },
        },
      ],
      relaxed: [
        {
          destination: 'Kyoto & Lake Biwa',
          country: 'Japan',
          match_score: 95,
          tagline: 'Quiet temple gardens, riverside strolls, and restorative ryokan hospitality',
          highlights: ['Philosopher’s Path walk', 'Daitoku-ji Zen rock garden', 'Lake Biwa scenic cruise'],
          estimated_cost_range: `${currency} 1,700 - 2,400`,
          best_season: 'October - November or April',
          reasoning: 'Calm morning rhythms, peaceful botanical courtyards, and world-class matcha cafes.',
          suggested_duration_days: 6,
          accessibility_rating: 'High',
          estimated_budget_breakdown: {
            daily_accommodation: 120,
            daily_food: 50,
            daily_activities: 30,
            daily_transport: 15,
            total_estimated: 215 * duration,
            currency,
          },
        },
        {
          destination: 'Lake Como & Bellagio',
          country: 'Italy',
          match_score: 97,
          tagline: 'Serene mountain-rimmed waters, neoclassical botanical villas, and waterfront spritzes',
          highlights: ['Villa Carlotta gardens', 'Ferry between Bellagio & Varenna', 'Waterfront promenades'],
          estimated_cost_range: `${currency} 2,000 - 3,000`,
          best_season: 'May - June or September',
          reasoning: 'Relaxed pacing centered around leisurely public ferries, lakeside gardens, and slow dining.',
          suggested_duration_days: 5,
          accessibility_rating: 'Moderate (Steps in hill villages)',
          estimated_budget_breakdown: {
            daily_accommodation: 160,
            daily_food: 60,
            daily_activities: 35,
            daily_transport: 20,
            total_estimated: 275 * duration,
            currency,
          },
        },
        {
          destination: 'Chiang Mai',
          country: 'Thailand',
          match_score: 93,
          tagline: 'Misty green mountains, tranquil boutique sanctuaries, and night bazaar strolls',
          highlights: ['Wat Umong forest temple', 'Artisan coffee roasters in Nimman', 'Botanical gardens'],
          estimated_cost_range: `${currency} 900 - 1,500`,
          best_season: 'November - February (Cool, clear season)',
          reasoning: 'Ultra-gentle pace, gentle wellness retreats, and very affordable high-comfort living.',
          suggested_duration_days: 7,
          accessibility_rating: 'Moderate',
          estimated_budget_breakdown: {
            daily_accommodation: 50,
            daily_food: 20,
            daily_activities: 20,
            daily_transport: 10,
            total_estimated: 100 * duration,
            currency,
          },
        },
        {
          destination: 'San Sebastián',
          country: 'Spain',
          match_score: 91,
          tagline: 'Golden shell beaches, coastal promenade walks, and pintxos tavern grazing',
          highlights: ['La Concha Beach promenade', 'Monte Urgull vantage point', 'Old Quarter pintxos bars'],
          estimated_cost_range: `${currency} 1,600 - 2,500`,
          best_season: 'June - September',
          reasoning: 'Compact, beachside bliss that merges unhurried beach leisure with European culinary excellence.',
          suggested_duration_days: 5,
          accessibility_rating: 'High (Flat beachside promenades)',
          estimated_budget_breakdown: {
            daily_accommodation: 130,
            daily_food: 50,
            daily_activities: 25,
            daily_transport: 15,
            total_estimated: 220 * duration,
            currency,
          },
        },
      ],
    };

    const selectedOptions = catalog[vibe] || catalog.cultural;
    return selectedOptions;
  }

  public async generateItinerary(trip: Trip): Promise<GeneratedItineraryData> {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const dayCount = Math.max(1, Math.min(14, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1));
    const currency = trip.currency || 'USD';
    const destination = trip.destination || 'Paris';

    // Tailored landmark libraries based on destination match
    const destLower = destination.toLowerCase();
    const isTokyo = destLower.includes('tokyo') || destLower.includes('japan');
    const isKyoto = destLower.includes('kyoto');
    const isRome = destLower.includes('rome') || destLower.includes('italy');
    const isBarcelona = destLower.includes('barcelona') || destLower.includes('spain');
    const isNewYork = destLower.includes('new york') || destLower.includes('nyc');

    const days: any[] = [];
    let runningCost = 0;

    for (let dayNum = 1; dayNum <= dayCount; dayNum++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + (dayNum - 1));
      const dateString = currentDate.toISOString().split('T')[0];

      let daySummary = `Day ${dayNum}: Exploration of iconic landmarks, neighborhood culture, and local food.`;
      let activities: any[] = [];

      if (isTokyo) {
        if (dayNum === 1) {
          daySummary = 'Arrival, Asakusa historic district, and Senso-ji temple grounds.';
          activities = [
            {
              name: 'Senso-ji Temple & Nakamise-dori',
              description: 'Explore Tokyo’s oldest Buddhist temple and browse traditional artisan street snacks.',
              category: 'cultural',
              start_time: '09:30',
              end_time: '11:45',
              location_name: 'Asakusa, Taito City',
              latitude: 35.7148,
              longitude: 139.7967,
              estimated_cost: 0,
              currency,
              estimated_duration_minutes: 135,
              verification_status: 'verified',
            },
            {
              name: 'Authentic Tempura Lunch at Daikokuya',
              description: 'Historic Edo-style tempura bowl dining near temple gate.',
              category: 'dining',
              start_time: '12:00',
              end_time: '13:15',
              location_name: '1-38-10 Asakusa',
              latitude: 35.7135,
              longitude: 139.7954,
              estimated_cost: 22,
              currency,
              estimated_duration_minutes: 75,
              verification_status: 'estimated',
            },
            {
              name: 'Sumida River Walk & Tokyo Skytree View',
              description: 'Scenic riverside stroll with dramatic skyline panoramas across the bridges.',
              category: 'sightseeing',
              start_time: '14:00',
              end_time: '16:00',
              location_name: 'Sumida River Waterfront',
              latitude: 35.7101,
              longitude: 139.8015,
              estimated_cost: 0,
              currency,
              estimated_duration_minutes: 120,
              verification_status: 'verified',
            },
          ];
        } else {
          daySummary = `Day ${dayNum}: Shibuya Crossing, Meiji Jingu shrine, and Omotesando architecture.`;
          activities = [
            {
              name: 'Meiji Jingu Shrine & Forest Path',
              description: 'Shaded morning walk under towering cypress Torii gates into serene Shinto sanctuary.',
              category: 'cultural',
              start_time: '09:00',
              end_time: '11:00',
              location_name: 'Yoyogi Park, Shibuya',
              latitude: 35.6764,
              longitude: 139.6993,
              estimated_cost: 0,
              currency,
              estimated_duration_minutes: 120,
              verification_status: 'verified',
            },
            {
              name: 'Shibuya Sky & Scramble Crossing',
              description: 'Witness the world’s busiest pedestrian crossing from street level and rooftop deck.',
              category: 'sightseeing',
              start_time: '11:30',
              end_time: '13:30',
              location_name: 'Shibuya Crossing',
              latitude: 35.6595,
              longitude: 139.7004,
              estimated_cost: 18,
              currency,
              estimated_duration_minutes: 120,
              verification_status: 'verified',
            },
            {
              name: 'Tonkatsu Dining & Cat Street Wandering',
              description: 'Crispy panko pork cutlet lunch followed by pedestrian boutique discovery.',
              category: 'dining',
              start_time: '14:00',
              end_time: '16:30',
              location_name: 'Cat Street, Harajuku',
              latitude: 35.6662,
              longitude: 139.7061,
              estimated_cost: 25,
              currency,
              estimated_duration_minutes: 150,
              verification_status: 'estimated',
            },
          ];
        }
      } else if (isRome) {
        daySummary = `Day ${dayNum}: Ancient Roman Forum, Colosseum, and Piazza Navona evening stroll.`;
        activities = [
          {
            name: 'Colosseum & Roman Forum Walk',
            description: 'Walk through the center of ancient Roman civic and gladiatorial history.',
            category: 'sightseeing',
            start_time: '09:00',
            end_time: '12:00',
            location_name: 'Piazza del Colosseo',
            latitude: 41.8902,
            longitude: 12.4922,
            estimated_cost: 24,
            currency,
            estimated_duration_minutes: 180,
            verification_status: 'verified',
          },
          {
            name: 'Trattoria Lunch in Monti',
            description: 'Handmade cacio e pepe pasta and espresso in the artisan cobblestone alleys.',
            category: 'dining',
            start_time: '12:30',
            end_time: '14:00',
            location_name: 'Rione Monti, Rome',
            latitude: 41.8945,
            longitude: 12.4912,
            estimated_cost: 28,
            currency,
            estimated_duration_minutes: 90,
            verification_status: 'estimated',
          },
          {
            name: 'Pantheon & Piazza Navona Golden Hour',
            description: 'Marvel at the ancient unreinforced concrete dome followed by Bernini fountain views.',
            category: 'cultural',
            start_time: '15:00',
            end_time: '17:30',
            location_name: 'Piazza della Rotonda',
            latitude: 41.8986,
            longitude: 12.4769,
            estimated_cost: 5,
            currency,
            estimated_duration_minutes: 150,
            verification_status: 'verified',
          },
        ];
      } else {
        // Paris / Universal default
        daySummary = `Day ${dayNum}: Historic city center, world-class museum galleries, and riverside cafe culture.`;
        activities = [
          {
            name: `Morning Landmark Discovery: ${dayNum === 1 ? 'Eiffel Tower & Champ de Mars' : 'Louvre Courtyard & Tuileries'}`,
            description: 'Iconic architectural marvel and manicured public gardens with morning photo light.',
            category: 'sightseeing',
            start_time: '09:30',
            end_time: '12:00',
            location_name: dayNum === 1 ? 'Champ de Mars, 7th arr.' : 'Palais-Royal / Louvre, 1st arr.',
            latitude: dayNum === 1 ? 48.8584 : 48.8606,
            longitude: dayNum === 1 ? 2.2945 : 2.3376,
            estimated_cost: 20,
            currency,
            estimated_duration_minutes: 150,
            verification_status: 'verified',
          },
          {
            name: 'Bistro Lunch & Fresh Pastries',
            description: 'Seasonal quiche, croque monsieur, and freshly brewed cafe au lait.',
            category: 'dining',
            start_time: '12:30',
            end_time: '14:00',
            location_name: 'Neighborhood Bistro',
            latitude: 48.855,
            longitude: 2.34,
            estimated_cost: 25,
            currency,
            estimated_duration_minutes: 90,
            verification_status: 'estimated',
          },
          {
            name: 'Historic Quarter Walk & Scenic Viewpoint',
            description: 'Pedestrian-friendly streets, historic bookstores, and sunset panoramas.',
            category: 'cultural',
            start_time: '15:00',
            end_time: '17:30',
            location_name: 'Latin Quarter & Seine Banks',
            latitude: 48.852,
            longitude: 2.345,
            estimated_cost: 10,
            currency,
            estimated_duration_minutes: 150,
            verification_status: 'verified',
          },
        ];
      }

      const dayTotalCost = activities.reduce((sum, act) => sum + act.estimated_cost, 0);
      runningCost += dayTotalCost;

      days.push({
        day_number: dayNum,
        date: dateString,
        summary: daySummary,
        notes: 'Wear comfortable walking footwear and keep contactless payment handy.',
        activities,
      });
    }

    const accommodationTotal = Math.round(120 * dayCount);
    const diningTotal = Math.round(60 * dayCount);
    const transitTotal = Math.round(20 * dayCount);
    const activitiesTotal = Math.round(runningCost);
    const buffer = 100;
    const grandTotal = accommodationTotal + diningTotal + transitTotal + activitiesTotal + buffer;

    return {
      trip_title: trip.title,
      destination: trip.destination,
      overall_summary: `A carefully calibrated ${dayCount}-day journey through ${trip.destination}, designed to balance landmark immersion, restful pacing, and authentic regional gastronomy without rushed schedules.`,
      total_estimated_cost: grandTotal,
      currency,
      estimated_budget_breakdown: {
        accommodation: accommodationTotal,
        activities: activitiesTotal,
        food_and_dining: diningTotal,
        local_transit: transitTotal,
        buffer,
        currency,
      },
      practical_tips: [
        'Purchase city transit passes on your first morning to streamline subway and bus travel.',
        'Reserve museum entry time slots 48 hours in advance to bypass long ticket lines.',
        'Carry a compact refillable water bottle and comfortable walking shoes for cobblestones.',
      ],
      days,
    };
  }

  public async regenerateDay(
    trip: Trip,
    day: ItineraryDay,
    feedback: string,
    preserveActivities: Activity[]
  ): Promise<Activity[]> {
    const currency = trip.currency || 'USD';
    const feedbackLower = feedback.toLowerCase();

    const isFoodFocused = feedbackLower.includes('food') || feedbackLower.includes('dining') || feedbackLower.includes('culinary');
    const isRelaxed = feedbackLower.includes('relax') || feedbackLower.includes('chill') || feedbackLower.includes('nature');

    const newActivities: Activity[] = [];

    // Keep preserved activities
    for (const act of preserveActivities) {
      newActivities.push({ ...act });
    }

    if (isFoodFocused) {
      newActivities.push({
        id: `gen-${Date.now()}-1`,
        itinerary_day_id: day.id,
        name: 'Artisan Farmers Market & Tastings',
        description: `Explore local specialty stalls sampling regional cheeses, seasonal fruits, and warm baked bread tailored to: ${feedback}`,
        category: 'dining',
        start_time: '10:00',
        end_time: '12:00',
        location_name: `${trip.destination} Central Market`,
        latitude: 48.865,
        longitude: 2.348,
        estimated_cost: 30,
        currency,
        estimated_duration_minutes: 120,
        verification_status: 'verified',
        display_order: newActivities.length + 1,
      });
      newActivities.push({
        id: `gen-${Date.now()}-2`,
        itinerary_day_id: day.id,
        name: 'Hidden Courtyard Wine & Tapas Bar',
        description: 'Tasting of local small plates and cellar reserves in an intimate garden terrace.',
        category: 'dining',
        start_time: '13:00',
        end_time: '14:45',
        location_name: 'Historic Quarter Passage',
        latitude: 48.857,
        longitude: 2.352,
        estimated_cost: 35,
        currency,
        estimated_duration_minutes: 105,
        verification_status: 'estimated',
        display_order: newActivities.length + 2,
      });
    } else if (isRelaxed) {
      newActivities.push({
        id: `gen-${Date.now()}-1`,
        itinerary_day_id: day.id,
        name: 'Botanical Garden Morning Respite',
        description: `Peaceful walking paths, lush glasshouses, and quiet benches based on request: "${feedback}".`,
        category: 'nature',
        start_time: '10:00',
        end_time: '12:30',
        location_name: `${trip.destination} Royal Botanical Gardens`,
        latitude: 48.842,
        longitude: 2.361,
        estimated_cost: 12,
        currency,
        estimated_duration_minutes: 150,
        verification_status: 'verified',
        display_order: newActivities.length + 1,
      });
      newActivities.push({
        id: `gen-${Date.now()}-2`,
        itinerary_day_id: day.id,
        name: 'Riverside Reading & Tea Room',
        description: 'Unwind with specialty herbal tea, pastries, and tranquil water views.',
        category: 'leisure',
        start_time: '14:00',
        end_time: '16:00',
        location_name: 'Riverside Promenade',
        latitude: 48.851,
        longitude: 2.355,
        estimated_cost: 18,
        currency,
        estimated_duration_minutes: 120,
        verification_status: 'estimated',
        display_order: newActivities.length + 2,
      });
    } else {
      newActivities.push({
        id: `gen-${Date.now()}-1`,
        itinerary_day_id: day.id,
        name: `Custom Experience: ${feedback.slice(0, 35)}`,
        description: `Customized itinerary stop tailored to your guidance: "${feedback}".`,
        category: 'sightseeing',
        start_time: '10:30',
        end_time: '13:00',
        location_name: `${trip.destination} City Center`,
        latitude: 48.858,
        longitude: 2.342,
        estimated_cost: 20,
        currency,
        estimated_duration_minutes: 150,
        verification_status: 'estimated',
        display_order: newActivities.length + 1,
      });
      newActivities.push({
        id: `gen-${Date.now()}-2`,
        itinerary_day_id: day.id,
        name: 'Neighborhood Exploration & Sunset View',
        description: 'Atmospheric evening discovery with panoramic city vistas.',
        category: 'sightseeing',
        start_time: '16:00',
        end_time: '18:00',
        location_name: `${trip.destination} Lookout Point`,
        latitude: 48.862,
        longitude: 2.338,
        estimated_cost: 10,
        currency,
        estimated_duration_minutes: 120,
        verification_status: 'verified',
        display_order: newActivities.length + 2,
      });
    }

    return newActivities.map((act, idx) => ({ ...act, display_order: idx + 1 }));
  }
}
