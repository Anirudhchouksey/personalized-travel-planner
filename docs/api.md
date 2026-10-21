# API Specification: Personalized Travel Itinerary Planner

## Overview
All endpoints conform to standard REST conventions, returning JSON responses and appropriate HTTP status codes.

Base URL (Local Development): `http://localhost:8000`

---

## 1. System & Health Endpoints

### `GET /health`
Liveness and readiness probe for Render and load balancers.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "app": "Personalized Travel Itinerary Planner",
  "env": "development",
  "active_ai_provider": "mock",
  "supabase_configured": false
}
```

### `GET /api/v1/health/ai`
Diagnostic check inspecting all registered LLM providers (Groq, Hugging Face, Ollama, Mock).
- **Response `200 OK`**:
```json
{
  "active_provider": "mock",
  "providers": {
    "groq": { "provider": "groq", "status": "missing_api_key", "configured": false },
    "huggingface": { "provider": "huggingface", "status": "missing_api_token", "configured": false },
    "ollama": { "provider": "ollama", "status": "unreachable", "configured": true },
    "mock": { "provider": "mock", "status": "ready", "configured": true }
  }
}
```

---

## 2. Trips Endpoints

### `POST /api/v1/trips`
Creates a trip record for the authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Autumn in Kyoto",
  "origin": "San Francisco",
  "destination": "Kyoto, Japan",
  "start_date": "2026-11-01",
  "end_date": "2026-11-05",
  "traveler_count": 2,
  "budget_amount": 2500,
  "currency": "USD",
  "travel_preferences": {
    "travel_vibe": "cultural",
    "travel_pace": "moderate",
    "interests": ["sightseeing", "food"],
    "preferred_transportation": ["walking", "public_transit"],
    "dietary_requirements": ["vegetarian"],
    "accessibility_requirements": [],
    "notes": "Low walking"
  }
}
```
- **Response `201 Created`**: Returns created `TripResponse` object.

### `GET /api/v1/trips`
Lists all trips owned by the current user.

### `GET /api/v1/trips/{trip_id}`
Retrieves a single trip record by ID.

### `PATCH /api/v1/trips/{trip_id}`
Updates editable fields of a trip (title, dates, budget, preferences).

### `DELETE /api/v1/trips/{trip_id}`
Deletes trip and cascades associated itineraries.

### `POST /api/v1/trips/{trip_id}/generate`
Triggers AI generation for the trip.
- **Request Body (optional)**:
```json
{
  "provider_override": "groq",
  "custom_instructions": "Prioritize tea ceremonies"
}
```
- **Response `200 OK`**: Returns complete `ItineraryResponse` with daily timeline.

---

## 3. Itineraries Endpoints

### `GET /api/v1/itineraries/{itinerary_id}`
Retrieves an itinerary and its nested days and activities.

### `PATCH /api/v1/itineraries/{itinerary_id}/activities/{activity_id}`
Updates single activity metadata (time, category, location, cost, description).

### `DELETE /api/v1/itineraries/{itinerary_id}/activities/{activity_id}`
Removes an activity from a day schedule.

### `POST /api/v1/itineraries/{itinerary_id}/days/{day_id}/regenerate`
Regenerates a single day's activities based on user prompt while preserving other days.
- **Request Body**:
```json
{
  "feedback": "Make this day more focused on outdoor parks and reduce walking",
  "preserve_activity_ids": []
}
```

### `POST /api/v1/itineraries/{itinerary_id}/export`
Generates and downloads a publication-grade PDF itinerary dossier.
- **Response**: `application/pdf` binary stream.

---

## 4. Destination Recommendations Endpoints

### `POST /api/v1/recommendations/destinations`
Recommends candidate destinations based on constraints.
- **Request Body**:
```json
{
  "travel_vibe": "cultural",
  "budget_amount": 2500,
  "currency": "USD",
  "duration_days": 7,
  "traveler_count": 2,
  "interests": ["history", "gastronomy", "museums"]
}
```

---

## 5. Sharing Endpoints

### `POST /api/v1/shares`
Generates an unguessable public share link.
- **Request Body**:
```json
{
  "trip_id": "uuid-here",
  "expires_in_days": 30
}
```

### `GET /api/v1/shares/{share_token}`
Public unauthenticated endpoint to view shared trip and schedule.

### `DELETE /api/v1/shares/{share_id}`
Revokes public share token.
