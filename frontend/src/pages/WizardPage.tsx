import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Sparkles,
  Check,
  Heart,
  Mountain,
  Coffee,
  Camera,
  Utensils,
  Footprints,
  Train,
  Car,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { TripCreate } from '../types';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initial values, prefilled if redirected from Discover
  const prefillDest = searchParams.get('destination') || '';
  const prefillVibe = searchParams.get('vibe') || 'cultural';

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard Form State
  const [destination, setDestination] = useState(prefillDest);
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-05');
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState<number>(2500);
  const [currency, setCurrency] = useState('USD');
  const [travelVibe, setTravelVibe] = useState(prefillVibe);
  const [travelPace, setTravelPace] = useState<'relaxed' | 'moderate' | 'fast'>('moderate');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Sightseeing & Landmarks',
    'Local Gastronomy & Food Tours',
    'Art & History Museums',
  ]);
  const [transportation, setTransportation] = useState<string[]>(['Walking', 'Public Transit']);
  const [dietary, setDietary] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Available options
  const vibeOptions = [
    { id: 'cultural', name: 'Cultural', desc: 'Museums, historic landmarks, local traditions, architecture' },
    { id: 'adventure', name: 'Adventure', desc: 'Active exploration, hiking, outdoor adrenaline, hidden trails' },
    { id: 'relaxed', name: 'Relaxed', desc: 'Slow mornings, scenic cafes, parks, gentle wanderings' },
    { id: 'romantic', name: 'Romantic', desc: 'Charming views, cozy bistros, atmospheric evening walks' },
    { id: 'luxury', name: 'Luxury', desc: 'Curated fine dining, upscale venues, refined experiences' },
    { id: 'nature', name: 'Nature & Scenic', desc: 'National parks, botanical gardens, coastal vistas' },
    { id: 'family-friendly', name: 'Family-Friendly', desc: 'Accessible venues, interactive exhibits, kid-safe pacing' },
    { id: 'budget-friendly', name: 'Budget-Friendly', desc: 'Free attractions, affordable local eateries, smart passes' },
  ];

  const paceOptions = [
    { id: 'relaxed', name: 'Relaxed', desc: '2-3 activities per day. Ample downtime for cafes & wandering.' },
    { id: 'moderate', name: 'Moderate', desc: '3-4 activities per day. A balanced rhythm of sights and meals.' },
    { id: 'fast', name: 'Fast / Energetic', desc: '4-5 activities per day. Maximize landmarks and highlights.' },
  ];

  const interestOptions = [
    'Sightseeing & Landmarks',
    'Local Gastronomy & Food Tours',
    'Art & History Museums',
    'Historic Architecture',
    'Parks & Nature Groves',
    'Shopping & Local Markets',
    'Nightlife & Live Music',
    'Artisan Crafts & Workshops',
    'Photography Vantage Points',
    'Wellness & Thermal Baths',
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Halal',
    'Kosher',
    'Gluten-Free',
    'Dairy-Free',
    'Nut Allergy Safe',
    'Pescatarian',
  ];

  const accessibilityOptions = [
    'Wheelchair Accessible',
    'Step-Free Paths',
    'Elevator Access Required',
    'Low Walking Distances',
    'Visual Assistance Friendly',
  ];

  const toggleInterest = (item: string) => {
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleDietary = (item: string) => {
    setDietary((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleAccessibility = (item: string) => {
    setAccessibility((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const validateStep = (currentStep: number) => {
    setError(null);
    if (currentStep === 1) {
      if (!destination.trim()) {
        setError('Please enter a destination or city.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!startDate || !endDate) {
        setError('Please select both start and end dates.');
        return false;
      }
      if (new Date(endDate) < new Date(startDate)) {
        setError('Return date must be on or after departure date.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const tripPayload: TripCreate = {
        title: `${destination} Getaway`,
        origin: origin || undefined,
        destination,
        start_date: startDate,
        end_date: endDate,
        traveler_count: travelers,
        budget_amount: budget,
        currency,
        travel_preferences: {
          travel_vibe: travelVibe,
          travel_pace: travelPace,
          interests: selectedInterests,
          preferred_transportation: transportation,
          dietary_requirements: dietary,
          accessibility_requirements: accessibility,
          notes,
        },
      };

      // 1. Create trip record
      const createdTrip = await api.createTrip(tripPayload);

      // 2. Trigger AI itinerary generation immediately
      await api.generateItinerary(createdTrip.id);

      // 3. Navigate to trip page
      navigate(`/trips/${createdTrip.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Progress Stepper */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
            Step {step} of 5 &bull;{' '}
            {step === 1 && 'Destination'}
            {step === 2 && 'Dates & Budget'}
            {step === 3 && 'Vibe & Pace'}
            {step === 4 && 'Interests'}
            {step === 5 && 'Preferences & Confirmation'}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {Math.round((step / 5) * 100)}% Completed
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-sand-200 overflow-hidden">
          <div
            className="h-full bg-forest-800 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Wizard Step Content */}
      <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-10 shadow-sm">
        {/* STEP 1: Destination */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Where are you heading?</h2>
              <p className="text-sm text-slate-500 mt-1">
                Enter your target city, region, or multi-city cluster.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Destination City or Country *
                </label>
                <div className="relative">
                  <MapPin className="w-5 h-5 absolute left-3.5 top-3.5 text-forest-700" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kyoto, Japan or Barcelona, Spain"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 text-slate-900 text-base focus:border-forest-600 focus:ring-1 focus:ring-forest-600 outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Departure Origin (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco (SFO) or London"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-sand-300 text-slate-900 text-sm focus:border-forest-600 focus:ring-1 focus:ring-forest-600 outline-none shadow-2xs"
                />
              </div>

              {/* Discovery Prompt Hint */}
              <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-200/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-forest-700 shrink-0" />
                  <p className="text-xs text-forest-900 font-medium">
                    Unsure where to go? Let AI match your vibe & budget to candidate destinations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="text-xs font-bold text-forest-800 hover:text-forest-900 shrink-0 underline decoration-forest-400"
                >
                  Discover
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Dates, Travelers & Budget */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">When and who is traveling?</h2>
              <p className="text-sm text-slate-500 mt-1">
                Provide trip duration and estimated budget parameters.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Start Date *
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-slate-800 text-sm focus:border-forest-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  End Date *
                </label>
                <div className="relative">
                  <Calendar className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-slate-800 text-sm focus:border-forest-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Number of Travelers
                </label>
                <div className="relative">
                  <Users className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={travelers}
                    onChange={(e) => setTravelers(parseInt(e.target.value) || 1)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-slate-800 text-sm focus:border-forest-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Target Budget ({currency})
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-3 top-3 text-forest-700" />
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-slate-800 text-sm focus:border-forest-600 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Vibe & Pace */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select Your Travel Vibe & Rhythm</h2>
              <p className="text-sm text-slate-500 mt-1">
                This dictates activity density, venue atmosphere, and daily tone.
              </p>
            </div>

            {/* Vibe Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-3">
                Primary Travel Vibe
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vibeOptions.map((v) => {
                  const isSelected = travelVibe === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setTravelVibe(v.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-forest-600 bg-forest-50/70 shadow-xs'
                          : 'border-sand-200 hover:border-sand-300 bg-sand-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? 'text-forest-900' : 'text-slate-900'}`}>
                          {v.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-forest-700" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{v.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pace Selection */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-3">
                Preferred Daily Pace
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paceOptions.map((p) => {
                  const isSelected = travelPace === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTravelPace(p.id as any)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-forest-600 bg-forest-50/70 shadow-xs'
                          : 'border-sand-200 hover:border-sand-300 bg-sand-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? 'text-forest-900' : 'text-slate-900'}`}>
                          {p.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-forest-700" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Interests */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">What experiences excite you?</h2>
              <p className="text-sm text-slate-500 mt-1">
                Select topics that help the AI anchor daily highlights.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {interestOptions.map((item) => {
                const isSelected = selectedInterests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-forest-800 text-white shadow-xs'
                        : 'bg-sand-100 text-slate-700 hover:bg-sand-200 border border-sand-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: Constraints & Notes */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Constraints & Custom Notes</h2>
              <p className="text-sm text-slate-500 mt-1">
                Hard constraints enforced during generation.
              </p>
            </div>

            {/* Dietary */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                Dietary Preferences / Restrictions
              </label>
              <div className="flex flex-wrap gap-2">
                {dietaryOptions.map((d) => {
                  const isSelected = dietary.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDietary(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'border-forest-600 bg-forest-50 text-forest-900 font-semibold'
                          : 'border-sand-200 text-slate-600 hover:bg-sand-50'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accessibility */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                Mobility & Accessibility Needs
              </label>
              <div className="flex flex-wrap gap-2">
                {accessibilityOptions.map((a) => {
                  const isSelected = accessibility.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAccessibility(a)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'border-ocean-600 bg-ocean-50 text-ocean-900 font-semibold'
                          : 'border-sand-200 text-slate-600 hover:bg-sand-50'
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                Special Requests or Places to Exclude
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Avoid steep hill climbing, prioritize cozy independent coffee roasters, or include a day trip to a historic castle."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-xl border border-sand-300 text-sm text-slate-800 focus:border-forest-600 outline-none"
              />
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="mt-8 pt-6 border-t border-sand-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-sand-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-sm font-semibold shadow transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-forest-200" />
                  Generating Itinerary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Itinerary with AI
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
