import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Globe,
  Clock,
  AlertCircle,
  ShieldCheck,
  Send,
  MessageCircle,
  Mail,
  Trash2
} from 'lucide-react';
import { Modal } from '../Modal';
import { api } from '../../api/client';

interface ShareTripDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
  destination: string;
}

export const ShareTripDialog: React.FC<ShareTripDialogProps> = ({
  isOpen,
  onClose,
  tripId,
  tripTitle,
  destination,
}) => {
  const [expiresInDays, setExpiresInDays] = useState<number>(30);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateShare = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.createShare(tripId, expiresInDays);
      setShareUrl(res.share_url);
      setShareId(res.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create share link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async () => {
    if (!shareId) return;
    if (!window.confirm('Revoke this share link? Anyone holding this link will lose access immediately.')) return;
    try {
      setIsLoading(true);
      await api.revokeShare(shareId);
      setShareUrl('');
      setShareId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke link.');
    } finally {
      setIsLoading(false);
    }
  };

  const shareText = encodeURIComponent(`Check out our travel itinerary for ${destination}: ${shareUrl}`);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Trip Summary" maxWidth="max-w-lg">
      <div className="space-y-5">
        <p className="text-xs sm:text-sm text-slate-600">
          Create an unguessable read-only link to share your {destination} itinerary with friends, family, or travel companions.
        </p>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!shareUrl ? (
          <div className="p-5 rounded-2xl bg-sand-50 border border-sand-200 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Link Expiration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '7 Days', val: 7 },
                  { label: '30 Days', val: 30 },
                  { label: '90 Days', val: 90 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setExpiresInDays(item.val)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border text-center transition-all ${
                      expiresInDays === item.val
                        ? 'border-forest-700 bg-forest-50 text-forest-900 shadow-2xs'
                        : 'border-sand-300 bg-white text-slate-600 hover:bg-sand-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateShare}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              {isLoading ? 'Generating Public Link...' : 'Generate Shareable Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Active Public Link
              </label>
              <div className="flex items-center gap-2 p-2 rounded-xl border border-sand-300 bg-sand-50/70">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full text-xs font-mono bg-transparent outline-none text-slate-800 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs transition-colors shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Social Sharing */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Send Directly Via
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-sand-200 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors"
                  title="Share on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent(tripTitle)}&body=${shareText}`}
                  className="p-2.5 rounded-xl border border-sand-200 hover:bg-ocean-50 hover:text-ocean-700 text-slate-600 transition-colors"
                  title="Share via Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(tripTitle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-sand-200 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors"
                  title="Share on Telegram"
                >
                  <Send className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Revoke Option */}
            <div className="pt-2 border-t border-sand-200 flex items-center justify-between">
              <span className="text-xs text-slate-400">Expires in {expiresInDays} days</span>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Revoke Link
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-sand-100 flex justify-end">
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
