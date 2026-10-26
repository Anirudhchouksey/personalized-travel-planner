import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Clock, Check, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { api } from '../api/client';
import { ItineraryVersionItem, Itinerary } from '../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  currentVersion: number;
  onRestore: (restoredItinerary: Itinerary) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  tripId,
  currentVersion,
  onRestore,
}) => {
  const [versions, setVersions] = useState<ItineraryVersionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tripId) {
      loadVersions();
    }
  }, [isOpen, tripId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getItineraryVersions(tripId);
      setVersions(res.versions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load version history.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: number) => {
    try {
      setRestoringVersion(version);
      setError(null);
      const restored = await api.restoreItineraryVersion(tripId, version);
      setSuccessMsg(`Successfully restored itinerary to Version ${version}!`);
      onRestore(restored);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || `Failed to restore version ${version}.`);
    } finally {
      setRestoringVersion(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Itinerary Snapshot History" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Every AI refinement or regeneration automatically saves a snapshot. You can review past iterations and roll back anytime without losing your travel context.
        </p>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-forest-700" />
            <p className="text-xs">Loading versions...</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 bg-sand-50 rounded-2xl border border-sand-200">
            <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium">No previous versions yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Your first conversational refinement will create a rollback snapshot here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {versions.map((v) => {
              const isCurrent = v.version === currentVersion;
              return (
                <div
                  key={v.version}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'border-forest-600 bg-forest-50/40 shadow-xs'
                      : 'border-sand-200 bg-white hover:border-sand-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Version {v.version}
                        </span>
                        {isCurrent && (
                          <Badge variant="forest">Active Plan</Badge>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(v.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {v.user_instruction && (
                        <p className="text-xs text-slate-700 font-medium">
                          Prompt: &ldquo;{v.user_instruction}&rdquo;
                        </p>
                      )}

                      {v.summary && (
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {v.summary}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Total Days: <strong className="text-slate-700">{v.total_days}</strong></span>
                        {v.estimated_total_cost > 0 && (
                          <span>Est. Cost: <strong className="text-slate-700">${v.estimated_total_cost.toFixed(0)}</strong></span>
                        )}
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRestore(v.version)}
                        disabled={restoringVersion !== null}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sand-300 hover:border-forest-600 bg-white hover:bg-forest-50 text-slate-700 hover:text-forest-900 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        {restoringVersion === v.version ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                            Restoring...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-3.5 h-3.5" />
                            Rollback
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-sand-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-sand-100"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
