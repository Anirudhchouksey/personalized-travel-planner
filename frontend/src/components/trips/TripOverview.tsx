import React from 'react';
import { Calendar, Users, DollarSign, Compass, Tag, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Trip, Itinerary } from '../../types';

interface TripOverviewProps {
  trip: Trip;
  itinerary: Itinerary | null;
}

export const TripOverview: React.FC<TripOverviewProps> = ({ trip, itinerary }) => {
  const sDate = new Date(trip.start_date);
  const eDate = new Date(trip.end_date);
  const totalDays = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24)) + 1);

  const sumActivityCosts = itinerary?.days?.reduce((total, day) => {
    return total + (day.activities?.reduce((subTotal, act) => subTotal + (Number(act.estimated_cost) || 0), 0) || 0);
  }, 0) || 0;

  const estimatedTotalCost =
    (itinerary as any)?.estimated_total_cost ||
    itinerary?.structured_itinerary?.total_estimated_cost ||
    (sumActivityCosts > 0 ? sumActivityCosts : (trip.budget_amount ? trip.budget_amount * 0.75 : 0));

  const budget = trip.budget_amount || 0;
  const travelers = trip.traveler_count || 1;
  const perPersonCost = totalDays > 0 ? estimatedTotalCost / (travelers * totalDays) : 0;

  const interests = trip.travel_preferences?.interests || [];
  const tips = itinerary?.structured_itinerary?.practical_tips || [];

  return (
    <div className="space-y-6">
      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Days */}
        <div className="p-4 rounded-2xl bg-white border border-sand-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Duration</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            {totalDays} <span className="text-sm font-medium text-slate-500">Days</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{trip.start_date.slice(5)} to {trip.end_date.slice(5)}</p>
        </div>

        {/* Travelers */}
        <div className="p-4 rounded-2xl bg-white border border-sand-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Travelers</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            {travelers} <span className="text-sm font-medium text-slate-500">People</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{trip.travel_preferences?.travel_style || 'Standard'} group</p>
        </div>

        {/* Total Estimated Cost */}
        <div className="p-4 rounded-2xl bg-white border border-sand-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Est. Total Cost</div>
          <div className="text-xl sm:text-2xl font-extrabold text-forest-800 mt-1">
            ${estimatedTotalCost.toFixed(0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {budget > 0 ? `Budget: $${budget.toFixed(0)}` : 'No budget cap set'}
          </p>
        </div>

        {/* Daily Per Person */}
        <div className="p-4 rounded-2xl bg-white border border-sand-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily Average</div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            ${perPersonCost.toFixed(0)} <span className="text-xs font-normal text-slate-500">/ person / day</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{trip.travel_preferences?.travel_pace || 'Moderate'} pace</p>
        </div>
      </div>

      {/* Selected Interests & Constraints */}
      {(interests.length > 0 || (trip.travel_preferences?.dietary_requirements && trip.travel_preferences.dietary_requirements.length > 0)) && (
        <div className="p-5 rounded-2xl bg-white border border-sand-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Targeted Interests & Vibe
            </span>
            <div className="flex flex-wrap gap-1.5">
              {interests.map((item) => (
                <span
                  key={item}
                  className="px-2.5 py-1 rounded-lg bg-sand-100 text-slate-700 text-xs font-semibold border border-sand-200"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {trip.travel_preferences?.dietary_requirements && trip.travel_preferences.dietary_requirements.length > 0 && (
            <div className="sm:border-l sm:border-sand-200 sm:pl-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Dietary Constraints
              </span>
              <span className="text-xs font-medium text-slate-700">
                {trip.travel_preferences.dietary_requirements.join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Practical Destination Tips */}
      {tips.length > 0 && (
        <div className="p-5 rounded-2xl bg-sand-50/80 border border-sand-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-forest-900 mb-2.5 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-forest-700" />
            Destination Grounding & Local Tips
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {tips.map((tip: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-forest-700 mt-1.5 shrink-0" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
