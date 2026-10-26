"""
Pydantic schemas for Smart Travel Route Optimization and Scheduling.
Validates inputs, geographic points, time constraints, scheduled legs, and comparison metrics.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

class LocationCoordinate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)

class RouteStopInput(BaseModel):
    id: str = Field(..., description="Unique stop or activity identifier")
    name: str = Field(..., min_length=1, max_length=250, description="Stop name")
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    duration_minutes: int = Field(default=90, ge=10, le=720, description="Estimated duration at this stop")
    time_window_start: Optional[str] = Field(default=None, description="Earliest visit time (HH:MM)")
    time_window_end: Optional[str] = Field(default=None, description="Latest visit time (HH:MM)")
    priority: str = Field(default="normal", description="high | normal | low")
    is_fixed_time: bool = Field(default=False, description="Whether the start time is locked/inflexible")
    category: str = Field(default="sightseeing")
    estimated_cost: Optional[float] = Field(default=0.0, ge=0)
    accessibility_requirements: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class RouteOptimizeRequest(BaseModel):
    stops: List[RouteStopInput] = Field(..., min_length=1, description="List of stops to order and optimize")
    travel_pace: str = Field(default="moderate", description="relaxed | moderate | fast")
    start_location: Optional[RouteStopInput] = Field(default=None, description="Fixed departure point (e.g. hotel)")
    end_location: Optional[RouteStopInput] = Field(default=None, description="Fixed return point (e.g. hotel)")
    day_start_time: str = Field(default="09:00", description="Day start time (HH:MM)")
    day_end_time: str = Field(default="21:00", description="Day end time (HH:MM)")
    transit_mode: str = Field(default="driving", description="driving | walking | transit")

class RouteLeg(BaseModel):
    from_stop_id: str
    to_stop_id: str
    distance_km: float
    transit_minutes: int
    calculation_method: str = "haversine_approximation"

class ScheduledStop(BaseModel):
    id: str
    name: str
    category: str = "sightseeing"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sequence_order: int
    arrival_time: str
    start_time: str
    end_time: str
    departure_time: str
    duration_minutes: int
    transit_from_previous_minutes: int = 0
    distance_from_previous_km: float = 0.0
    time_slot: str = "morning"
    estimated_cost: Optional[float] = 0.0
    is_break: bool = False
    notes: Optional[str] = None

class RouteComparisonMetric(BaseModel):
    original_distance_km: float
    optimized_distance_km: float
    distance_saved_km: float
    distance_improvement_pct: Optional[float] = None
    original_transit_minutes: int
    optimized_transit_minutes: int
    transit_time_saved_minutes: int
    transit_improvement_pct: Optional[float] = None
    backtracking_segments_reduced: int = 0
    conflicts_resolved: int = 0
    unscheduled_stops: List[str] = Field(default_factory=list)

class RouteScheduleResponse(BaseModel):
    trip_id: Optional[str] = None
    day_number: Optional[int] = 1
    date: Optional[str] = None
    stops: List[ScheduledStop] = Field(default_factory=list)
    total_distance_km: float = 0.0
    total_transit_minutes: int = 0
    total_visit_minutes: int = 0
    breaks: List[Dict[str, Any]] = Field(default_factory=list)
    optimization_method: str = "nearest_neighbor_with_2opt"
    distance_calculation_source: str = "haversine_approximation"
    warnings: List[str] = Field(default_factory=list)
    comparison: Optional[RouteComparisonMetric] = None

class RouteCompareRequest(BaseModel):
    original_stops: List[RouteStopInput] = Field(..., min_length=2)
    optimized_stops: List[RouteStopInput] = Field(..., min_length=2)
    travel_pace: str = Field(default="moderate")
