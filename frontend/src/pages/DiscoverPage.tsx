import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  ArrowRight,
  CheckCircle2,
  Filter,
  Check
} from 'lucide-react';
import { api } from '../api/client';
import { DestinationOption, DestinationDiscoveryRequest } from '../types';
import { Badge } from '../components/Badge';

export const DiscoverPage: React.FC = () => {
  const navigate = useNavigate();

  const [vibe, setVibe] = useState('cultural');
  const [budget, setBudget] = useState(2500);
  const [duration, setDuration] = useState(7);
  const [travelers, setTravelers] = useState(2);
  const [origin, setOrigin] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<DestinationOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch on page load
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const req: DestinationDiscoveryRequest = {
        origin: origin || undefined,
        travel_vibe: vibe,
        budget_amount: budget,
        currency: 'USD',
        duration_days: duration,
        traveler_count: travelers,
        interests: ['culture', 'sightseeing', 'local food'],
      };
      const res = await api.discoverDestinations(req);
      setRecommendations(res.recommendations);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDestination = (dest: DestinationOption) => {
    navigate(`/wizard?destination=${encodeURIComponent(dest.destination)}&vibe=${encodeURIComponent(vibe)}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-forest-700" />
          Destination Discovery Engine
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find Your Ideal Travel Destination
        </h1>
        <p className="text-sm sm:text-base text-slate-500 mt-2">
          Tune your budget, duration, and desired vibe to let our AI recommend high-alignment destinations.
        </p>
      </div>

      {/* Discovery Control Filters Bar */}
      <div className="bg-white p-6 rounded-3xl border border-sand-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Travel Vibe
            </label>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 bg-white outline-none focus:border-forest-600"
            >
              <option value="cultural">Cultural & Historic</option>
              <option value="adventure">Outdoor Adventure</option>
              <option value="relaxed">Relaxed & Leisure</option>
              <option value="romantic">Romantic Escape</option>
              <option value="luxury">Luxury & Gastronomy</option>
              <option value="nature">Scenic Nature</option>
              <option value="family-friendly">Family-Friendly</option>
              <option value="budget-friendly">Budget-Conscious</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Target Budget (USD)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-3 text-forest-700" />
              <input
                type="number"
                step="100"
                min="300"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 outline-none focus:border-forest-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Duration (Days)
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                min="2"
                max="30"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 7)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 outline-none focus:border-forest-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
              Travelers
            </label>
            <div className="relative">
              <Users className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="number"
                min="1"
                max="20"
                value={travelers}
                onChange={(e) => setTravelers(parseInt(e.target.value) || 2)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sand-300 text-sm text-slate-800 outline-none focus:border-forest-600"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-sand-100">
          <button
            onClick={fetchRecommendations}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-forest-200" />
                Analyzing Destinations...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Update Recommendations
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recommendations Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-3xl bg-sand-200/50 animate-pulse border border-sand-200" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center text-red-700 text-sm flex flex-col items-center gap-3">
          <p className="font-medium max-w-md">{error}</p>
          <button
            onClick={fetchRecommendations}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-sand-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group p-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="forest" size="md">
                    {item.match_score}% MATCH
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium">
                    {item.suggested_duration_days} Days Suggested
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-forest-800 transition-colors">
                    {item.destination}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {item.country}
                  </span>
                </div>

                <p className="text-xs italic text-forest-900 bg-forest-50/60 p-2.5 rounded-xl border border-forest-100">
                  "{item.tagline}"
                </p>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.reasoning}
                </p>

                {/* Highlights List */}
                <div className="pt-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Key Highlights
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-lg bg-sand-100 text-slate-700 font-medium border border-sand-200"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Practical Meta */}
                <div className="pt-3 border-t border-sand-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold">Cost Range</span>
                    <span className="font-semibold text-slate-800">{item.estimated_cost_range}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-400 font-semibold">Best Season</span>
                    <span className="font-semibold text-slate-800">{item.best_season}</span>
                  </div>
                </div>

                {/* Estimated Budget Breakdown */}
                {item.estimated_budget_breakdown && (
                  <div className="pt-2.5 mt-2 bg-sand-50/70 p-2.5 rounded-xl border border-sand-200/80 text-[11px] text-slate-600 space-y-1">
                    <span className="block font-bold text-[10px] uppercase text-forest-800 tracking-wider">
                      Est. Daily Budget Breakdown
                    </span>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                      <span>🏨 Stay: {item.estimated_budget_breakdown.currency} {item.estimated_budget_breakdown.daily_accommodation}/d</span>
                      <span>🍽️ Meals: {item.estimated_budget_breakdown.currency} {item.estimated_budget_breakdown.daily_food}/d</span>
                      <span>🎟️ Sights: {item.estimated_budget_breakdown.currency} {item.estimated_budget_breakdown.daily_activities}/d</span>
                      <span>🚇 Transit: {item.estimated_budget_breakdown.currency} {item.estimated_budget_breakdown.daily_transport}/d</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  onClick={() => handleSelectDestination(item)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow transition-all"
                >
                  Plan Trip to {item.destination}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
