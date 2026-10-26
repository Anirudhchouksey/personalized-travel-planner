# API Documentation: WanderAI Travel Planner

All endpoints follow RESTful conventions, accept/return JSON, and strictly validate inputs via Zod.

Base URL (Local): `http://localhost:8000`

---

## 1. System Health

### `GET /health`
Liveness and readiness check.
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "status": "healthy",
  "app": "WanderAI - Personalized Travel Itinerary Planner",
  "timestamp": "2026-10-24T00:30:00.000Z",
  "backend_mode": "in-memory-demo",
  "active_ai_provider": "Mock AI (Built-in Demo Mode)",
  "active_routing_provider": "openstreetmap-osrm"
}
```

### `GET /api/v1/health/ai`
Diagnostic check inspecting AI and routing capabilities.
- **Status Code**: `200 OK`

---

## 2. Destination Recommendations

### `POST /api/v1/recommendations/destinations`
Calculates high-alignment destinations based on traveler vibe, duration, budget, and interests.
- **Request Body**:
```json
{
  "origin": "San Francisco",
  "travel_vibe": "cultural",
  "travel_style": "standard",
  "budget_amount": 2500,
  "currency": "USD",
  "duration_days": 6,
  "traveler_count": 2,
  "interests": ["Art & History Museums", "Local Gastronomy"]
}
```
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "recommendations": [
    {
      "destination": "Kyoto",
      "country": "Japan",
      "match_score": 98,
      "tagline": "Centuries of tranquil temples, bamboo groves, and traditional tea ceremonies",
      "highlights": ["Fushimi Inari Shrine", "Arashiyama Bamboo Grove"],
      "estimated_cost_range": "USD 1,600 - 2,400",
      "best_season": "Spring (Cherry Blossoms) or Autumn",
      "reasoning": "Exceptional match for cultural immersion with over 1,600 historic Buddhist temples.",
      "suggested_duration_days": 6,
      "accessibility_rating": "Moderate",
      "estimated_budget_breakdown": {
        "daily_accommodation": 110,
        "daily_food": 45,
        "daily_activities": 30,
        "daily_transport": 15,
        "total_estimated": 1200,
        "currency": "USD"
      }
    }
  ],
  "generated_at": "2026-10-24T00:30:00.000Z",
  "provider_used": "Mock AI (Built-in Demo Mode)"
}
```

---

## 3. Trips CRUD

### `GET /api/v1/trips`
Lists all saved trips for the authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Status Code**: `200 OK`

### `POST /api/v1/trips`
Creates a new trip and validates preferences.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "title": "Autumn in Kyoto",
  "origin": "SFO",
  "destination": "Kyoto, Japan",
  "start_date": "2026-11-10",
  "end_date": "2026-11-15",
  "traveler_count": 2,
  "budget_amount": 3200,
  "currency": "USD",
  "travel_preferences": {
    "travel_vibe": "cultural",
    "travel_pace": "moderate",
    "travel_style": "standard",
    "interests": ["Temples", "Gardens"],
    "preferred_transportation": ["Transit"],
    "dietary_requirements": [],
    "accessibility_requirements": []
  }
}
```
- **Status Code**: `201 Created`

### `GET /api/v1/trips/:id`
Retrieves a single trip record.
- **Status Code**: `200 OK` (or `404 Not Found`)

### `PATCH /api/v1/trips/:id`
Updates trip properties or preferences.
- **Status Code**: `200 OK`

### `DELETE /api/v1/trips/:id`
Deletes a trip and its itineraries.
- **Status Code**: `204 No Content`

---

## 4. Itineraries & Activities

### `POST /api/v1/trips/:tripId/generate`
Generates a structured, day-wise itinerary, calculates distances, optimizes route orders, and computes budget breakdowns.
- **Status Code**: `201 Created`

### `GET /api/v1/trips/:tripId/itineraries`
Lists all generated itinerary versions for a trip.
- **Status Code**: `200 OK`

### `GET /api/v1/itineraries/:id`
Fetches a specific itinerary with nested days and activities.
- **Status Code**: `200 OK`

### `PATCH /api/v1/itineraries/:id/activities/:activityId`
Updates activity title, duration, notes, times, or costs.
- **Status Code**: `200 OK`

### `DELETE /api/v1/itineraries/:id/activities/:activityId`
Removes an activity and recalculates the day's order.
- **Status Code**: `204 No Content`

### `POST /api/v1/itineraries/:id/days/:dayId/regenerate`
Regenerates an individual day schedule with custom traveler feedback while optionally preserving selected activities.
- **Request Body**:
```json
{
  "feedback": "Make this day more culinary-focused with artisan bakeries and quiet tea rooms",
  "preserve_activity_ids": []
}
```
- **Status Code**: `200 OK`

---

## 5. Exports

### `POST /api/v1/itineraries/:id/export?format={format}`
Exports the itinerary in multiple supported formats.
- **Query Parameter `format`**:
  - `pdf` (default): Printable HTML dossier formatted for browser print-to-PDF
  - `markdown`: Clean Markdown dossier
  - `ics`: Standard iCalendar file importable into Google / Apple Calendar
  - `json`: Raw structured JSON
- **Status Code**: `200 OK` with appropriate `Content-Type` and `Content-Disposition`.

---

## 6. Shares

### `POST /api/v1/shares`
Generates a secure public share link token.
- **Request Body**:
```json
{
  "trip_id": "11111111-1111-1111-1111-111111111111",
  "expires_in_days": 30
}
```
- **Status Code**: `201 Created`

### `GET /api/v1/shares/:token`
Public endpoint allowing anyone with the token to view the trip and itinerary.
- **Status Code**: `200 OK` (or `404 Not Found` if expired/revoked)

### `DELETE /api/v1/shares/:id`
Revokes an active share link.
- **Status Code**: `204 No Content`
