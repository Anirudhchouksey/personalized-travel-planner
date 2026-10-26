"""
Multi-format itinerary exporter supporting PDF, Markdown, iCalendar (.ics), and JSON.
100% free and offline compatible.
"""
import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

from app.services.export.pdf_generator import pdf_exporter


class FormatExporter:
    """Exports travel itineraries to various publication and sync formats."""

    @classmethod
    def export(
        cls,
        trip: Dict[str, Any],
        itinerary: Dict[str, Any],
        format_type: str = "pdf"
    ) -> Tuple[io.BytesIO, str, str]:
        """
        Dispatches export to appropriate serializer.
        Returns: (io.BytesIO buffer, media_type, safe_filename)
        """
        fmt = (format_type or "pdf").lower()
        clean_dest = str(trip.get("destination", "Trip")).replace(" ", "_").replace(",", "")

        if fmt in ["markdown", "md"]:
            return cls._export_markdown(trip, itinerary, clean_dest)
        elif fmt in ["ics", "ical", "calendar"]:
            return cls._export_ics(trip, itinerary, clean_dest)
        elif fmt == "json":
            return cls._export_json(trip, itinerary, clean_dest)
        else:
            return cls._export_pdf(trip, itinerary, clean_dest)

    @classmethod
    def _export_pdf(cls, trip: Dict[str, Any], itinerary: Dict[str, Any], dest: str) -> Tuple[io.BytesIO, str, str]:
        buf = pdf_exporter.generate_pdf(trip=trip, itinerary=itinerary)
        return buf, "application/pdf", f"Itinerary_{dest}.pdf"

    @classmethod
    def _export_markdown(cls, trip: Dict[str, Any], itinerary: Dict[str, Any], dest: str) -> Tuple[io.BytesIO, str, str]:
        lines = []
        lines.append(f"# {trip.get('title', 'Travel Itinerary')}")
        lines.append("")
        lines.append(f"**Destination:** {trip.get('destination')}  ")
        lines.append(f"**Dates:** {trip.get('start_date')} to {trip.get('end_date')}  ")
        lines.append(f"**Travelers:** {trip.get('traveler_count', 1)}  ")
        if trip.get("budget_amount"):
            lines.append(f"**Budget:** ${trip.get('budget_amount')} {trip.get('currency', 'USD')}  ")
        lines.append(f"**Travel Vibe:** {trip.get('travel_preferences', {}).get('travel_vibe', 'Custom')}  ")
        lines.append(f"**Version:** v{itinerary.get('version', 1)}  ")
        lines.append("")
        lines.append("---")
        lines.append("")

        days = itinerary.get("days", [])
        for day in days:
            lines.append(f"## Day {day.get('day_number', 1)}: {day.get('date', '')}")
            if day.get("summary"):
                lines.append(f"*{day.get('summary')}*")
                lines.append("")

            acts = day.get("activities", [])
            if acts:
                lines.append("| Time | Activity | Category | Location | Cost |")
                lines.append("| :--- | :--- | :--- | :--- | :--- |")
                for a in acts:
                    time_slot = f"{a.get('start_time', '')} - {a.get('end_time', '')}".strip(" -")
                    name = a.get("name", "Activity")
                    cat = a.get("category", "").title()
                    loc = a.get("location_name", "Local")
                    cost = f"${a.get('estimated_cost', 0):.2f}" if a.get('estimated_cost') else "Free"
                    lines.append(f"| {time_slot} | **{name}** | {cat} | {loc} | {cost} |")
                lines.append("")

                # Activity descriptions
                for a in acts:
                    lines.append(f"### {a.get('name')}")
                    if a.get("description"):
                        lines.append(f"{a.get('description')}")
                    if a.get("travel_notes"):
                        lines.append(f"> **Notes:** {a.get('travel_notes')}")
                    lines.append("")

            lines.append("---")
            lines.append("")

        # Practical tips
        tips = itinerary.get("structured_itinerary", {}).get("practical_tips", [])
        if tips:
            lines.append("## Practical Destination Tips")
            for t in tips:
                lines.append(f"- {t}")
            lines.append("")

        content = "\n".join(lines).encode("utf-8")
        buf = io.BytesIO(content)
        return buf, "text/markdown", f"Itinerary_{dest}.md"

    @classmethod
    def _export_ics(cls, trip: Dict[str, Any], itinerary: Dict[str, Any], dest: str) -> Tuple[io.BytesIO, str, str]:
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//WanderAI Travel Planner//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            f"X-WR-CALNAME:{trip.get('title', 'Trip Itinerary')}"
        ]

        days = itinerary.get("days", [])
        for day in days:
            day_date_str = str(day.get("date", "")).replace("-", "")
            for act in day.get("activities", []):
                s_time = act.get("start_time", "09:00").replace(":", "")
                e_time = act.get("end_time", "10:30").replace(":", "")
                if len(s_time) == 4:
                    s_time += "00"
                if len(e_time) == 4:
                    e_time += "00"

                dt_start = f"{day_date_str}T{s_time}"
                dt_end = f"{day_date_str}T{e_time}"
                uid = f"act-{act.get('id', datetime.now(timezone.utc).timestamp())}@wanderai.app"

                summary = act.get("name", "Travel Activity").replace(",", "\\,")
                desc = act.get("description", "").replace("\n", "\\n").replace(",", "\\,")
                loc = act.get("location_name", trip.get("destination", "")).replace(",", "\\,")

                lines.append("BEGIN:VEVENT")
                lines.append(f"UID:{uid}")
                lines.append(f"DTSTAMP:{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}")
                lines.append(f"DTSTART:{dt_start}")
                lines.append(f"DTEND:{dt_end}")
                lines.append(f"SUMMARY:{summary}")
                lines.append(f"DESCRIPTION:{desc}")
                lines.append(f"LOCATION:{loc}")
                lines.append("STATUS:CONFIRMED")
                lines.append("END:VEVENT")

        lines.append("END:VCALENDAR")
        content = "\r\n".join(lines).encode("utf-8")
        buf = io.BytesIO(content)
        return buf, "text/calendar", f"Itinerary_{dest}.ics"

    @classmethod
    def _export_json(cls, trip: Dict[str, Any], itinerary: Dict[str, Any], dest: str) -> Tuple[io.BytesIO, str, str]:
        payload = {
            "trip": trip,
            "itinerary": itinerary,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "generator": "WanderAI"
        }
        content = json.dumps(payload, indent=2, default=str).encode("utf-8")
        buf = io.BytesIO(content)
        return buf, "application/json", f"Itinerary_{dest}.json"


format_exporter = FormatExporter()
