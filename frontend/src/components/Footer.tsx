import React from 'react';
import { Compass, ShieldCheck, Sparkles, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-sand-100 border-t border-sand-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center text-white">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900">WanderAI</span>
            </div>
            <p className="text-sm text-slate-600 max-w-sm mb-4 leading-relaxed">
              Personalized, practical day-by-day travel itineraries tailored to your unique pace, budget, dietary needs, and vibe.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-sand-200/50 px-3 py-1.5 rounded-lg border border-sand-300/40 w-fit">
              <ShieldCheck className="w-4 h-4 text-forest-700" />
              <span>Evidence-conscious AI &bull; Explicit estimates &bull; RLS Protected</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><a href="/discover" className="hover:text-forest-800 transition-colors">Discover Destinations</a></li>
              <li><a href="/wizard" className="hover:text-forest-800 transition-colors">Trip Planner Wizard</a></li>
              <li><a href="/dashboard" className="hover:text-forest-800 transition-colors">Saved Itineraries</a></li>
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="hover:text-forest-800 transition-colors">FastAPI Swagger Docs</a></li>
            </ul>
          </div>

          {/* Providers */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">AI Engine</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-forest-500"></span>
                Groq API (Llama 3.3 70B)
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Hugging Face Inference
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                Ollama Local LLM
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                Supabase PostgreSQL
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-sand-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} WanderAI. Built for resilient, evidence-grounded travel planning.</p>
          <p className="flex items-center gap-1">
            Always verify local attraction opening hours and live transit schedules before departure.
          </p>
        </div>
      </div>
    </footer>
  );
};
