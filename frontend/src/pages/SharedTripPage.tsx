import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Sparkles,
  ArrowRight,
  Info,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { PublicShareView } from '../types';
import { Badge } from '../components/Badge';

export const SharedTripPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicShareView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  useEffect(() => {
    if (token) {
      loadSharedItinerary(token);
    }
  }, [token]);

  const loadSharedItinerary = async (shareToken: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPublicShare(shareToken);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Shared itinerary is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Sparkles className="w-8 h-8 text-forest-700 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-600">Loading shared itinerary...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-3xl bg-sand-100 border border-sand-300">
          <Compass className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">Itinerary Link Unavailable</h2>
          <p className="text-xs text-slate-500 mt-2">{error}</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 text-white text-xs font-semibold hover:bg-forest-900"
          >
            Create Your Own Itinerary
          </Link>
        </div>
      </div>
    );
  }

  const { trip, itinerary } = data;
  const days = itinerary?.days || [];
  const currentDay = days.find((d) => d.day_number === selectedDayNumber) || days[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Shared Itinerary Header Notice */}
      <div className="bg-forest-50 border border-forest-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-forest-900 font-medium">
          <Sparkles className="w-4 h-4 text-forest-700 shrink-0" />
          <span>You are viewing a shared travel itinerary.</span>
        </div>
        <Link
          to={`/wizard?destination=${encodeURIComponent(trip.destination)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-800 text-white text-xs font-bold hover:bg-forest-900 shadow-2xs"
        >
          Plan a Trip Like This
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Trip Overview Card */}
      <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge variant="forest">
            {trip.travel_preferences?.travel_vibe?.toUpperCase() || 'CULTURAL'}
          </Badge>
          <Badge variant="sand">
            Pace: {trip.travel_preferences?.travel_pace || 'Moderate'}
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {trip.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 mt-2">
          <span className="flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-forest-700" />
            {trip.destination}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-slate-400" />
            {trip.start_date} to {trip.end_date}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-400" />
            {trip.traveler_count} {trip.traveler_count === 1 ? 'Traveler' : 'Travelers'}
          </span>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {days.map((d) => {
          const isActive = d.day_number === selectedDayNumber;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDayNumber(d.day_number)}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'bg-forest-800 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-sand-100 border border-sand-200'
              }`}
            >
              <span>Day {d.day_number}</span>
              <span className={`text-[11px] font-normal ${isActive ? 'text-forest-200' : 'text-slate-400'}`}>
                {d.date.slice(5)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Schedule */}
      {currentDay && (
        <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="pb-4 border-b border-sand-200">
            <h2 className="text-lg font-bold text-slate-900">
              Day {currentDay.day_number} &bull; {currentDay.summary}
            </h2>
            {currentDay.notes && (
              <p className="text-xs text-slate-500 mt-1">{currentDay.notes}</p>
            )}
          </div>

          <div className="space-y-4">
            {currentDay.activities?.map((act) => (
              <div
                key={act.id}
                className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl border border-sand-200 bg-sand-50/30"
              >
                <div className="sm:w-28 shrink-0">
                  <span className="text-xs font-mono font-bold text-forest-900 bg-white px-2 py-1 rounded-md border border-sand-200 shadow-2xs">
                    {act.start_time} - {act.end_time}
                  </span>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{act.name}</h4>
                    <Badge variant="forest" size="sm">{act.category.toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                  {act.location_name && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium pt-1">
                      <MapPin className="w-3.5 h-3.5 text-forest-700" />
                      {act.location_name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
