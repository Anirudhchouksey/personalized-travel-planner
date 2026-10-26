"""
Robust output parser and repair engine for LLM-generated travel itineraries.
"""
from datetime import datetime
import json
import re
from typing import Any, Dict, List, Optional, Union
from app.core.exceptions import LLMResponseMalformedError

class ItineraryOutputParser:
    """
    Parses, sanitizes, repairs, and standardizes raw output from LLM providers
    into structured itinerary schemas.
    """

    @classmethod
    def parse_raw(cls, data: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Takes raw string text or a pre-parsed dictionary and normalizes it.
        """
        if isinstance(data, dict):
            parsed = data
        elif isinstance(data, str):
            parsed = cls._extract_and_repair_json(data)
        else:
            raise LLMResponseMalformedError("Unsupported payload type for itinerary parsing.")

        return cls._normalize_itinerary_dict(parsed)

    @classmethod
    def _extract_and_repair_json(cls, text: str) -> Dict[str, Any]:
        cleaned = text.strip()

        # 1. Strip markdown fences: ```json ... ``` or ``` ... ```
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        else:
            # 2. Extract outermost { ... }
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start:end + 1]

        # 3. Clean common JSON syntax anomalies
        cleaned = re.sub(r",\s*([\]}])", r"\1", cleaned)  # trailing commas

        # 4. First parse attempt
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # 5. Bounded repair: attempt adding missing closing braces/brackets if truncated
        for suffix in [
            "}",
            "]}",
            "}]}",
            "\"}]}",
            "\"}]}]}",
            "\"}]}}",
            "\"}]}]",
            "}]}]}",
            "}]}}",
            "\"}",
            "\"]}",
            "\""
        ]:
            try:
                return json.loads(cleaned + suffix)
            except json.JSONDecodeError:
                continue

        raise LLMResponseMalformedError(f"Unable to parse or repair JSON. Excerpt: {cleaned[:200]}")

    @classmethod
    def _normalize_itinerary_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes internal days and activities, assigning missing IDs and calculating durations.
        """
        # Handle cases where root dictionary wrapped inside 'itinerary' or similar
        if "itinerary" in data and isinstance(data["itinerary"], dict):
            data = data["itinerary"]

        days = data.get("days") or []
        if not isinstance(days, list):
            days = []

        total_cost = 0.0

        normalized_days: List[Dict[str, Any]] = []
        for d_idx, day in enumerate(days, start=1):
            day_number = day.get("day_number") or d_idx
            date_val = day.get("date") or f"Day {day_number}"
            title = day.get("title") or f"Day {day_number} Exploration"
            summary = day.get("summary") or ""

            raw_acts = day.get("activities") or []
            normalized_acts: List[Dict[str, Any]] = []

            for a_idx, act in enumerate(raw_acts, start=1):
                act_id = act.get("id") or f"act-{day_number}-{a_idx}"
                name = act.get("name") or f"Activity {a_idx}"
                category = act.get("category", "sightseeing").lower()
                time_slot = act.get("time_slot", "morning").lower()
                if time_slot not in ("morning", "afternoon", "evening", "night"):
                    time_slot = "morning"

                start_time = cls._clean_time(act.get("start_time"), default="09:00")
                end_time = cls._clean_time(act.get("end_time"), default="11:00")
                duration = act.get("duration_minutes") or cls._calculate_duration(start_time, end_time, default=90)

                cost_val = act.get("estimated_cost")
                cost = float(cost_val) if cost_val is not None else 0.0
                total_cost += cost

                # Extract or compute approximate coordinates
                lat = act.get("latitude")
                lng = act.get("longitude")
                try:
                    lat = float(lat) if lat is not None else None
                    lng = float(lng) if lng is not None else None
                except (ValueError, TypeError):
                    lat, lng = None, None

                # Fallback city coordinate estimation if coordinates omitted by LLM
                if lat is None or lng is None:
                    loc_text = f"{name} {act.get('location', '')} {data.get('destination', '')}".lower()
                    city_centers = {
                        "paris": (48.8566, 2.3522),
                        "tokyo": (35.6762, 139.6503),
                        "new york": (40.7128, -74.0060),
                        "nyc": (40.7128, -74.0060),
                        "london": (51.5074, -0.1278),
                        "rome": (41.9028, 12.4964),
                        "kyoto": (35.0116, 135.7681),
                        "barcelona": (41.3851, 2.1734),
                        "amsterdam": (52.3676, 4.9041),
                        "dubai": (25.2048, 55.2708),
                        "singapore": (1.3521, 103.8198),
                        "san francisco": (37.7749, -122.4194),
                        "delhi": (28.6139, 77.2090),
                        "berlin": (52.5200, 13.4050),
                        "sydney": (-33.8688, 151.2093),
                    }
                    for city, (c_lat, c_lng) in city_centers.items():
                        if city in loc_text:
                            lat = round(c_lat + (a_idx * 0.007) - 0.018, 6)
                            lng = round(c_lng + ((a_idx % 2 * 2 - 1) * 0.009), 6)
                            break

                normalized_acts.append({
                    "id": act_id,
                    "name": name,
                    "category": category,
                    "time_slot": time_slot,
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration_minutes": duration,
                    "location": act.get("location") or act.get("location_name") or "",
                    "latitude": lat,
                    "longitude": lng,
                    "description": act.get("description") or "",
                    "estimated_cost": cost,
                    "travel_notes": act.get("travel_notes") or "",
                    "accessibility_notes": act.get("accessibility_notes") or ""
                })

            normalized_days.append({
                "day_number": day_number,
                "date": date_val,
                "title": title,
                "summary": summary,
                "activities": normalized_acts
            })

        return {
            "days": normalized_days,
            "estimated_total_cost": data.get("estimated_total_cost") or round(total_cost, 2)
        }

    @staticmethod
    def _clean_time(val: Any, default: str) -> str:
        if not val or not isinstance(val, str):
            return default
        m = re.search(r"(\d{1,2}):(\d{2})", val)
        if m:
            hour = int(m.group(1))
            minute = int(m.group(2))
            return f"{hour:02d}:{minute:02d}"
        return default

    @staticmethod
    def _calculate_duration(start: str, end: str, default: int = 90) -> int:
        try:
            t1 = datetime.strptime(start, "%H:%M")
            t2 = datetime.strptime(end, "%H:%M")
            mins = int((t2 - t1).total_seconds() / 60)
            return mins if mins > 0 else default
        except Exception:
            return default
