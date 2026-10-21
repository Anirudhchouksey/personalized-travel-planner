import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Share2,
  Download,
  ArrowRight,
  CheckCircle2,
  Layers,
  Utensils
} from 'lucide-react';
import { Badge } from '../components/Badge';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-6">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-16 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-50 border border-forest-200 text-forest-800 text-xs font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-forest-700" />
            AI-Engineered Travel Planning &bull; Powered by Groq & Llama 3.3
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Personalized Day-by-Day Travel Itineraries,{' '}
            <span className="text-forest-800 underline decoration-forest-300 decoration-wavy decoration-2">
              Calibrated to Your Pace
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop juggling 20 open tabs and disorganized notes. Get geographically sound, evidence-grounded
            daily schedules tailored to your budget, dietary needs, mobility, and travel vibe.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/wizard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-medium text-base shadow-lg shadow-forest-800/20 hover:shadow-xl transition-all"
            >
              Start Planning Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/discover"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-sand-50 text-slate-800 font-medium text-base border border-sand-300 shadow-sm transition-all"
            >
              <Compass className="w-4 h-4 text-forest-800" />
              Need Destination Ideas?
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-700" />
              Sensible Geographic Ordering
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-700" />
              Realistic Meal & Rest Breaks
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-700" />
              Single-Day AI Regeneration
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-forest-700" />
              Publication-Grade PDF Export
            </span>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold uppercase tracking-wider text-forest-800 mb-2">Designed for Real Travelers</h2>
          <p className="text-3xl font-bold tracking-tight text-slate-900">
            Why WanderAI Itineraries Feel Human
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-forest-50 text-forest-800 flex items-center justify-center mb-5">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Geographic Clustering</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              No more zigzagging across towns. Activities are automatically sequenced to minimize transfer
              times and respect neighborhood proximity.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-ocean-50 text-ocean-800 flex items-center justify-center mb-5">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Calibrated Pacing</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Choose Relaxed (2-3 stops/day), Moderate (3-4 stops), or Fast (4-5 stops). Generates
              deliberate buffer times for rest, serendipity, and transit.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-sand-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-5">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Constraint Aware</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dietary restrictions (vegan, halal, allergies) and accessibility requirements (step-free, low walking)
              are treated as hard constraints in generation.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Itinerary Preview Mockup */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-sand-200 shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 bg-gradient-to-r from-forest-900 to-forest-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs uppercase font-semibold tracking-wider text-forest-200">Sample Generation</span>
                <span className="text-[10px] bg-forest-700/60 px-2 py-0.5 rounded-full border border-forest-600">Cultural Vibe</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold">5 Days in Kyoto & Arashiyama</h3>
              <p className="text-sm text-forest-100 mt-1">2 Travelers &bull; $2,500 USD &bull; Moderate Walking</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/wizard"
                className="px-4 py-2 rounded-xl bg-white text-forest-900 text-xs font-semibold hover:bg-forest-50 transition-colors shadow"
              >
                Plan Your Version
              </Link>
            </div>
          </div>

          {/* Sample Day Card */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-sand-200 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Day 2 &bull; Higashiyama Heritage & Zen Gardens</h4>
                <p className="text-xs text-slate-500 mt-0.5">Start early to enjoy serene temples before mid-day crowds.</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 bg-sand-100 rounded-lg text-slate-700">4 Activities</span>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-sand-200 hover:border-forest-300 transition-colors bg-sand-50/40">
                <span className="text-xs font-mono font-semibold text-forest-800 bg-white px-2 py-1 rounded border border-sand-200 shadow-2xs">09:00</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-slate-900">Kiyomizu-dera & Ancient Veranda View</h5>
                    <Badge variant="forest" size="sm">Sightseeing</Badge>
                    <span className="text-[10px] text-slate-400 font-medium">Verified Landmark</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Marvel at the historic wooden stage jutting from the hillside with sweeping views across Kyoto.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-700">~$4.00</span>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-sand-200 hover:border-forest-300 transition-colors bg-sand-50/40">
                <span className="text-xs font-mono font-semibold text-forest-800 bg-white px-2 py-1 rounded border border-sand-200 shadow-2xs">12:30</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-slate-900">Handmade Soba Tasting at Sannenzaka</h5>
                    <Badge variant="amber" size="sm">Meal</Badge>
                    <span className="text-[10px] text-slate-400 font-medium">Estimated</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Buckwheat noodles served chilled with dipping broth; vegetarian-friendly broth option available.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-700">~$18.00</span>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl border border-sand-200 hover:border-forest-300 transition-colors bg-sand-50/40">
                <span className="text-xs font-mono font-semibold text-forest-800 bg-white px-2 py-1 rounded border border-sand-200 shadow-2xs">15:00</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-bold text-slate-900">Kennin-ji Zen Rock Garden & Dragon Ceiling</h5>
                    <Badge variant="purple" size="sm">Culture</Badge>
                    <span className="text-[10px] text-slate-400 font-medium">Verified Landmark</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Sit quietly on tatami mats observing the rake stone patterns in Kyoto's oldest Zen monastery.
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-700">~$5.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-900 text-white rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Ready to Plan Your Next Adventure?
            </h2>
            <p className="text-forest-100 text-base mb-8">
              Generate a comprehensive, custom-tailored travel itinerary in seconds. Save, refine, download as PDF, and share freely.
            </p>
            <Link
              to="/wizard"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-forest-900 font-bold text-base hover:bg-forest-50 transition-all shadow-lg"
            >
              Plan a New Trip Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
