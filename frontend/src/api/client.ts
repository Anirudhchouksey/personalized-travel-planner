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
  RefinementRequest,
  RefinementResponse,
  ItineraryVersionItem,
  ItineraryVersionListResponse,
  Collaborator,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

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

  // Conversational Refinement & Version History
  async refineItinerary(tripId: string, data: RefinementRequest): Promise<RefinementResponse> {
    return apiRequest<RefinementResponse>(`/api/v1/itineraries/${tripId}/refine`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getItineraryVersions(tripId: string): Promise<ItineraryVersionListResponse> {
    return apiRequest<ItineraryVersionListResponse>(`/api/v1/itineraries/${tripId}/versions`);
  },

  async restoreItineraryVersion(tripId: string, version: number): Promise<Itinerary> {
    return apiRequest<Itinerary>(`/api/v1/itineraries/${tripId}/versions/${version}/restore`, {
      method: 'POST',
    });
  },

  async getItineraryVersionSnapshot(tripId: string, version: number): Promise<any> {
    return apiRequest<any>(`/api/v1/itineraries/${tripId}/versions/${version}`);
  },

  // Multi-format Export (PDF/HTML, Markdown, iCal .ics, JSON)
  async exportItinerary(
    itineraryId: string,
    format: 'pdf' | 'markdown' | 'ics' | 'json' = 'pdf',
    filename?: string
  ): Promise<void> {
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const response = await fetch(`${API_BASE}/api/v1/itineraries/${itineraryId}/export?format=${format}`, {
      method: 'POST',
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to export itinerary in ${format.toUpperCase()} format`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;

    const extMap: Record<string, string> = {
      pdf: 'html',
      markdown: 'md',
      ics: 'ics',
      json: 'json',
    };
    link.download = filename || `Itinerary.${extMap[format] || format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  async exportItineraryPdf(itineraryId: string, filename: string = 'Itinerary.html'): Promise<void> {
    return this.exportItinerary(itineraryId, 'pdf', filename);
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

  // Collaborators
  async getCollaborators(tripId: string): Promise<Collaborator[]> {
    return apiRequest<Collaborator[]>(`/api/v1/trips/${tripId}/collaborators`);
  },

  async addCollaborator(tripId: string, email: string, role: 'viewer' | 'editor' = 'viewer'): Promise<Collaborator> {
    return apiRequest<Collaborator>(`/api/v1/trips/${tripId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  },

  async updateCollaborator(tripId: string, collaboratorId: string, role: 'viewer' | 'editor'): Promise<Collaborator> {
    return apiRequest<Collaborator>(`/api/v1/trips/${tripId}/collaborators/${collaboratorId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async removeCollaborator(tripId: string, collaboratorId: string): Promise<void> {
    return apiRequest<void>(`/api/v1/trips/${tripId}/collaborators/${collaboratorId}`, {
      method: 'DELETE',
    });
  },

  // Destination & Activity Recommendations
  async discoverDestinations(data: DestinationDiscoveryRequest): Promise<DestinationRecommendationResponse> {
    return apiRequest<DestinationRecommendationResponse>('/api/v1/recommendations/destinations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async recommendActivities(data: any): Promise<any> {
    return apiRequest<any>('/api/v1/recommendations/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async refineRecommendations(data: any): Promise<any> {
    return apiRequest<any>('/api/v1/recommendations/refine', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // History Management
  async getHistory(): Promise<{ history: any[]; total_count: number }> {
    return apiRequest<{ history: any[]; total_count: number }>('/api/v1/history');
  },
  async getHistoryItem(id: string): Promise<any> {
    return apiRequest<any>(`/api/v1/history/${id}`);
  },

  // Route Optimization & Pacing
  async optimizeRoute(stops: any[], pace: string = 'moderate', transitMode: string = 'driving') {
    return apiRequest<{
      optimized_stops: any[];
      legs: any[];
      warnings: string[];
      calculation_method: string;
      distance_source: string;
    }>('/api/v1/routes/optimize', {
      method: 'POST',
      body: JSON.stringify({ stops, travel_pace: pace, transit_mode: transitMode }),
    });
  },
  async scheduleRoute(stops: any[], pace: string = 'moderate', dayStartTime: string = '09:00', dayEndTime: string = '21:00') {
    return apiRequest<any>('/api/v1/routes/schedule', {
      method: 'POST',
      body: JSON.stringify({ stops, travel_pace: pace, day_start_time: dayStartTime, day_end_time: dayEndTime }),
    });
  },
  async optimizeTripItinerary(tripId: string, travelPace: string = 'moderate') {
    return apiRequest<Itinerary>(`/api/v1/itineraries/${tripId}/optimize?travel_pace=${travelPace}`, {
      method: 'POST',
    });
  },
  async getOptimizedItinerary(tripId: string) {
    return apiRequest<Itinerary>(`/api/v1/itineraries/${tripId}/optimized`);
  },
  async compareRoutes(originalStops: any[], optimizedStops: any[], pace: string = 'moderate') {
    return apiRequest<any>('/api/v1/routes/compare', {
      method: 'POST',
      body: JSON.stringify({ original_stops: originalStops, optimized_stops: optimizedStops, travel_pace: pace }),
    });
  },

  // Authentication
  async register(data: { email: string; password: string; display_name?: string; preferred_currency?: string }) {
    const res = await apiRequest<{ access_token: string; user: any }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },

  async login(data: { email: string; password: string }) {
    const res = await apiRequest<{ access_token: string; user: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.access_token) {
      setAuthToken(res.access_token);
    }
    return res;
  },
};

// Export tripsAPI directly for trip lifecycle operations
export const tripsAPI = {
  getTrips: api.getTrips,
  getTrip: api.getTrip,
  getTripById: api.getTrip,
  createTrip: api.createTrip,
  updateTrip: api.updateTrip,
  deleteTrip: api.deleteTrip,
  generateItinerary: api.generateItinerary,
  getTripItineraries: api.getTripItineraries,
  getCollaborators: api.getCollaborators,
  addCollaborator: api.addCollaborator,
  removeCollaborator: api.removeCollaborator,
  getHistory: api.getHistory,
  getHistoryItem: api.getHistoryItem,
  recommendActivities: api.recommendActivities,
  refineRecommendations: api.refineRecommendations,
};
