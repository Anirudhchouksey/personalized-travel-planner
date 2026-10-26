import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  AlertCircle,
  Clock,
  Edit3,
  Sun,
  ShieldCheck
} from 'lucide-react';
import { tripsAPI } from '../api/client';
import { TripCreate } from '../types';
import { useAuth } from '../features/auth/AuthContext';

export const WizardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loginAsDemo } = useAuth();

  // Initial values, prefilled if redirected from Discover
  const prefillDest = searchParams.get('destination') || '';
  const prefillVibe = searchParams.get('vibe') || 'cultural';

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loading quotes / tips while generating
  const [loadingTipIndex, setLoadingTipIndex] = useState(0);
  const loadingTips = [
    'Mapping optimal walking routes and sequencing attractions...',
    'Finding top-rated local dining spots and hidden cafes...',
    'Calibrating schedule to your preferred travel pacing...',
    'Balancing morning highlights with scenic afternoon breaks...',
    'Double-checking opening hours and conflict-free transit intervals...'
  ];

  useEffect(() => {
    let interval: any;
    if (isSubmitting) {
      interval = setInterval(() => {
        setLoadingTipIndex((prev) => (prev + 1) % loadingTips.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // Step 1: Destination & Dates
  const [destination, setDestination] = useState(prefillDest || 'Kyoto, Japan');
  const [origin, setOrigin] = useState('');
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2026-11-05');
  const [isFlexibleDates, setIsFlexibleDates] = useState(false);
  const [flexibleSeason, setFlexibleSeason] = useState('Autumn / November');

  // Step 2: Travelers & Budget
  const [travelers, setTravelers] = useState(2);
  const [groupType, setGroupType] = useState<'solo' | 'couple' | 'family' | 'friends' | 'custom'>('couple');
  const [budgetType, setBudgetType] = useState<'total' | 'per_person'>('total');
  const [budgetInput, setBudgetInput] = useState<number>(2000);
  const [currency, setCurrency] = useState('USD');

  // Step 3: Travel Vibes & Interests
  const [travelVibe, setTravelVibe] = useState(prefillVibe);
  const [travelPace, setTravelPace] = useState<'relaxed' | 'moderate' | 'fast'>('moderate');
  const [travelStyle, setTravelStyle] = useState<'budget' | 'standard' | 'luxury' | 'backpacker' | 'family'>('standard');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'Sightseeing & Landmarks',
    'Local Gastronomy & Food Tours',
    'Art & History Museums',
  ]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // Calculations
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24)) + 1);

  const totalBudget = budgetType === 'total' ? budgetInput : budgetInput * travelers;
  const perPersonTotal = budgetType === 'per_person' ? budgetInput : budgetInput / travelers;
  const perPersonPerDay = totalDays > 0 ? perPersonTotal / totalDays : 0;

  let budgetTier: 'Budget' | 'Moderate' | 'Luxury' = 'Moderate';
  if (perPersonPerDay < 100) budgetTier = 'Budget';
  else if (perPersonPerDay > 250) budgetTier = 'Luxury';

  const popularDestinations = ['Tokyo, Japan', 'Paris, France', 'Rome, Italy', 'Barcelona, Spain', 'Reykjavik, Iceland', 'New York City, USA'];

  const vibeOptions = [
    { id: 'cultural', name: 'Cultural', desc: 'Museums, historic landmarks, local traditions', icon: Compass },
    { id: 'adventure', name: 'Adventure', desc: 'Active exploration, hiking, outdoor thrill', icon: Mountain },
    { id: 'relaxed', name: 'Relaxed', desc: 'Slow mornings, scenic cafes, gentle wandering', icon: Coffee },
    { id: 'romantic', name: 'Romantic', desc: 'Cozy bistros, scenic sunset spots, charming views', icon: Heart },
    { id: 'luxury', name: 'Luxury', desc: 'Curated fine dining, upscale venues, comfort', icon: Sparkles },
    { id: 'nature', name: 'Nature & Scenic', desc: 'Parks, botanical groves, coastal vistas', icon: Footprints },
    { id: 'family-friendly', name: 'Family-Friendly', desc: 'Interactive exhibits, kid-safe pacing', icon: Users },
    { id: 'budget-friendly', name: 'Budget-Savvy', desc: 'Free sights, authentic local markets', icon: DollarSign },
  ];

  const interestOptions = [
    'Sightseeing & Landmarks',
    'Local Gastronomy & Food Tours',
    'Art & History Museums',
    'Historic Architecture',
    'Parks & Nature Groves',
    'Shopping & Local Markets',
    'Nightlife & Live Music',
    'Photography Vantage Points',
    'Wellness & Thermal Baths',
  ];

  const dietaryOptions = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-Free', 'Dairy-Free', 'Nut Allergy Safe'];
  const accessibilityOptions = ['Wheelchair Accessible', 'Step-Free Paths', 'Elevator Access Required', 'Low Walking Distances'];

  const handleGroupSelect = (type: 'solo' | 'couple' | 'family' | 'friends') => {
    setGroupType(type);
    if (type === 'solo') setTravelers(1);
    if (type === 'couple') setTravelers(2);
    if (type === 'family') setTravelers(4);
    if (type === 'friends') setTravelers(5);
  };

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
        setError('Please enter a destination.');
        return false;
      }
      if (!isFlexibleDates) {
        if (!startDate || !endDate) {
          setError('Please select both departure and return dates.');
          return false;
        }
        if (new Date(endDate) < new Date(startDate)) {
          setError('Return date must be on or after departure date.');
          return false;
        }
      }
    }
    if (currentStep === 2) {
      if (budgetInput <= 0) {
        setError('Please enter a realistic travel budget.');
        return false;
      }
      if (travelers < 1) {
        setError('Traveler count must be at least 1.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (proceedAsDemo = false) => {
    if (isSubmitting) return;

    if (!user && !proceedAsDemo) {
      setShowAuthModal(true);
      return;
    }

    if (proceedAsDemo && !user) {
      loginAsDemo();
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const tripPayload: TripCreate = {
        title: `${destination} Exploration`,
        origin: origin || undefined,
        destination,
        start_date: startDate,
        end_date: endDate,
        traveler_count: travelers,
        budget_amount: totalBudget,
        currency,
        travel_preferences: {
          travel_vibe: travelVibe,
          travel_pace: travelPace,
          travel_style: travelStyle,
          interests: selectedInterests,
          preferred_transportation: ['Public Transit', 'Walking'],
          dietary_requirements: dietary,
          accessibility_requirements: accessibility,
          notes: customNotes,
        },
      };

      const createdTrip = await tripsAPI.createTrip(tripPayload);
      navigate(`/trips/${createdTrip.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 4-Step Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-forest-800 text-white text-xs font-bold flex items-center justify-center">
              {step}
            </span>
            <span className="text-sm font-bold text-slate-900">
              {step === 1 && 'Step 1: Destination & Dates'}
              {step === 2 && 'Step 2: Travelers & Budget'}
              {step === 3 && 'Step 3: Vibes, Pace & Interests'}
              {step === 4 && 'Step 4: Review & Generate Itinerary'}
            </span>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Step {step} of 4 ({Math.round((step / 4) * 100)}%)
          </span>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-forest-800' : 'bg-sand-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-10 shadow-sm overflow-hidden">
        <AnimatePresence mode="wait">
          {/* STEP 1: Destination & Dates */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Where and when do you want to travel?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose your destination and dates or specify flexible timing.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Destination City or Region *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Kyoto, Japan or Florence, Italy"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-sand-300 focus:border-forest-600 focus:ring-1 focus:ring-forest-600 outline-none text-slate-900 font-medium text-sm"
                  />
                </div>

                {/* Popular Quick-Pick Tags */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-xs text-slate-400 font-medium">Popular:</span>
                  {popularDestinations.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setDestination(city)}
                      className="px-2.5 py-1 rounded-lg bg-sand-100 hover:bg-sand-200 text-slate-700 text-xs transition-colors"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Origin (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Departure City / Origin (Optional)
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. San Francisco or London Heathrow"
                  className="w-full px-4 py-2.5 rounded-xl border border-sand-300 focus:border-forest-600 outline-none text-slate-900 text-sm"
                />
              </div>

              {/* Dates / Flexible Dates */}
              <div className="pt-2 border-t border-sand-200">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Travel Dates
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                    <input
                      type="checkbox"
                      checked={isFlexibleDates}
                      onChange={(e) => setIsFlexibleDates(e.target.checked)}
                      className="rounded border-sand-300 text-forest-800 focus:ring-forest-600"
                    />
                    I&apos;m flexible with exact dates
                  </label>
                </div>

                {!isFlexibleDates ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 mb-1.5 block">Departure Date</span>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 focus:border-forest-600 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 mb-1.5 block">Return Date</span>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 focus:border-forest-600 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 space-y-3">
                    <span className="text-xs font-medium text-slate-700 block">Preferred Travel Window</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Spring (Mar-May)', 'Summer (Jun-Aug)', 'Autumn (Sep-Nov)', 'Winter (Dec-Feb)'].map((season) => (
                        <button
                          key={season}
                          type="button"
                          onClick={() => setFlexibleSeason(season)}
                          className={`p-2.5 rounded-xl text-xs font-semibold text-center border transition-all ${
                            flexibleSeason === season
                              ? 'border-forest-700 bg-forest-50 text-forest-900 shadow-2xs'
                              : 'border-sand-200 bg-white text-slate-600 hover:bg-sand-100'
                          }`}
                        >
                          {season}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Travelers & Budget */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Who is traveling and what is your budget?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  We balance attractions, dining tiers, and activities to fit your spending goals.
                </p>
              </div>

              {/* Group Type Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Traveler Group
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'solo', label: 'Solo Traveler', count: 1, desc: '1 Person' },
                    { id: 'couple', label: 'Couple / Duo', count: 2, desc: '2 People' },
                    { id: 'family', label: 'Family', count: 4, desc: '3-5 People' },
                    { id: 'friends', label: 'Friends Group', count: 5, desc: '5+ People' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleGroupSelect(g.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        groupType === g.id
                          ? 'border-forest-700 bg-forest-50/70 shadow-2xs'
                          : 'border-sand-200 hover:border-sand-300 bg-white'
                      }`}
                    >
                      <Users className={`w-5 h-5 mb-1.5 ${groupType === g.id ? 'text-forest-800' : 'text-slate-400'}`} />
                      <div className="font-bold text-xs text-slate-900">{g.label}</div>
                      <div className="text-[11px] text-slate-500">{g.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-slate-600 font-medium">Exact traveler count:</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={travelers}
                    onChange={(e) => {
                      setTravelers(Math.max(1, parseInt(e.target.value) || 1));
                      setGroupType('custom');
                    }}
                    className="w-20 px-3 py-1.5 rounded-xl border border-sand-300 text-sm text-center font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Budget Calculation & Tier Badge */}
              <div className="pt-2 border-t border-sand-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Budget Planning
                  </label>
                  <div className="flex items-center rounded-xl bg-sand-100 p-1 border border-sand-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setBudgetType('total')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        budgetType === 'total' ? 'bg-white shadow-2xs text-forest-900' : 'text-slate-600'
                      }`}
                    >
                      Total Budget
                    </button>
                    <button
                      type="button"
                      onClick={() => setBudgetType('per_person')}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        budgetType === 'per_person' ? 'bg-white shadow-2xs text-forest-900' : 'text-slate-600'
                      }`}
                    >
                      Per Person
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <span className="text-xs text-slate-500 mb-1 block">
                      {budgetType === 'total' ? 'Total Trip Budget ($)' : 'Budget Per Traveler ($)'}
                    </span>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-3 w-5 h-5 text-slate-400" />
                      <input
                        type="number"
                        min={50}
                        step={50}
                        value={budgetInput}
                        onChange={(e) => setBudgetInput(Math.max(50, parseFloat(e.target.value) || 0))}
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-sand-300 text-base font-bold text-slate-900 focus:border-forest-600 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 mb-1 block">Currency</span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl border border-sand-300 text-sm font-semibold text-slate-800 bg-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="AUD">AUD ($)</option>
                    </select>
                  </div>
                </div>

                {/* Live Cost Breakdown Cards */}
                <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Budget</div>
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">
                      ${totalBudget.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Per Person / Day</div>
                    <div className="text-sm sm:text-base font-extrabold text-forest-800 mt-0.5">
                      ${perPersonPerDay.toFixed(0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Budget Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        budgetTier === 'Budget'
                          ? 'bg-amber-100 text-amber-900'
                          : budgetTier === 'Moderate'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}>
                        {budgetTier}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Travel Vibes & Interests */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  What vibe and pace suit your style?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select your primary travel atmosphere and pace to calibrate daily activity counts.
                </p>
              </div>

              {/* Vibe Selection Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                  Travel Vibe
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {vibeOptions.map((v) => {
                    const Icon = v.icon;
                    const isSelected = travelVibe === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setTravelVibe(v.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-forest-700 bg-forest-50/70 shadow-2xs'
                            : 'border-sand-200 hover:border-sand-300 bg-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-forest-800' : 'text-slate-400'}`} />
                        <div className="font-bold text-xs text-slate-900">{v.name}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{v.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pace Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Daily Pace
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'relaxed', label: 'Relaxed Pace', desc: '2-3 activities/day. Slow mornings & cafe stops.' },
                    { id: 'moderate', label: 'Moderate Balance', desc: '3-4 activities/day. Balanced rhythm of sights & rest.' },
                    { id: 'fast', label: 'Fast & Energetic', desc: '4-5 activities/day. Maximize sights and landmarks.' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTravelPace(p.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        travelPace === p.id
                          ? 'border-forest-700 bg-forest-50/70'
                          : 'border-sand-200 bg-white hover:bg-sand-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{p.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests Multi-Select */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Key Interests (Select any)
                </label>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((item) => {
                    const isSelected = selectedInterests.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-forest-800 text-white shadow-2xs'
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

              {/* Dietary & Accessibility Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-sand-200">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Dietary Requirements
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {dietaryOptions.map((d) => {
                      const isSelected = dietary.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleDietary(d)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Accessibility Needs
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {accessibilityOptions.map((a) => {
                      const isSelected = accessibility.includes(a);
                      return (
                        <button
                          key={a}
                          type="button"
                          onClick={() => toggleAccessibility(a)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
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
              </div>
            </motion.div>
          )}

          {/* STEP 4: Review & Generate */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Review your trip preferences
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Confirm your details before Gemini Flash generates your personalized day-by-day dossier.
                </p>
              </div>

              {/* Summary Cards with Edit Links */}
              <div className="space-y-4">
                {/* Section 1: Destination & Timing */}
                <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Destination & Timing</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">{destination}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {isFlexibleDates
                        ? `Flexible Window: ${flexibleSeason}`
                        : `${startDate} to ${endDate} (${totalDays} Days)`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-forest-800 hover:bg-sand-200 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>

                {/* Section 2: Travelers & Budget */}
                <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Travelers & Budget</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {travelers} Traveler{travelers > 1 ? 's' : ''} &bull; ${totalBudget.toLocaleString()} {currency}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      ${perPersonPerDay.toFixed(0)} / person / day &bull; Tier: <strong className="text-forest-900">{budgetTier}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-forest-800 hover:bg-sand-200 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>

                {/* Section 3: Vibe & Preferences */}
                <div className="p-4 rounded-2xl bg-sand-50 border border-sand-200 flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Vibe, Pace & Interests</div>
                    <div className="text-base font-bold text-slate-900 mt-0.5 capitalize">
                      {travelVibe} &bull; {travelPace} Pace
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-1">
                      {selectedInterests.map((item) => (
                        <span key={item} className="px-2 py-0.5 rounded-md bg-white border border-sand-200 text-[11px]">
                          {item}
                        </span>
                      ))}
                    </div>
                    {(dietary.length > 0 || accessibility.length > 0) && (
                      <div className="text-xs text-slate-500 mt-2">
                        {dietary.length > 0 && <span>Dietary: {dietary.join(', ')} &bull; </span>}
                        {accessibility.length > 0 && <span>Accessibility: {accessibility.join(', ')}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-forest-800 hover:bg-sand-200 flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>

              {/* Special Notes textarea */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Additional Notes or Specific Places (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please include a visit to Arashiyama Bamboo Grove and prioritize budget vegetarian ramen."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-sand-300 text-xs text-slate-800 focus:border-forest-600 outline-none"
                />
              </div>

              {/* Dynamic Loading Tips while Generating */}
              {isSubmitting && (
                <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-forest-900 flex items-center gap-3 animate-pulse">
                  <Sparkles className="w-5 h-5 text-forest-700 shrink-0 animate-spin" />
                  <div className="text-xs">
                    <p className="font-bold">AI Orchestration in progress...</p>
                    <p className="text-forest-800">{loadingTips[loadingTipIndex]}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer Stepper Buttons */}
        <div className="mt-8 pt-6 border-t border-sand-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-sand-100 transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow-xs transition-all"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white text-sm font-extrabold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-forest-200" />
                  Generating Itinerary...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate AI Itinerary
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Guest Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sand-200 max-w-md w-full p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-forest-50 text-forest-800 flex items-center justify-center mx-auto mb-3">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Save Your Itinerary</h3>
              <p className="text-xs text-slate-500 mt-1">
                You are currently exploring as a guest. To save this trip and return to it anytime, please sign in or create an account.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/login?redirect=/wizard')}
                className="w-full py-3 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-sm transition-all text-center"
              >
                Sign In to My Account
              </button>
              <button
                type="button"
                onClick={() => navigate('/register?redirect=/wizard')}
                className="w-full py-3 rounded-xl bg-sand-100 hover:bg-sand-200 text-slate-800 font-bold text-sm transition-colors text-center"
              >
                Create Free Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAuthModal(false);
                  handleSubmit(true);
                }}
                className="w-full py-2.5 rounded-xl border border-dashed border-forest-300 bg-forest-50/50 hover:bg-forest-50 text-forest-900 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-forest-700" />
                Generate Now as Demo Explorer
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
