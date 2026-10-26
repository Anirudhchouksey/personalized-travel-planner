import React from 'react';
import { RefreshCw, Sun, Sunset, Moon, Calendar, MapPin } from 'lucide-react';
import { ItineraryDay, Activity } from '../../types';
import { ActivityCard } from './ActivityCard';

interface ItineraryDaySectionProps {
  day: ItineraryDay;
  lockedActivityIds: string[];
  onToggleLock: (id: string) => void;
  onEditActivity: (act: Activity) => void;
  onDeleteActivity: (id: string) => void;
  onRegenerateDay: (dayId: string) => void;
}

export const ItineraryDaySection: React.FC<ItineraryDaySectionProps> = ({
  day,
  lockedActivityIds,
  onToggleLock,
  onEditActivity,
  onDeleteActivity,
  onRegenerateDay,
}) => {
  const activities = day.activities || [];

  // Group into morning, afternoon, evening
  const morningActs = activities.filter((a) => {
    const hour = parseInt(a.start_time.split(':')[0], 10) || 9;
    return hour < 12;
  });

  const afternoonActs = activities.filter((a) => {
    const hour = parseInt(a.start_time.split(':')[0], 10) || 12;
    return hour >= 12 && hour < 17;
  });

  const eveningActs = activities.filter((a) => {
    const hour = parseInt(a.start_time.split(':')[0], 10) || 18;
    return hour >= 17;
  });

  const renderSlotGroup = (title: string, icon: React.ReactNode, acts: Activity[]) => {
    if (acts.length === 0) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pt-2">
          {icon}
          <span>{title}</span>
          <span className="text-[10px] text-slate-400 font-normal">({acts.length} stop{acts.length > 1 ? 's' : ''})</span>
        </div>
        <div className="space-y-3">
          {acts.map((act) => (
            <ActivityCard
              key={act.id}
              activity={act}
              isLocked={lockedActivityIds.includes(act.id)}
              onToggleLock={onToggleLock}
              onEdit={onEditActivity}
              onDelete={onDeleteActivity}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-sand-200 p-6 sm:p-8 shadow-xs space-y-6">
      {/* Day Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-sand-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-forest-800">
              Day {day.day_number} &bull; {day.date}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
            {day.summary || `Exploration of local sights and culture`}
          </h3>
          {day.notes && (
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">{day.notes}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRegenerateDay(day.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sand-100 hover:bg-sand-200 text-slate-700 font-semibold text-xs transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-forest-700" />
          Regenerate Day {day.day_number}
        </button>
      </div>

      {/* Activities divided into daytime slots */}
      {activities.length > 0 ? (
        <div className="space-y-6">
          {renderSlotGroup('Morning', <Sun className="w-4 h-4 text-amber-500" />, morningActs)}
          {renderSlotGroup('Afternoon', <Sunset className="w-4 h-4 text-orange-500" />, afternoonActs)}
          {renderSlotGroup('Evening & Dining', <Moon className="w-4 h-4 text-indigo-500" />, eveningActs)}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 bg-sand-50 rounded-2xl border border-dashed border-sand-300">
          <p className="text-sm font-medium">No activities scheduled for this day.</p>
          <button
            type="button"
            onClick={() => onRegenerateDay(day.id)}
            className="mt-2 text-xs font-bold text-forest-800 hover:underline"
          >
            Click here to generate Day {day.day_number} schedule
          </button>
        </div>
      )}
    </div>
  );
};
