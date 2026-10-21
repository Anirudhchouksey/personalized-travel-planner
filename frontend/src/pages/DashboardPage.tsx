import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Trash2,
  ExternalLink,
  Search,
  Sparkles,
  ArrowRight,
  Share2,
  Download
} from 'lucide-react';
import { api } from '../api/client';
import { Trip } from '../types';
import { Badge } from '../components/Badge';
import { useAuth } from '../features/auth/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTrips();
      setTrips(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteTrip(tripId);
      setTrips(trips.filter((t) => t.id !== tripId));
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.displayName || 'Explorer'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your saved journeys, review daily schedules, or generate a new itinerary.
          </p>
        </div>
        <Link
          to="/wizard"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-medium text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Plan a New Trip
        </Link>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Trips</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{trips.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Provider</span>
          <p className="text-2xl font-bold text-forest-800 mt-1 flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-forest-700" />
            Active
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sand-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Explore Ideas</span>
          <Link to="/discover" className="text-sm font-semibold text-ocean-800 hover:underline mt-2 flex items-center gap-1">
            Browse recommendations <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 bg-white p-2.5 rounded-xl border border-sand-200 shadow-2xs">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Search by destination or title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-400 hover:text-slate-600 mr-2 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {/* Trips Grid or Empty State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-sand-200/50 animate-pulse border border-sand-200" />
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-center text-red-700">
          <p className="font-semibold text-sm">{error}</p>
          <button
            onClick={loadTrips}
            className="mt-3 text-xs font-medium px-4 py-2 bg-white rounded-lg border border-red-300 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-sand-300 p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-forest-50 text-forest-800 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Trips Planned Yet</h3>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Begin your journey by selecting a destination, dates, and your preferred travel pace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/wizard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest-800 text-white font-medium text-sm hover:bg-forest-900 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Plan a New Trip
            </Link>
            <Link
              to="/discover"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-sand-100 text-slate-700 font-medium text-sm hover:bg-sand-200 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-forest-700" />
              Get AI Ideas
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const vibe = trip.travel_preferences?.travel_vibe || 'cultural';
            return (
              <div
                key={trip.id}
                className="bg-white rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant="forest" size="sm">
                      {vibe.toUpperCase()}
                    </Badge>
                    <span className="text-[11px] font-mono font-medium text-slate-400">
                      {trip.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-forest-800 transition-colors line-clamp-1">
                    {trip.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 mb-4">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                    <span className="font-medium truncate">{trip.destination}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-3 border-t border-sand-100">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.start_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.traveler_count} {trip.traveler_count === 1 ? 'traveler' : 'travelers'}</span>
                    </div>
                    {trip.budget_amount && (
                      <div className="flex items-center gap-1.5 col-span-2 text-slate-700 font-medium">
                        <DollarSign className="w-3.5 h-3.5 text-forest-700" />
                        <span>Est. Budget: {trip.budget_amount} {trip.currency}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-6 py-3.5 bg-sand-50/60 border-t border-sand-100 flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteTrip(trip.id, trip.title)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete trip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <Link
                    to={`/trips/${trip.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-forest-800 hover:text-forest-900"
                  >
                    View Itinerary
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
