"""
FastAPI Router for Route Optimization, Scheduling, and Before/After Comparison.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import AuthenticatedUser, get_current_user
from app.core.exceptions import EntityNotFoundError, AuthorizationError
from app.db.repository import repository
from app.schemas.route import (
    RouteStopInput,
    RouteOptimizeRequest,
    RouteScheduleResponse,
    RouteCompareRequest,
    RouteComparisonMetric,
)
from app.schemas.itinerary import ItineraryResponse, ItineraryDay, ItineraryActivity
from app.services.route_optimizer import RouteOptimizer
from app.services.schedule_builder import ScheduleBuilder

router = APIRouter(prefix="/api/v1", tags=["Route Optimization"])

@router.post("/routes/optimize", status_code=status.HTTP_200_OK)
async def optimize_stops(
    payload: RouteOptimizeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Optimizes the visiting order of stops using Nearest-Neighbor and 2-opt heuristics.
    """
    optimized, legs, warnings = RouteOptimizer.optimize_stops(
        stops=payload.stops,
        start_location=payload.start_location,
        end_location=payload.end_location,
        transit_mode=payload.transit_mode
    )

    return {
        "optimized_stops": [s.model_dump() for s in optimized],
        "legs": [leg.model_dump() for leg in legs],
        "warnings": warnings,
        "calculation_method": "nearest_neighbor_with_2opt",
        "distance_source": "haversine_approximation"
    }

@router.post("/routes/schedule", response_model=RouteScheduleResponse, status_code=status.HTTP_200_OK)
async def create_timed_schedule(
    payload: RouteOptimizeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> RouteScheduleResponse:
    """
    Orders stops and creates a timed, pace-aware daily schedule with meal and rest breaks.
    """
    optimized, legs, warnings = RouteOptimizer.optimize_stops(
        stops=payload.stops,
        start_location=payload.start_location,
        end_location=payload.end_location,
        transit_mode=payload.transit_mode
    )

    schedule_resp = ScheduleBuilder.build_schedule(
        stops=optimized,
        legs=legs,
        travel_pace=payload.travel_pace,
        day_start_time=payload.day_start_time,
        day_end_time=payload.day_end_time
    )

    # Calculate comparison against initial order
    comparison = RouteOptimizer.compare_routes(
        original_stops=payload.stops,
        optimized_stops=optimized,
        transit_mode=payload.transit_mode
    )
    schedule_resp.comparison = comparison
    schedule_resp.warnings.extend(warnings)

    return schedule_resp

@router.post("/routes/compare", response_model=RouteComparisonMetric, status_code=status.HTTP_200_OK)
async def compare_route_sequences(
    payload: RouteCompareRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> RouteComparisonMetric:
    """
    Compares original vs optimized stop sequences, calculating distance and transit time saved.
    """
    return RouteOptimizer.compare_routes(
        original_stops=payload.original_stops,
        optimized_stops=payload.optimized_stops
    )

@router.post("/itineraries/{trip_id}/optimize", response_model=ItineraryResponse, status_code=status.HTTP_200_OK)
async def optimize_trip_itinerary(
    trip_id: str,
    travel_pace: str = "moderate",
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ItineraryResponse:
    """
    Optimizes the activity order of an existing itinerary day by day to reduce backtracking.
    Persists the updated sequence to the database repository.
    """
    # 1. Fetch trip and verify ownership
    trip = await repository.get_trip_by_id(trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found or access denied."
        )

    # 2. Fetch itinerary
    itins = await repository.get_itineraries_by_trip(trip_id)
    if not itins or len(itins) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No saved itinerary found for trip '{trip_id}'."
        )

    itin = itins[0]
    days = itin.get("days", [])

    optimized_days: List[Dict[str, Any]] = []

    for d in days:
        activities = d.get("activities", [])
        if len(activities) < 2:
            optimized_days.append(d)
            continue

        # Convert activities to RouteStopInput
        stops: List[RouteStopInput] = []
        for a in activities:
            stops.append(RouteStopInput(
                id=str(a.get("id")),
                name=a.get("name", "Activity"),
                latitude=a.get("latitude"),
                longitude=a.get("longitude"),
                duration_minutes=int(a.get("duration_minutes") or a.get("estimated_duration_minutes") or 90),
                category=a.get("category", "sightseeing"),
                estimated_cost=float(a.get("estimated_cost") or 0.0),
                time_window_start=a.get("start_time") if a.get("is_fixed_time") else None
            ))

        # Optimize order and schedule
        opt_stops, legs, _ = RouteOptimizer.optimize_stops(stops=stops)
        scheduled = ScheduleBuilder.build_schedule(
            stops=opt_stops,
            legs=legs,
            travel_pace=travel_pace,
            date_str=str(d.get("date")),
            day_number=d.get("day_number", 1)
        )

        # Map scheduled stops back to activity structures
        new_activities = []
        for s in scheduled.stops:
            orig = next((act for act in activities if str(act.get("id")) == str(s.id)), {})
            merged = dict(orig)
            merged.update({
                "name": s.name,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "time_slot": s.time_slot,
                "duration_minutes": s.duration_minutes,
                "travel_notes": s.notes or orig.get("travel_notes", "")
            })
            new_activities.append(merged)

        d_copy = dict(d)
        d_copy["activities"] = new_activities
        optimized_days.append(d_copy)

    # Update itinerary in repository
    updates = {
        "days": optimized_days,
        "structured_itinerary": {
            "days": optimized_days,
            "optimized": True
        }
    }
    updated_itin = await repository.update_itinerary(itin["id"], updates)

    # Format into ItineraryResponse
    return ItineraryResponse.model_validate(updated_itin or itin)

@router.get("/itineraries/{trip_id}/optimized", response_model=ItineraryResponse, status_code=status.HTTP_200_OK)
async def get_optimized_itinerary(
    trip_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> ItineraryResponse:
    """
    Retrieves the optimized itinerary for a trip.
    """
    trip = await repository.get_trip_by_id(trip_id, user_id=current_user.id)
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Trip '{trip_id}' not found or access denied."
        )

    itins = await repository.get_itineraries_by_trip(trip_id)
    if not itins or len(itins) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Itinerary for trip '{trip_id}' not found."
        )

    itin = itins[0]
    return ItineraryResponse.model_validate(itin)
