import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, AlertCircle, ChevronLeft } from 'lucide-react';
import { api } from '../api/client';
import { Trip, Itinerary, Activity, ActivityUpdate } from '../types';
import { TripHeader } from '../components/trips/TripHeader';
import { TripOverview } from '../components/trips/TripOverview';
import { ItineraryTimeline } from '../components/trips/ItineraryTimeline';
import { ShareTripDialog } from '../components/trips/ShareTripDialog';
import { CollaboratorManager } from '../components/trips/CollaboratorManager';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { ItineraryChatPanel } from '../components/ItineraryChatPanel';
import { Modal } from '../components/Modal';

export const TripDetailsPage: React.FC = () => {
  const params = useParams<{ tripId?: string; id?: string }>();
  const tripId = params.tripId || params.id;
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [collaboratorCount, setCollaboratorCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Locked activities for AI refinement
  const [lockedActivityIds, setLockedActivityIds] = useState<string[]>([]);

  // Dialog & Modal states
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Edit Activity modal
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Regenerate Day modal
  const [regenerateDayId, setRegenerateDayId] = useState<string | null>(null);
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const [isRegeneratingDay, setIsRegeneratingDay] = useState(false);

  // Route Optimization state
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [routeComparison, setRouteComparison] = useState<any>(null);
  const [routeWarnings, setRouteWarnings] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    if (tripId) {
      loadTripData(tripId, isCancelled);
    }
    return () => {
      isCancelled = true;
    };
  }, [tripId]);

  const loadTripData = async (targetId: string, isCancelled: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const tripData = await api.getTrip(targetId);
      if (isCancelled) return;
      setTrip(tripData);

      // Load itineraries
      const itins = await api.getTripItineraries(targetId);
      if (isCancelled) return;

      if (itins && itins.length > 0) {
        setItinerary(itins[0]);
      } else {
        const generated = await api.generateItinerary(targetId);
        if (isCancelled) return;
        setItinerary(generated);
      }

      // Load collaborators count
      try {
        const collabs = await api.getCollaborators(targetId);
        if (!isCancelled && collabs) {
          setCollaboratorCount(collabs.length);
        }
      } catch {
        // Non-critical if user is viewer or network fails
      }
    } catch (err: any) {
      if (!isCancelled) {
        setError(err.message || 'Failed to load trip and itinerary details.');
      }
    } finally {
      if (!isCancelled) {
        setLoading(false);
      }
    }
  };

  const handleToggleLock = (actId: string) => {
    setLockedActivityIds((prev) =>
      prev.includes(actId) ? prev.filter((id) => id !== actId) : [...prev, actId]
    );
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

      const updatedDays = itinerary.days.map((d) => ({
        ...d,
        activities: d.activities.map((a) => (a.id === updatedAct.id ? { ...a, ...updatedAct } : a)),
      }));

      setItinerary({
        ...itinerary,
        days: updatedDays,
      });

      setEditingActivity(null);
    } catch (err: any) {
      alert(`Failed to save activity: ${err.message}`);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!itinerary) return;
    if (!window.confirm('Delete this activity from your schedule?')) return;

    try {
      await api.deleteActivity(itinerary.id, activityId);
      const updatedDays = itinerary.days.map((d) => ({
        ...d,
        activities: d.activities.filter((a) => a.id !== activityId),
      }));

      setItinerary({
        ...itinerary,
        days: updatedDays,
      });
    } catch (err: any) {
      alert(`Failed to delete activity: ${err.message}`);
    }
  };

  const handleRegenerateDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itinerary || !regenerateDayId) return;

    try {
      setIsRegeneratingDay(true);
      const updatedDay = await api.regenerateDay(
        itinerary.id,
        regenerateDayId,
        regenerateFeedback,
        lockedActivityIds
      );

      const updatedDays = itinerary.days.map((d) => (d.id === updatedDay.id ? updatedDay : d));

      setItinerary({
        ...itinerary,
        days: updatedDays,
      });

      setRegenerateDayId(null);
      setRegenerateFeedback('');
    } catch (err: any) {
      alert(`Regeneration failed: ${err.message}`);
    } finally {
      setIsRegeneratingDay(false);
    }
  };

  const handleOptimizeDayRoute = async (pace: string) => {
    if (!tripId || !itinerary) return;
    try {
      setIsOptimizingRoute(true);
      const res = await api.optimizeTripItinerary(tripId, pace);
      setItinerary(res);
      const daysList = itinerary.days || [];
      if (daysList.length > 0) {
        const cDay = daysList[0];
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
      alert(err.message || 'Failed to optimize route.');
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-forest-700 animate-spin mx-auto mb-2" />
        <h2 className="text-xl font-bold text-slate-800">Loading Trip Details & Itinerary...</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Retrieving saved stops, collaborator status, and current schedule snapshot.
        </p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-8 rounded-3xl bg-red-50 border border-red-200">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-800">Trip Not Found or Inaccessible</h2>
          <p className="text-sm text-red-600 mt-1">{error || 'Unable to locate the requested trip.'}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 rounded-xl bg-forest-800 text-white text-xs font-bold hover:bg-forest-900 shadow-xs"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => navigate('/wizard')}
              className="px-5 py-2.5 rounded-xl bg-white border border-sand-300 text-slate-700 text-xs font-bold hover:bg-sand-50"
            >
              Plan New Trip
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back to Dashboard Breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-forest-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to My Trips
        </Link>
      </div>

      {/* Trip Header Banner */}
      <TripHeader
        trip={trip}
        itinerary={itinerary}
        lockedCount={lockedActivityIds.length}
        collaboratorCount={collaboratorCount}
        onOpenChat={() => setIsChatOpen(true)}
        onOpenVersions={() => setIsVersionsOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenCollaborators={() => setIsCollaboratorsOpen(true)}
      />

      {/* Trip Overview Stat Cards & Details */}
      <TripOverview trip={trip} itinerary={itinerary} />

      {/* Daily Timeline with Route Visualizer and Activity Cards */}
      {itinerary && (
        <ItineraryTimeline
          days={itinerary.days}
          lockedActivityIds={lockedActivityIds}
          onToggleLock={handleToggleLock}
          onEditActivity={(act) => setEditingActivity(act)}
          onDeleteActivity={handleDeleteActivity}
          onRegenerateDay={(dayId) => {
            setRegenerateDayId(dayId);
            setRegenerateFeedback('');
          }}
          onOptimizeDayRoute={handleOptimizeDayRoute}
          isOptimizingRoute={isOptimizingRoute}
          routeComparison={routeComparison}
          routeWarnings={routeWarnings}
        />
      )}

      {/* Share Trip Dialog */}
      <ShareTripDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        tripId={trip.id}
        tripTitle={trip.title}
        destination={trip.destination}
      />

      {/* Collaborator Management Modal */}
      <CollaboratorManager
        isOpen={isCollaboratorsOpen}
        onClose={() => {
          setIsCollaboratorsOpen(false);
          // Refresh count
          api.getCollaborators(trip.id).then((c) => setCollaboratorCount(c.length)).catch(() => {});
        }}
        tripId={trip.id}
      />

      {/* Snapshot Version History & Rollback Modal */}
      {itinerary && (
        <VersionHistoryModal
          isOpen={isVersionsOpen}
          onClose={() => setIsVersionsOpen(false)}
          tripId={trip.id}
          currentVersion={itinerary.version || 1}
          onRestore={(restored) => setItinerary(restored)}
        />
      )}

      {/* Conversational AI Refinement Drawer */}
      {itinerary && (
        <ItineraryChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          tripId={trip.id}
          destination={trip.destination}
          currentItinerary={itinerary}
          lockedActivityIds={lockedActivityIds}
          onUnlockActivity={(actId) => setLockedActivityIds((prev) => prev.filter((id) => id !== actId))}
          onClearLocked={() => setLockedActivityIds([])}
          onItineraryUpdated={(updated) => setItinerary(updated)}
        />
      )}

      {/* Modal: Edit Activity */}
      <Modal
        isOpen={editingActivity !== null}
        onClose={() => setEditingActivity(null)}
        title="Edit Activity Details"
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
                className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600 text-slate-900 font-medium"
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
                  required
                  defaultValue={editingActivity.start_time}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  End Time
                </label>
                <input
                  type="text"
                  name="end_time"
                  required
                  defaultValue={editingActivity.end_time}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600"
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
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600 bg-white"
                >
                  <option value="sightseeing">Sightseeing</option>
                  <option value="meal">Meal / Dining</option>
                  <option value="culture">Culture / Art</option>
                  <option value="nature">Nature / Outdoors</option>
                  <option value="shopping">Shopping</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Est. Cost ({editingActivity.currency || 'USD'})
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  name="estimated_cost"
                  defaultValue={editingActivity.estimated_cost}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Location Name / Address
              </label>
              <input
                type="text"
                name="location_name"
                defaultValue={editingActivity.location_name}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Description / Practical Notes
              </label>
              <textarea
                name="description"
                rows={3}
                defaultValue={editingActivity.description}
                className="w-full px-3 py-2 text-xs rounded-xl border border-sand-300 outline-none focus:border-forest-600 text-slate-800"
              />
            </div>

            <div className="pt-2 border-t border-sand-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Regenerate Single Day */}
      <Modal
        isOpen={regenerateDayId !== null}
        onClose={() => setRegenerateDayId(null)}
        title="Regenerate Day Schedule"
      >
        <form onSubmit={handleRegenerateDaySubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Tell the AI what to change for this day. Any locked activities will be preserved.
          </p>

          <textarea
            rows={3}
            placeholder="e.g. Focus more on traditional teahouses, less walking, and find a romantic dinner spot."
            value={regenerateFeedback}
            onChange={(e) => setRegenerateFeedback(e.target.value)}
            className="w-full p-3 rounded-xl border border-sand-300 text-xs text-slate-800 outline-none focus:border-forest-600"
          />

          <div className="pt-2 border-t border-sand-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRegenerateDayId(null)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRegeneratingDay}
              className="px-4 py-2 rounded-xl bg-forest-800 text-white font-bold text-xs hover:bg-forest-900 shadow-xs disabled:opacity-50 flex items-center gap-1.5"
            >
              {isRegeneratingDay ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Regenerate Day
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
