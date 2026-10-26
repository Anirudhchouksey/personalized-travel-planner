import React from 'react';
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  Sparkles,
  History,
  Share2,
  UserPlus
} from 'lucide-react';
import { Trip, Itinerary } from '../../types';
import { Badge } from '../Badge';
import { ExportTripMenu } from './ExportTripMenu';

interface TripHeaderProps {
  trip: Trip;
  itinerary: Itinerary | null;
  lockedCount: number;
  collaboratorCount: number;
  onOpenChat: () => void;
  onOpenVersions: () => void;
  onOpenShare: () => void;
  onOpenCollaborators: () => void;
}

export const TripHeader: React.FC<TripHeaderProps> = ({
  trip,
  itinerary,
  lockedCount,
  collaboratorCount,
  onOpenChat,
  onOpenVersions,
  onOpenShare,
  onOpenCollaborators,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <Badge variant="forest">
              {trip.travel_preferences?.travel_vibe?.toUpperCase() || 'CULTURAL'}
            </Badge>
            <Badge variant="sand">
              Pace: {trip.travel_preferences?.travel_pace || 'Moderate'}
            </Badge>
            <span className="text-xs text-slate-400 font-medium">
              v{itinerary?.version || 1} &bull; Status: <strong className="capitalize text-slate-700">{trip.status}</strong>
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {trip.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 mt-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-800">
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
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <DollarSign className="w-4 h-4 text-forest-700" />
                Budget: ${trip.budget_amount.toLocaleString()} {trip.currency || 'USD'}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refine with AI */}
          <button
            type="button"
            onClick={onOpenChat}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-forest-800 text-white hover:bg-forest-900 font-bold text-xs shadow-xs transition-all"
            title="Open conversational AI itinerary refinement panel"
          >
            <Sparkles className="w-3.5 h-3.5 text-forest-200" />
            <span>Refine AI</span>
            {lockedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-forest-950 text-[10px] font-semibold text-amber-300">
                {lockedCount} locked
              </span>
            )}
          </button>

          {/* Collaborators */}
          <button
            type="button"
            onClick={onOpenCollaborators}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-semibold text-xs shadow-2xs transition-all"
            title="Manage friends and travel collaborators"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-600" />
            <span>Collaborate</span>
            {collaboratorCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-sand-200 text-[10px] font-bold text-slate-700">
                {collaboratorCount}
              </span>
            )}
          </button>

          {/* Versions */}
          <button
            type="button"
            onClick={onOpenVersions}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-medium text-xs shadow-2xs transition-all"
            title="Review snapshots and roll back to previous versions"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Versions (v{itinerary?.version || 1})</span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={onOpenShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-sand-300 text-slate-700 hover:bg-sand-50 font-semibold text-xs shadow-2xs transition-all"
            title="Share public summary link"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Share</span>
          </button>

          {/* Multi-Format Export Menu */}
          {itinerary && (
            <ExportTripMenu itineraryId={itinerary.id} tripTitle={trip.title} />
          )}
        </div>
      </div>
    </div>
  );
};
