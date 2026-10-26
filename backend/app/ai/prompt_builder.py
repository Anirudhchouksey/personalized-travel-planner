"""
Prompt engineering layer for Google Gemini Flash and LLM itinerary generation.
Constructs rich, context-aware prompt templates incorporating pace, mobility, dietary, and budget rules.
"""
from typing import Any, Dict, List, Optional, Tuple

class PromptBuilder:
    """
    Constructs standardized system instructions and user prompts for itinerary generation.
    """

    SYSTEM_INSTRUCTION = """You are an expert AI Travel Specialist and Itinerary Planner.
Your mission is to generate realistic, personalized, and balanced day-by-day travel schedules.

Key Rules & Constraints:
1. Activity Ordering: Structure each day chronologically into logical morning (08:30-12:00), afternoon (12:00-17:30), and evening (17:30-22:00) blocks.
2. Pacing:
   - Relaxed: 1-2 key activities per day, generous breaks, no rushed transit.
   - Moderate: 3-4 activities per day with dedicated lunch and dinner breaks.
   - Fast: 4-5 activities per day, high efficiency, optimized geographical clustering.
3. Realistic Timings & Meal Breaks: Include appropriate time for lunch (approx 12:30-14:00) and dinner (approx 18:30-20:30). Ensure reasonable travel intervals between locations.
4. Dietary & Mobility Non-Negotiables: Respect all dietary restrictions (halal, vegan, kosher, gluten-free, etc.) and accessibility needs (wheelchair ramps, elevator access, low walking distance).
5. Grounded Factual Truth: Distinguish estimated costs from verified pricing. NEVER invent real-time reservation availability, live ticket prices, or guaranteed opening hours. Mark unverified details as estimated.
6. Geographical Coordinates: You MUST provide realistic numeric decimal latitude and longitude (e.g. 48.8584, 2.2945 for Paris landmarks) for each activity so they accurately map and sequence.
7. Format: Output MUST be strictly valid JSON conforming exactly to the requested schema with NO markdown fences, no conversational prose."""

    @classmethod
    def build_itinerary_prompt(
        cls,
        preferences: Dict[str, Any],
        custom_instructions: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Builds the system instruction and user prompt for full itinerary generation.
        """
        destination = preferences.get("destination", "Unknown Destination")
        start_date = preferences.get("start_date", "Day 1")
        end_date = preferences.get("end_date", "Day 3")
        total_days = preferences.get("total_days") or preferences.get("duration_days", 3)
        budget = preferences.get("budget", "moderate")
        travel_pace = preferences.get("travel_pace") or preferences.get("pace", "moderate")
        traveler_type = preferences.get("traveler_type") or preferences.get("travel_style", "solo")
        group_size = preferences.get("group_size", 1)
        interests = preferences.get("interests", ["sightseeing", "culture", "food"])
        if isinstance(interests, list):
            interests_str = ", ".join(interests)
        else:
            interests_str = str(interests)

        dietary = preferences.get("dietary_preferences") or preferences.get("dietary_restrictions", [])
        if isinstance(dietary, list):
            dietary_str = ", ".join(dietary) if dietary else "None"
        else:
            dietary_str = str(dietary) or "None"

        accessibility = preferences.get("accessibility_requirements") or preferences.get("accessibility_notes", "Standard mobility")
        transportation = preferences.get("transportation_preference") or preferences.get("preferred_transportation", "Public transit & walking")
        selected_attractions = preferences.get("selected_attractions", [])
        attractions_str = ", ".join(selected_attractions) if selected_attractions else "Top local highlights"

        prompt = f"""Generate a personalized {total_days}-day travel itinerary for:
- Destination: {destination}
- Dates: From {start_date} to {end_date} ({total_days} total days)
- Budget Tier / Limit: {budget}
- Travel Pace: {travel_pace}
- Group Profile: {traveler_type} (Group Size: {group_size})
- Core Interests: {interests_str}
- Dietary Requirements: {dietary_str}
- Accessibility & Mobility Needs: {accessibility}
- Transportation Mode: {transportation}
- Priority Highlights to Include: {attractions_str}
"""
        if custom_instructions:
            prompt += f"\nAdditional User Instructions: {custom_instructions}\n"

        prompt += """
Required JSON Output Schema:
{
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Descriptive day headline",
      "summary": "Brief summary of the day flow",
      "activities": [
        {
          "id": "act-1-1",
          "name": "Activity or Venue Name",
          "category": "sightseeing | dining | adventure | culture | shopping | relaxation",
          "time_slot": "morning | afternoon | evening",
          "start_time": "09:00",
          "end_time": "11:30",
          "duration_minutes": 150,
          "location": "Specific location or neighborhood",
          "latitude": 48.8584,
          "longitude": 2.2945,
          "description": "Engaging description of experience and highlights",
          "estimated_cost": 20.0,
          "travel_notes": "Transit directions, walking distance, or route tips",
          "accessibility_notes": "Wheelchair, ramp, or seating details"
        }
      ]
    }
  ],
  "estimated_total_cost": 250.0
}
Ensure every requested day from 1 to {total_days} is fully detailed. Return strictly the JSON object.
""".replace("{total_days}", str(total_days))

        return cls.SYSTEM_INSTRUCTION, prompt

    @classmethod
    def build_conversational_refinement_prompt(
        cls,
        destination: str,
        current_days: List[Dict[str, Any]],
        user_message: str,
        target_day: Optional[int] = None,
        preserve_activity_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Builds a conversational prompt for refining itineraries while preserving user-locked activities
        and building upon existing choices.
        """
        prefs = preferences or {}
        vibe = prefs.get("travel_vibe") or prefs.get("travel_style") or "balanced"
        pace = prefs.get("travel_pace") or "moderate"

        locked_clause = ""
        if preserve_activity_ids:
            locked_clause = f"LOCKED ACTIVITIES (DO NOT REMOVE OR CHANGE THESE): {', '.join(preserve_activity_ids)}\n"

        target_clause = ""
        if target_day:
            target_clause = f"PRIMARY FOCUS: Modify Day {target_day}. Keep other days consistent unless necessary.\n"

        history_clause = ""
        if conversation_history:
            history_lines = [f"- {msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-3:]]
            history_clause = "Recent Conversation:\n" + "\n".join(history_lines) + "\n"

        # Simplified snapshot of current days
        days_snapshot = []
        for d in current_days:
            acts = [f"{a.get('name')} ({a.get('category')}, ${a.get('estimated_cost', 0)}) [ID: {a.get('id')}]" for a in d.get("activities", [])]
            days_snapshot.append(f"Day {d.get('day_number')} ({d.get('date')}): {', '.join(acts)}")
        current_itinerary_str = "\n".join(days_snapshot)

        prompt = f"""You are interactively refining an existing travel itinerary for {destination}.
Travel Style / Vibe: {vibe}
Travel Pace: {pace}
{target_clause}{locked_clause}{history_clause}
Current Itinerary Snapshot:
{current_itinerary_str}

User's Modification Instruction:
"{user_message}"

Refinement Rules:
1. Build upon the current itinerary. Only replace, add, or alter activities that are directly related to the user's request.
2. If activities are listed as locked, preserve them exactly.
3. Keep timings balanced with realistic meal and travel intervals.
4. Provide a friendly, concise assistant message explaining what was adjusted and why.

Output strictly valid JSON with this format:
{{
  "assistant_message": "Friendly explanation of what you updated based on the request",
  "summary_of_changes": ["Bullet 1 describing change", "Bullet 2 describing change"],
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Day Title",
      "summary": "Summary",
      "activities": [
        {{
          "id": "act-1-1",
          "name": "Activity Name",
          "category": "sightseeing | dining | adventure | culture",
          "time_slot": "morning | afternoon | evening",
          "start_time": "09:00",
          "end_time": "11:30",
          "duration_minutes": 150,
          "location": "Location",
          "description": "Description",
          "estimated_cost": 20.0,
          "travel_notes": "Notes",
          "accessibility_notes": "Accessibility"
        }}
      ]
    }}
  ],
  "estimated_total_cost": 250.0
}}
"""
        return cls.SYSTEM_INSTRUCTION, prompt

    @classmethod
    def build_route_optimization_prompt(
        cls,
        stops: List[Dict[str, Any]],
        destination: str,
        travel_pace: str = "moderate",
        start_location: Optional[str] = None,
        end_location: Optional[str] = None,
        transit_mode: str = "driving",
        constraints: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Builds a structured prompt asking Gemini Flash to recommend a sensible visiting sequence
        and identify potential timing conflicts or geographic disconnects.
        """
        stops_summary = []
        for s in stops:
            stops_summary.append(
                f"- ID: {s.get('id')}, Name: {s.get('name')}, Category: {s.get('category', 'sightseeing')}, "
                f"Duration: {s.get('duration_minutes', 90)} mins, Preferred Window: {s.get('time_window_start', 'Any')}-{s.get('time_window_end', 'Any')}"
            )
        stops_str = "\n".join(stops_summary)

        prompt = f"""You are optimizing the daily activity sequence for a trip in {destination}.
Travel Pace: {travel_pace}
Transit Mode: {transit_mode}
Starting Point: {start_location or 'First location'}
Ending Point: {end_location or 'Final location'}

Activities to Order:
{stops_str}
"""
        if constraints:
            prompt += f"\nSpecific Constraints: {constraints}\n"

        prompt += """
Instructed Objectives:
1. Recommend a geographically logical sequence minimizing unnecessary backtracking.
2. Group nearby spots and allow realistic transition breaks.
3. Identify possible conflicts (e.g., closing times, tight transitions).

Return strictly JSON matching this structure:
{
  "recommended_sequence_ids": ["id-1", "id-2", "..."],
  "insights": "Short explanation of sequence logic",
  "potential_conflicts": ["List any identified timing or distance conflicts"]
}
"""
        return cls.SYSTEM_INSTRUCTION, prompt


    @classmethod
    def build_day_regeneration_prompt(
        cls,
        destination: str,
        day_number: int,
        date_str: str,
        feedback: str,
        existing_activities: List[Dict[str, Any]]
    ) -> Tuple[str, str]:
        """
        Builds a targeted prompt to regenerate a single day while maintaining itinerary cohesion.
        """
        prompt = f"""Regenerate Day {day_number} ({date_str}) of the itinerary for {destination}.
User Feedback / Requested Modifications:
"{feedback}"

Current activities for context:
{existing_activities}

Return strictly a JSON object for this single day in this format:
{{
  "day_number": {day_number},
  "date": "{date_str}",
  "title": "Updated Day Title",
  "summary": "Updated day summary based on feedback",
  "activities": [
    {{
      "id": "act-{day_number}-1",
      "name": "Activity Name",
      "category": "sightseeing | dining | adventure | culture",
      "time_slot": "morning | afternoon | evening",
      "start_time": "09:00",
      "end_time": "11:00",
      "duration_minutes": 120,
      "location": "Location Name",
      "description": "Description",
      "estimated_cost": 15.0,
      "travel_notes": "Transit notes",
      "accessibility_notes": "Accessibility details"
    }}
  ]
}}
"""
        return cls.SYSTEM_INSTRUCTION, prompt

    @classmethod
    def build_conversational_refinement_prompt(
        cls,
        destination: str,
        current_days: List[Dict[str, Any]],
        user_message: str,
        target_day: Optional[int] = None,
        preserve_activity_ids: Optional[List[str]] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        preferences: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, str]:
        """
        Builds a conversational prompt for refining itineraries while preserving user-locked activities
        and building upon existing choices.
        """
        prefs = preferences or {}
        vibe = prefs.get("travel_vibe") or prefs.get("travel_style") or "balanced"
        pace = prefs.get("travel_pace") or "moderate"

        locked_clause = ""
        if preserve_activity_ids:
            locked_clause = f"LOCKED ACTIVITIES (DO NOT REMOVE OR CHANGE THESE): {', '.join(preserve_activity_ids)}\n"

        target_clause = ""
        if target_day:
            target_clause = f"PRIMARY FOCUS: Modify Day {target_day}. Keep other days consistent unless necessary.\n"

        history_clause = ""
        if conversation_history:
            history_lines = [f"- {msg.get('role', 'user')}: {msg.get('content', '')}" for msg in conversation_history[-3:]]
            history_clause = "Recent Conversation:\n" + "\n".join(history_lines) + "\n"

        # Simplified snapshot of current days
        days_snapshot = []
        for d in current_days:
            acts = [f"{a.get('name')} ({a.get('category')}, ${a.get('estimated_cost', 0)}) [ID: {a.get('id')}]" for a in d.get("activities", [])]
            days_snapshot.append(f"Day {d.get('day_number')} ({d.get('date')}): {', '.join(acts)}")
        current_itinerary_str = "\n".join(days_snapshot)

        prompt = f"""You are interactively refining an existing travel itinerary for {destination}.
Travel Style / Vibe: {vibe}
Travel Pace: {pace}
{target_clause}{locked_clause}{history_clause}
Current Itinerary Snapshot:
{current_itinerary_str}

User's Modification Instruction:
"{user_message}"

Refinement Rules:
1. Build upon the current itinerary. Only replace, add, or alter activities that are directly related to the user's request.
2. If activities are listed as locked, preserve them exactly.
3. Keep timings balanced with realistic meal and travel intervals.
4. Provide a friendly, concise assistant message explaining what was adjusted and why.

Output strictly valid JSON with this format:
{{
  "assistant_message": "Friendly explanation of what you updated based on the request",
  "summary_of_changes": ["Bullet 1 describing change", "Bullet 2 describing change"],
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "title": "Day Title",
      "summary": "Summary",
      "activities": [
        {{
          "id": "act-1-1",
          "name": "Activity Name",
          "category": "sightseeing | dining | adventure | culture",
          "time_slot": "morning | afternoon | evening",
          "start_time": "09:00",
          "end_time": "11:30",
          "duration_minutes": 150,
          "location": "Location",
          "description": "Description",
          "estimated_cost": 20.0,
          "travel_notes": "Notes",
          "accessibility_notes": "Accessibility"
        }}
      ]
    }}
  ],
  "estimated_total_cost": 250.0
}}
"""
        return cls.SYSTEM_INSTRUCTION, prompt

    @classmethod
    def build_route_optimization_prompt(
        cls,
        stops: List[Dict[str, Any]],
        destination: str,
        travel_pace: str = "moderate",
        start_location: Optional[str] = None,
        end_location: Optional[str] = None,
        transit_mode: str = "driving",
        constraints: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Builds a structured prompt asking Gemini Flash to recommend a sensible visiting sequence
        and identify potential timing conflicts or geographic disconnects.
        """
        stops_summary = []
        for s in stops:
            stops_summary.append(
                f"- ID: {s.get('id')}, Name: {s.get('name')}, Category: {s.get('category', 'sightseeing')}, "
                f"Duration: {s.get('duration_minutes', 90)} mins, Preferred Window: {s.get('time_window_start', 'Any')}-{s.get('time_window_end', 'Any')}"
            )
        stops_str = "\n".join(stops_summary)

        prompt = f"""You are optimizing the daily activity sequence for a trip in {destination}.
Travel Pace: {travel_pace}
Transit Mode: {transit_mode}
Starting Point: {start_location or 'First location'}
Ending Point: {end_location or 'Final location'}

Activities to Order:
{stops_str}
"""
        if constraints:
            prompt += f"\nSpecific Constraints: {constraints}\n"

        prompt += """
Instructed Objectives:
1. Recommend a geographically logical sequence minimizing unnecessary backtracking.
2. Group nearby spots and allow realistic transition breaks.
3. Identify possible conflicts (e.g., closing times, tight transitions).

Return strictly JSON matching this structure:
{
  "recommended_sequence_ids": ["id-1", "id-2", "..."],
  "insights": "Short explanation of sequence logic",
  "potential_conflicts": ["List any identified timing or distance conflicts"]
}
"""
        return cls.SYSTEM_INSTRUCTION, prompt

