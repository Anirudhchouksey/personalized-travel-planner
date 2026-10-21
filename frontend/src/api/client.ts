import {
  Trip,
  TripCreate,
  TripUpdate,
  Itinerary,
  ItineraryDay,
  Activity,
  ActivityUpdate,
  DestinationDiscoveryRequest,
  DestinationRecommendationResponse,
  ShareResponse,
  PublicShareView,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

let authToken: string | null = localStorage.getItem('travel_auth_token') || 'demo-token';

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('travel_auth_token', token);
  } else {
    localStorage.removeItem('travel_auth_token');
  }
};

export const getAuthToken = () => authToken;

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `API error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errorMessage = errorJson.detail || errorJson.message || errorMessage;
    } catch {
      // not JSON
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // System Health
  async getHealth() {
    return apiRequest<{ status: string; app: string; active_ai_provider: string }>('/health');
  },
  async getAiHealth() {
    return apiRequest<{ active_provider: string; providers: Record<string, any> }>('/api/v1/health/ai');
  },

  // Trips CRUD
  async getTrips(): Promise<Trip[]> {
    return apiRequest<Trip[]>('/api/v1/trips');
  },
  async getTrip(tripId: string): Promise<Trip> {
    return apiRequest<Trip>(`/api/v1/trips/${tripId}`);
  },
  async createTrip(data: TripCreate): Promise<Trip> {
    return apiRequest<Trip>('/api/v1/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateTrip(tripId: string, data: TripUpdate): Promise<Trip> {
    return apiRequest<Trip>(`/api/v1/trips/${tripId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteTrip(tripId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/trips/${tripId}`, {
      method: 'DELETE',
    });
  },

  // Itinerary Operations
  async generateItinerary(tripId: string, providerOverride?: string): Promise<Itinerary> {
    return apiRequest<Itinerary>(`/api/v1/trips/${tripId}/generate`, {
      method: 'POST',
      body: JSON.stringify({ provider_override: providerOverride }),
    });
  },
  async getTripItineraries(tripId: string): Promise<Itinerary[]> {
    return apiRequest<Itinerary[]>(`/api/v1/trips/${tripId}/itineraries`);
  },
  async getItinerary(itineraryId: string): Promise<Itinerary> {
    return apiRequest<Itinerary>(`/api/v1/itineraries/${itineraryId}`);
  },
  async updateActivity(itineraryId: string, activityId: string, data: ActivityUpdate): Promise<Activity> {
    return apiRequest<Activity>(`/api/v1/itineraries/${itineraryId}/activities/${activityId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  async deleteActivity(itineraryId: string, activityId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/itineraries/${itineraryId}/activities/${activityId}`, {
      method: 'DELETE',
    });
  },
  async regenerateDay(
    itineraryId: string,
    dayId: string,
    feedback: string,
    preserveActivityIds: string[] = []
  ): Promise<ItineraryDay> {
    return apiRequest<ItineraryDay>(`/api/v1/itineraries/${itineraryId}/days/${dayId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ feedback, preserve_activity_ids: preserveActivityIds }),
    });
  },

  // PDF Export
  async exportItineraryPdf(itineraryId: string, filename: string = 'Itinerary.pdf'): Promise<void> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}/api/v1/itineraries/${itineraryId}/export`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to generate PDF document');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // Sharing
  async createShare(tripId: string, expiresInDays: number = 30): Promise<ShareResponse> {
    return apiRequest<ShareResponse>('/api/v1/shares', {
      method: 'POST',
      body: JSON.stringify({ trip_id: tripId, expires_in_days: expiresInDays }),
    });
  },
  async getPublicShare(shareToken: string): Promise<PublicShareView> {
    return apiRequest<PublicShareView>(`/api/v1/shares/${shareToken}`);
  },
  async revokeShare(shareId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/shares/${shareId}`, {
      method: 'DELETE',
    });
  },

  // Destination Recommendations
  async discoverDestinations(data: DestinationDiscoveryRequest): Promise<DestinationRecommendationResponse> {
    return apiRequest<DestinationRecommendationResponse>('/api/v1/recommendations/destinations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
