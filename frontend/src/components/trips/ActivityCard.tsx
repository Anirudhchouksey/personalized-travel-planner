import React from 'react';
import { MapPin, DollarSign, Edit2, Trash2, Lock, Unlock, Clock, AlertCircle } from 'lucide-react';
import { Activity } from '../../types';
import { Badge } from '../Badge';

interface ActivityCardProps {
  activity: Activity;
  isLocked: boolean;
  onToggleLock: (id: string) => void;
  onEdit: (act: Activity) => void;
  onDelete: (id: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  isLocked,
  onToggleLock,
  onEdit,
  onDelete,
}) => {
  const isVerified = activity.verification_status === 'verified';

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-xs group ${
        isLocked
          ? 'border-amber-300 bg-amber-50/20 shadow-2xs'
          : 'border-sand-200 hover:border-forest-200 bg-white'
      }`}
    >
      {/* Time column */}
      <div className="sm:w-28 shrink-0 flex sm:flex-col items-center sm:items-start gap-1.5">
        <span className="text-xs font-mono font-bold text-forest-900 bg-sand-50 px-2 py-1 rounded-md border border-sand-200 shadow-2xs">
          {activity.start_time} - {activity.end_time}
        </span>
        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {activity.estimated_duration_minutes} min
        </span>
      </div>

      {/* Details column */}
      <div className="flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm sm:text-base font-bold text-slate-900">{activity.name}</h4>
          <Badge
            variant={
              activity.category === 'meal'
                ? 'amber'
                : activity.category === 'culture'
                ? 'purple'
                : activity.category === 'nature'
                ? 'forest'
                : 'slate'
            }
            size="sm"
          >
            {activity.category.toUpperCase()}
          </Badge>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isVerified
                ? 'bg-forest-50 text-forest-800 border-forest-200'
                : 'bg-sand-100 text-slate-500 border-sand-200'
            }`}
          >
            {isVerified ? 'Verified Sights' : 'AI Calibrated'}
          </span>
          {isLocked && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Locked
            </span>
          )}
        </div>

        {activity.description && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {activity.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1.5">
          {activity.location_name && (
            <span className="flex items-center gap-1 font-medium text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-forest-700" />
              {activity.location_name}
            </span>
          )}
          <span className="flex items-center gap-1 font-bold text-slate-800">
            <DollarSign className="w-3.5 h-3.5 text-forest-700" />
            {activity.estimated_cost > 0
              ? `~${activity.estimated_cost.toFixed(2)} ${activity.currency || 'USD'}`
              : 'Free / Included'}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-2 sm:pt-0 self-end sm:self-start opacity-90 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onToggleLock(activity.id)}
          className={`p-1.5 rounded-lg transition-colors ${
            isLocked
              ? 'text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300'
              : 'text-slate-400 hover:text-slate-700 hover:bg-sand-100'
          }`}
          title={
            isLocked
              ? "Locked: AI refinement will not replace this activity"
              : "Lock activity to preserve it during AI refinement"
          }
        >
          {isLocked ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => onEdit(activity)}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-sand-100 transition-colors"
          title="Edit activity details"
        >
          <Edit2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(activity.id)}
          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          title="Delete activity"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
