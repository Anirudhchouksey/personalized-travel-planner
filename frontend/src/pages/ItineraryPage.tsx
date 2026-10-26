import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Users,
  DollarSign,
  MapPin,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  History,
  Lock,
  Unlock,
  MessageSquare
} from 'lucide-react';
import { api } from '../api/client';
import { Trip, Itinerary, ItineraryDay, Activity, ActivityUpdate } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { RouteMapVisualizer } from '../components/RouteMapVisualizer';
import { ItineraryChatPanel } from '../components/ItineraryChatPanel';
import { VersionHistoryModal } from '../components/VersionHistoryModal';

export const ItineraryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active day selection
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(1);

  // Modals state
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const [isRegenerateDayOpen, setIsRegenerateDayOpen] = useState(false);
  const [regenerateDayId, setRegenerateDayId] = useState<string | null>(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeShareId, setActiveShareId] = useState<string | null>(null);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [routeComparison, setRouteComparison] = useState<any>(null);
  const [routeWarnings, setRouteWarnings] = useState<string[]>([]);

  // Conversational Refinement & Snapshot Versioning State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [lockedActivityIds, setLockedActivityIds] = useState<string[]>([]);

  const toggleLockActivity = (actId: string) => {
    setLockedActivityIds((prev) =>
      prev.includes(actId) ? prev.filter((x) => x !== actId) : [...prev, actId]
    );
  };

  useEffect(() => {
    if (id) {
      loadTripAndItinerary(id);
    }
  }, [id]);

  const loadTripAndItinerary = async (tripId: string) => {
    try {
      setLoading(true);
      setError(null);
      const tripData = await api.getTrip(tripId);
      setTrip(tripData);

      const itins = await api.getTripItineraries(tripId);
      if (itins && itins.length > 0) {
        setItinerary(itins[0]);
      } else {
        // If trip has no itinerary yet, generate one
        const generated = await api.generateItinerary(tripId);
        setItinerary(generated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trip and itinerary');
    } finally {
      setLoading(false);
    }
  };

  const handleEditActivity = (act: Activity) => {
    setEditingActivity(act);
    setIsEditActivityOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!itinerary || !editingActivity) return;

    try {
      const formData = new FormData(e.currentTarget);
      const updates: ActivityUpdate = {
        name: formData.get('name') as string,
        category: formData.get('category') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        estimated_cost: parseFloat(formData.get('estimated_cost') as string) || 0,
        description: formData.get('description') as string,
        location_name: formData.get('location_name') as string,
      };

      const updatedAct = await api.updateActivity(itinerary.id, editingActivity.id, updates);

      // Update state locally
      const updatedDays = itinerary.days.map((d) => ({
        ...d,
        activities: d.activities.map((a) => (a.id === updatedAct.id ? { ...a, ...updatedAct } : a)),
      }));

      setItinerary({ ...itinerary, days: updatedDays });
      setIsEditActivityOpen(false);
      setEditingActivity(null);
    } catch (err: any) {
      alert(`Failed to save activity: ${err.message}`);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!itinerary) return;
    if (!window.confirm('Are you sure you want to remove this activity?')) return;

    try {
      await api.deleteActivity(itinerary.id, activityId);
      const updatedDays = itinerary.days.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== activityId),
      }));
      setItinerary({ ...itinerary, days: updatedDays });
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const openRegenerateDay = (dayId: string) => {
    setRegenerateDayId(dayId);
    setRegenerateFeedback('');
    setIsRegenerateDayOpen(true);
  };

  const handleRegenerateDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itinerary || !regenerateDayId || !regenerateFeedback.trim()) return;

    try {
      setIsRegenerating(true);
      const updatedDay = await api.regenerateDay(
        itinerary.id,
        regenerateDayId,
        regenerateFeedback
      );

      const updatedDays = itinerary.days.map((d) =>
        d.id === updatedDay.id ? { ...d, ...updatedDay } : d
      );
      setItinerary({ ...itinerary, days: updatedDays });
      setIsRegenerateDayOpen(false);
      setRegenerateDayId(null);
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExportFormat = async (format: 'pdf' | 'markdown' | 'ics' | 'json') => {
    if (!itinerary || !trip) return;
    try {
      setIsExportingPdf(true);
      const safeDest = trip.destination.replace(/[\s,]+/g, '_');
      const filename = `${safeDest}_Itinerary.${format === 'pdf' ? 'html' : format === 'markdown' ? 'md' : format}`;
      await api.exportItinerary(itinerary.id, format, filename);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPdf = () => handleExportFormat('pdf');

  const handleOpenShare = async () => {
    if (!trip) return;
    setIsShareModalOpen(true);
    setCopied(false);
    if (!shareUrl) {
      try {
        setIsSharing(true);
        const share = await api.createShare(trip.id, 30);
        setShareUrl(share.share_url);
        setActiveShareId(share.id);
      } catch (err: any) {
        alert(`Failed to create share link: ${err.message}`);
      } finally {
        setIsSharing(false);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOptimizeDayRoute = async (pace: string) => {
    if (!id || !itinerary) return;
    try {
      setIsOptimizingRoute(true);
      const res = await api.optimizeTripItinerary(id, pace);
      setItinerary(res);
      const daysList = itinerary.days || [];
      const cDay = daysList.find((d) => d.day_number === selectedDayNumber) || daysList[0];
      if (cDay) {
        const originalStops = cDay.activities.map((a) => ({
          id: a.id,
          name: a.name,
          latitude: a.latitude,
          longitude: a.longitude,
          duration_minutes: a.estimated_duration_minutes || 90,
        }));
        const updatedDay = res.days.find((d) => d.day_number === cDay.day_number);
        if (updatedDay) {
          const optimizedStops = updatedDay.activities.map((a) => ({
            id: a.id,
            name: a.name,
            latitude: a.latitude,
            longitude: a.longitude,
            duration_minutes: a.estimated_duration_minutes || 90,
          }));
          const comp = await api.compareRoutes(originalStops, optimizedStops, pace);
          setRouteComparison(comp);
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to optimize route');
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Sparkles className="w-10 h-10 text-forest-700 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Generating Your Personalized Itinerary...</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          Sequencing attractions geographically, balancing meal breaks, and calibrating your daily pace.
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-red-50 border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800">Error Loading Itinerary</h2>
          <p className="text-sm text-red-600 mt-1">{error || 'Trip record not found.'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-forest-800 text-white text-sm font-medium hover:bg-forest-900"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const days = itinerary?.days || [];
  const currentDay = days.find((d) => d.day_number === selectedDayNumber) || days[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant="forest">
                {trip.travel_preferences?.travel_vibe?.toUpperCase() || 'CULTURAL'}
              </Badge>
              <Badge variant="sand">
                Pace: {trip.travel_preferences?.travel_pace || 'Moderate'}
              </Badge>
              <span className="text-xs text-slate-400 font-medium">
                v{itinerary?.version || 1} &bull; Provider: {itinerary?.generation_provider || 'Gemini'}
              </span>
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
              {trip.budget_amount && (
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <DollarSign className="w-4 h-4 text-forest-700" />
                  Budget: {trip.budget_amount} {trip.currency}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsChatOpen(true)}
              title="Open conversational AI refinement panel"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 text-white hover:bg-forest-900 font-bold text-xs shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-forest-200" />
              Refine with AI
              {lockedActivityIds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-forest-950 text-[10px] font-semibold text-amber-300">
                  {lockedActivityIds.length} locked
                </span>
              )}
            </button>

            <button
              onClick={() => setIsVersionModalOpen(true)}
              title="Review snapshots and roll back to previous versions"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              Versions (v{itinerary?.version || 1})
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              title="Export printable HTML/PDF dossier"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              {isExportingPdf ? 'Exporting...' : 'Export Dossier'}
            </button>

            <button
              onClick={() => handleExportFormat('ics')}
              disabled={isExportingPdf}
              title="Export iCalendar (.ics) format to sync with Google / Apple Calendar"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              Calendar (.ics)
            </button>

            <button
              onClick={() => handleExportFormat('markdown')}
              disabled={isExportingPdf}
              title="Export Markdown notes"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            >
              <Tag className="w-3.5 h-3.5 text-slate-600" />
              Markdown
            </button>

            <button
              onClick={handleOpenShare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-600" />
              Share
            </button>
          </div>
        </div>

        {/* Verification Grounding Notice */}
        <div className="mt-6 pt-4 border-t border-sand-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-forest-700 shrink-0" />
            <span>
              All stops and routes are AI-calibrated estimates. Always verify operating hours, reservations, and ticket policies.
            </span>
          </div>
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

      {/* Selected Day Content */}
      {currentDay && (
        <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Day Header with Regenerate Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-sand-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
                  Day {currentDay.day_number} Schedule &bull; {currentDay.date}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">{currentDay.summary}</h2>
              {currentDay.notes && (
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">{currentDay.notes}</p>
              )}
            </div>

            <button
              onClick={() => openRegenerateDay(currentDay.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sand-100 hover:bg-sand-200 text-slate-700 font-semibold text-xs transition-colors shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-forest-700" />
              Regenerate This Day
            </button>
          </div>

          {/* Smart Route Optimizer & Map Visualizer */}
          <RouteMapVisualizer
            dayNumber={currentDay.day_number}
            date={currentDay.date}
            stops={currentDay.activities.map((a) => ({
              id: a.id,
              name: a.name,
              category: a.category,
              latitude: a.latitude,
              longitude: a.longitude,
              start_time: a.start_time,
              end_time: a.end_time,
              duration_minutes: a.estimated_duration_minutes,
            }))}
            onOptimize={handleOptimizeDayRoute}
            isOptimizing={isOptimizingRoute}
            comparison={routeComparison}
            warnings={routeWarnings}
          />

          {/* Activities Timeline */}
          <div className="space-y-4">
            {currentDay.activities && currentDay.activities.length > 0 ? (
              currentDay.activities.map((act, index) => {
                const isVerified = act.verification_status === 'verified';
                return (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl border border-sand-200 hover:border-forest-200 bg-sand-50/30 transition-all hover:shadow-xs group"
                  >
                    {/* Time indicator */}
                    <div className="sm:w-28 shrink-0 flex sm:flex-col items-center sm:items-start gap-2">
                      <span className="text-xs font-mono font-bold text-forest-900 bg-white px-2 py-1 rounded-md border border-sand-200 shadow-2xs">
                        {act.start_time} - {act.end_time}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {act.estimated_duration_minutes} min
                      </span>
                    </div>

                    {/* Activity details */}
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{act.name}</h4>
                        <Badge
                          variant={
                            act.category === 'meal'
                              ? 'amber'
                              : act.category === 'culture'
                              ? 'purple'
                              : act.category === 'nature'
                              ? 'forest'
                              : 'slate'
                          }
                          size="sm"
                        >
                          {act.category.toUpperCase()}
                        </Badge>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                            isVerified
                              ? 'bg-forest-50 text-forest-700 border-forest-200'
                              : 'bg-sand-100 text-slate-500 border-sand-200'
                          }`}
                        >
                          {isVerified ? 'Verified Landmark' : 'AI Estimated'}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {act.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-2">
                        {act.location_name && (
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-forest-700" />
                            {act.location_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          {act.estimated_cost > 0
                            ? `~${act.estimated_cost.toFixed(2)} ${act.currency}`
                            : 'Free / Included'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 pt-2 sm:pt-0 self-end sm:self-start opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => toggleLockActivity(act.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          lockedActivityIds.includes(act.id)
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-2xs'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-sand-100'
                        }`}
                        title={
                          lockedActivityIds.includes(act.id)
                            ? "Activity locked: will not be replaced during AI refinement"
                            : "Lock this activity so AI refinement preserves it"
                        }
                      >
                        {lockedActivityIds.includes(act.id) ? (
                          <Lock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditActivity(act)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-100 transition-colors"
                        title="Edit activity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 bg-sand-50 rounded-2xl border border-dashed border-sand-300">
                <p className="text-sm">No activities listed for this day yet.</p>
                <button
                  onClick={() => openRegenerateDay(currentDay.id)}
                  className="mt-3 text-xs font-semibold text-forest-800 hover:underline"
                >
                  Click to generate Day {currentDay.day_number} activities
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Practical Tips Card */}
      {itinerary?.structured_itinerary?.practical_tips && (
        <div className="bg-sand-50 rounded-3xl border border-sand-200 p-6 sm:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-forest-900 mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-forest-700" />
            Practical Destination Tips
          </h3>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
            {itinerary.structured_itinerary.practical_tips.map((tip: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-2 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MODAL: Edit Activity */}
      <Modal
        isOpen={isEditActivityOpen}
        onClose={() => {
          setIsEditActivityOpen(false);
          setEditingActivity(null);
        }}
        title="Edit Activity"
      >
        {editingActivity && (
          <form onSubmit={handleSaveActivity} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Activity Name
              </label>
              <input
                type="text"
                name="name"
                required
                defaultValue={editingActivity.name}
                className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Start Time
                </label>
                <input
                  type="text"
                  name="start_time"
                  defaultValue={editingActivity.start_time}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  End Time
                </label>
                <input
                  type="text"
                  name="end_time"
                  defaultValue={editingActivity.end_time}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue={editingActivity.category}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600 bg-white"
                >
                  <option value="sightseeing">Sightseeing</option>
                  <option value="meal">Meal</option>
                  <option value="culture">Culture</option>
                  <option value="adventure">Adventure</option>
                  <option value="nature">Nature</option>
                  <option value="relaxation">Relaxation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Estimated Cost ({editingActivity.currency})
                </label>
                <input
                  type="number"
                  step="0.5"
                  name="estimated_cost"
                  defaultValue={editingActivity.estimated_cost}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Location Name
              </label>
              <input
                type="text"
                name="location_name"
                defaultValue={editingActivity.location_name}
                className="w-full px-3 py-2 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Description & Practical Notes
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingActivity.description}
                className="w-full p-3 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-sand-200">
              <button
                type="button"
                onClick={() => setIsEditActivityOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL: Regenerate Day */}
      <Modal
        isOpen={isRegenerateDayOpen}
        onClose={() => setIsRegenerateDayOpen(false)}
        title="Regenerate Day Schedule"
      >
        <form onSubmit={handleRegenerateDaySubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Tell the AI what adjustments you want for this specific day (e.g. "Focus more on outdoor parks and reduce walking", or "Swap museum for local cooking class").
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
              Refinement Instructions *
            </label>
            <textarea
              required
              rows={4}
              placeholder="e.g. Make this day more family-friendly with interactive science exhibits and relaxed lunch."
              value={regenerateFeedback}
              onChange={(e) => setRegenerateFeedback(e.target.value)}
              className="w-full p-3 text-sm rounded-xl border border-sand-300 outline-none focus:border-forest-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-sand-200">
            <button
              type="button"
              disabled={isRegenerating}
              onClick={() => setIsRegenerateDayOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegenerating || !regenerateFeedback.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold shadow disabled:opacity-50"
            >
              {isRegenerating ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate Day
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Share Itinerary */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title="Share Itinerary"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Anyone with this link can view this complete day-by-day itinerary without logging in. You can revoke it anytime.
          </p>

          {isSharing ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-forest-700" />
              Generating secure share token...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-2 rounded-xl border border-sand-300 bg-sand-50">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full text-xs bg-transparent outline-none text-slate-800 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-forest-800 text-white text-xs font-semibold hover:bg-forest-900 shrink-0 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              {activeShareId && (
                <div className="pt-2">
                  <button
                    onClick={async () => {
                      if (window.confirm('Revoke this share link? It will immediately stop working for everyone.')) {
                        await api.revokeShare(activeShareId);
                        setShareUrl('');
                        setActiveShareId(null);
                        setIsShareModalOpen(false);
                        alert('Share link revoked.');
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Revoke Access Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Conversational AI Refinement Drawer */}
      {trip && itinerary && (
        <ItineraryChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          tripId={trip.id}
          destination={trip.destination}
          currentItinerary={itinerary}
          lockedActivityIds={lockedActivityIds}
          onUnlockActivity={(actId) => setLockedActivityIds((prev) => prev.filter((x) => x !== actId))}
          onClearLocked={() => setLockedActivityIds([])}
          onItineraryUpdated={(updatedItin) => {
            setItinerary(updatedItin);
          }}
        />
      )}

      {/* Snapshot Version History & Rollback Modal */}
      {trip && itinerary && (
        <VersionHistoryModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          tripId={trip.id}
          currentVersion={itinerary.version || 1}
          onRestore={(restoredItin) => {
            setItinerary(restoredItin);
          }}
        />
      )}
    </div>
  );
};
