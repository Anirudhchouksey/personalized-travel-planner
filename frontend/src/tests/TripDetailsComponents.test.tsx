import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityCard } from '../components/trips/ActivityCard';
import { TripOverview } from '../components/trips/TripOverview';
import { ExportTripMenu } from '../components/trips/ExportTripMenu';
import { CollaboratorManager } from '../components/trips/CollaboratorManager';
import { Activity, Trip, Itinerary } from '../types';

describe('TripDetails UI Components', () => {
  const mockActivity: Activity = {
    id: 'act-101',
    itinerary_day_id: 'day-1',
    name: 'Fushimi Inari Taisha Shrine',
    description: 'Famous for thousands of vermilion torii gates.',
    category: 'culture',
    start_time: '09:00',
    end_time: '11:00',
    estimated_duration_minutes: 120,
    estimated_cost: 0,
    currency: 'USD',
    location_name: 'Fushimi Ward, Kyoto',
    latitude: 34.9671,
    longitude: 135.7727,
    display_order: 0,
    verification_status: 'verified',
  };

  const mockTrip: Trip = {
    id: 'trip-999',
    user_id: 'user-123',
    destination: 'Kyoto, Japan',
    title: 'Kyoto Cultural Discovery',
    start_date: '2026-11-01',
    end_date: '2026-11-05',
    traveler_count: 2,
    budget_amount: 3000,
    currency: 'USD',
    status: 'planned',
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    travel_preferences: {
      travel_vibe: 'cultural',
      travel_pace: 'moderate',
      travel_style: 'standard',
      interests: ['Shrines', 'Matcha Tea', 'Gardens'],
      preferred_transportation: ['Walking', 'Public Transit'],
      dietary_requirements: [],
      accessibility_requirements: [],
    },
  };

  const mockItinerary: Itinerary = {
    id: 'itin-888',
    trip_id: 'trip-999',
    version: 1,
    generation_provider: 'gemini',
    created_at: '2026-10-24T00:00:00Z',
    updated_at: '2026-10-24T00:00:00Z',
    days: [],
    structured_itinerary: {
      total_estimated_cost: 450,
      practical_tips: ['Get an ICOCA transit card at Kyoto Station'],
      days: [],
    },
  };

  it('renders ActivityCard with timing, cost, and padlock lock toggle', () => {
    const handleToggleLock = vi.fn();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    const { rerender } = render(
      <ActivityCard
        activity={mockActivity}
        isLocked={false}
        onToggleLock={handleToggleLock}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText('Fushimi Inari Taisha Shrine')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('120 min')).toBeInTheDocument();
    expect(screen.getByText(/Free/i)).toBeInTheDocument();

    // Toggle lock button
    const lockButton = screen.getByTitle('Lock activity to preserve it during AI refinement');
    fireEvent.click(lockButton);
    expect(handleToggleLock).toHaveBeenCalledWith('act-101');

    // Edit button
    const editButton = screen.getByTitle('Edit activity details');
    fireEvent.click(editButton);
    expect(handleEdit).toHaveBeenCalledWith(mockActivity);

    // Delete button
    const deleteButton = screen.getByTitle('Delete activity');
    fireEvent.click(deleteButton);
    expect(handleDelete).toHaveBeenCalledWith('act-101');

    // Rerender as locked
    rerender(
      <ActivityCard
        activity={mockActivity}
        isLocked={true}
        onToggleLock={handleToggleLock}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
    expect(screen.getByTitle('Locked: AI refinement will not replace this activity')).toBeInTheDocument();
  });

  it('renders TripOverview summary metrics and interests', () => {
    render(<TripOverview trip={mockTrip} itinerary={mockItinerary} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // 5 Days
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 People
    expect(screen.getByText('Shrines')).toBeInTheDocument();
    expect(screen.getByText('Matcha Tea')).toBeInTheDocument();
    expect(screen.getByText('Gardens')).toBeInTheDocument();
  });

  it('renders ExportTripMenu and shows multi-format export buttons', () => {
    render(<ExportTripMenu itineraryId="itin-888" tripTitle="Kyoto Trip" />);

    const exportBtn = screen.getByText('Export');
    fireEvent.click(exportBtn);

    expect(screen.getByText('PDF Publication Dossier')).toBeInTheDocument();
    expect(screen.getByText('Markdown Notes')).toBeInTheDocument();
    expect(screen.getByText('iCalendar (.ics)')).toBeInTheDocument();
    expect(screen.getByText('Structured JSON')).toBeInTheDocument();
  });

  it('renders CollaboratorManager and displays companion invite controls', () => {
    render(
      <CollaboratorManager
        tripId="trip-999"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Trip Collaborators & Friends')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('friend@wanderai.app')).toBeInTheDocument();
    expect(screen.getByText('Invite')).toBeInTheDocument();
  });
});
