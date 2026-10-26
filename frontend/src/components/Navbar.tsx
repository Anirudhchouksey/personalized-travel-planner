import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Compass, MapPin, Plus, User, LogOut, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, supabaseConfigured } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sand-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-forest-800 to-forest-500 flex items-center justify-center text-white shadow-md shadow-forest-800/10 transition-transform group-hover:scale-105">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-forest-800 transition-colors">
                WanderAI
              </span>
              <span className="hidden sm:inline-block ml-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200">
                Itinerary Planner
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/discover"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/discover')
                  ? 'bg-sand-100 text-forest-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-sand-50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-forest-700" />
              Discover
            </Link>

            <Link
              to="/dashboard"
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                isActive('/dashboard')
                  ? 'bg-sand-100 text-forest-800 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-sand-50'
              }`}
            >
              <MapPin className="w-4 h-4 text-slate-400" />
              My Trips
            </Link>

            <Link
              to="/wizard"
              className="ml-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-forest-800 hover:bg-forest-900 text-white shadow-sm transition-all hover:shadow"
            >
              <Plus className="w-4 h-4" />
              Plan a Trip
            </Link>
          </nav>

          {/* User Controls */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-sand-200">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {supabaseConfigured ? 'Supabase Auth' : 'Demo Account'}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-forest-800 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-forest-800 hover:bg-forest-900 text-white shadow-xs transition-all hover:shadow"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/wizard"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-forest-800 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Plan
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-sand-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          <Link
            to="/discover"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-sand-50"
          >
            <Sparkles className="w-4 h-4 text-forest-700" />
            Discover Destinations
          </Link>
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-sand-50"
          >
            <MapPin className="w-4 h-4 text-slate-500" />
            My Trips
          </Link>
          <Link
            to="/wizard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-forest-800 font-semibold bg-forest-50"
          >
            <Plus className="w-4 h-4" />
            Plan New Trip
          </Link>
          {user ? (
            <div className="pt-2 border-t border-sand-100 flex items-center justify-between px-3">
              <span className="text-xs text-slate-500">Logged in as {user.displayName}</span>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-red-600 font-medium hover:underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-sand-100 flex items-center gap-2 px-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-slate-700 bg-sand-100 hover:bg-sand-200 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-white bg-forest-800 hover:bg-forest-900 rounded-lg transition-colors"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
