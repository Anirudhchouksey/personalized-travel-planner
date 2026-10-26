import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  X,
  Lock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { api } from '../api/client';
import { Itinerary, RefinementMessage } from '../types';

interface ItineraryChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  destination: string;
  currentItinerary: Itinerary;
  lockedActivityIds: string[];
  onUnlockActivity: (activityId: string) => void;
  onClearLocked: () => void;
  onItineraryUpdated: (updatedItinerary: Itinerary) => void;
}

export const ItineraryChatPanel: React.FC<ItineraryChatPanelProps> = ({
  isOpen,
  onClose,
  tripId,
  destination,
  currentItinerary,
  lockedActivityIds,
  onUnlockActivity,
  onClearLocked,
  onItineraryUpdated,
}) => {
  const [messages, setMessages] = useState<RefinementMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your Gemini AI travel companion for ${destination}. Tell me how you'd like to adjust your trip (e.g., 'Make day 2 more relaxed', 'Swap evening dinner for budget street food', or 'Add sunset photography spots'). Any activities you've locked with the padlock will be preserved!`,
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [targetDay, setTargetDay] = useState<number | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPromptChips = [
    'Make Day 2 more relaxed',
    'Add authentic street food dinner',
    'Add an outdoor scenic hike',
    'Find romantic sunset spots',
    'Reduce daily walking distance',
    'Make schedule kid-friendly',
  ];

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputText).trim();
    if (!text || isSending) return;

    setError(null);
    const userMsg: RefinementMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.refineItinerary(tripId, {
        message: text,
        target_day: targetDay,
        preserve_activity_ids: lockedActivityIds,
        conversation_history: historyPayload,
      });

      const assistantMsg: RefinementMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.assistant_message,
        summary_of_changes: res.summary_of_changes,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      onItineraryUpdated(res.itinerary);
    } catch (err: any) {
      setError(err.message || 'Failed to refine itinerary. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  const totalDays = currentItinerary?.days?.length || 3;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-sand-200 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-sand-200 bg-sand-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-forest-800 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Conversational Refinement
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800">
                v{currentItinerary.version || 1}
              </span>
            </h3>
            <p className="text-xs text-slate-500">Fine-tune {destination} in real time</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-sand-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Locked Activities Bar */}
      {lockedActivityIds.length > 0 && (
        <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>{lockedActivityIds.length} activity locked from changes</span>
          </div>
          <button
            type="button"
            onClick={onClearLocked}
            className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Target Day Selector */}
      <div className="px-4 py-2 border-b border-sand-200 bg-white flex items-center gap-2 text-xs text-slate-600 overflow-x-auto">
        <span className="shrink-0 font-medium text-slate-500">Scope:</span>
        <button
          type="button"
          onClick={() => setTargetDay(undefined)}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
            targetDay === undefined
              ? 'bg-forest-800 text-white shadow-2xs'
              : 'bg-sand-100 text-slate-600 hover:bg-sand-200'
          }`}
        >
          Entire Trip
        </button>
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((dNum) => (
          <button
            key={dNum}
            type="button"
            onClick={() => setTargetDay(dNum)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
              targetDay === dNum
                ? 'bg-forest-800 text-white shadow-2xs'
                : 'bg-sand-100 text-slate-600 hover:bg-sand-200'
            }`}
          >
            Day {dNum}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-forest-800 text-white rounded-br-xs'
                  : 'bg-sand-100 text-slate-800 rounded-bl-xs border border-sand-200'
              }`}
            >
              <p>{msg.content}</p>

              {msg.summary_of_changes && msg.summary_of_changes.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 space-y-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-forest-900 block">
                    Modifications made:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                    {msg.summary_of_changes.map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isSending && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-sand-100 border border-sand-200 max-w-[80%] text-xs text-slate-600">
            <Sparkles className="w-4 h-4 animate-spin text-forest-700 shrink-0" />
            <span>Refining schedule with Gemini Flash...</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2.5 border-t border-sand-200 bg-sand-50/50">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
          Suggestions
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickPromptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              disabled={isSending}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-forest-50 border border-sand-200 hover:border-forest-400 text-[11px] font-medium text-slate-700 hover:text-forest-900 shrink-0 transition-colors disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-sand-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={
              targetDay
                ? `Ask anything about Day ${targetDay}...`
                : 'e.g. Make schedule more relaxed, add wine tasting...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-sand-300 focus:border-forest-600 focus:ring-1 focus:ring-forest-600 outline-none text-slate-800 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-semibold transition-all disabled:opacity-40 shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
