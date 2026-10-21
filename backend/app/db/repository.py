import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.db.client import get_supabase_client
from app.schemas.trip import TripCreate, TripUpdate
from app.schemas.itinerary import ActivityCreate, ActivityUpdate

# In-memory storage structures for test & offline development
_mem_trips: Dict[str, Dict[str, Any]] = {}
_mem_itineraries: Dict[str, Dict[str, Any]] = {}
_mem_days: Dict[str, Dict[str, Any]] = {}
_mem_activities: Dict[str, Dict[str, Any]] = {}
_mem_shares: Dict[str, Dict[str, Any]] = {}
_mem_profiles: Dict[str, Dict[str, Any]] = {}

class Repository:
    """Unified repository abstraction connecting to Supabase or fallback in-memory store."""

    def __init__(self):
        self.client = get_supabase_client()

    # --------------------------------------------------------------------------
    # TRIPS
    # --------------------------------------------------------------------------
    async def create_trip(self, user_id: str, data: TripCreate) -> Dict[str, Any]:
        trip_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        trip_dict = {
            "id": trip_id,
            "user_id": user_id,
            "title": data.title,
            "origin": data.origin,
            "destination": data.destination,
            "start_date": data.start_date.isoformat(),
            "end_date": data.end_date.isoformat(),
            "traveler_count": data.traveler_count,
            "budget_amount": data.budget_amount,
            "currency": data.currency,
            "travel_preferences": data.travel_preferences.model_dump(),
            "status": data.status,
            "created_at": now,
            "updated_at": now,
        }

        if self.client:
            try:
                res = self.client.table("trips").insert(trip_dict).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                print(f"[Supabase Trips Insert Error]: {e}, falling back to memory store")

        _mem_trips[trip_id] = trip_dict
        return trip_dict

    async def get_trips(self, user_id: str) -> List[Dict[str, Any]]:
        if self.client:
            try:
                res = self.client.table("trips").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                print(f"[Supabase Trips Fetch Error]: {e}, falling back to memory store")

        return [t for t in _mem_trips.values() if t.get("user_id") == user_id]

    async def get_trip_by_id(self, trip_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        if self.client:
            try:
                query = self.client.table("trips").select("*").eq("id", trip_id)
                if user_id:
                    query = query.eq("user_id", user_id)
                res = query.execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                print(f"[Supabase Trip Fetch Error]: {e}, falling back to memory store")

        trip = _mem_trips.get(trip_id)
        if trip and (user_id is None or trip.get("user_id") == user_id):
            return trip
        return None

    async def update_trip(self, trip_id: str, user_id: str, data: TripUpdate) -> Optional[Dict[str, Any]]:
        existing = await self.get_trip_by_id(trip_id, user_id)
        if not existing:
            return None

        update_fields = data.model_dump(exclude_unset=True)
        if "start_date" in update_fields and update_fields["start_date"]:
            update_fields["start_date"] = update_fields["start_date"].isoformat()
        if "end_date" in update_fields and update_fields["end_date"]:
            update_fields["end_date"] = update_fields["end_date"].isoformat()
        if "travel_preferences" in update_fields and update_fields["travel_preferences"]:
            update_fields["travel_preferences"] = update_fields["travel_preferences"]
        update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

        if self.client:
            try:
                res = self.client.table("trips").update(update_fields).eq("id", trip_id).eq("user_id", user_id).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                print(f"[Supabase Trip Update Error]: {e}")

        existing.update(update_fields)
        _mem_trips[trip_id] = existing
        return existing

    async def delete_trip(self, trip_id: str, user_id: str) -> bool:
        existing = await self.get_trip_by_id(trip_id, user_id)
        if not existing:
            return False

        if self.client:
            try:
                self.client.table("trips").delete().eq("id", trip_id).eq("user_id", user_id).execute()
            except Exception as e:
                print(f"[Supabase Trip Delete Error]: {e}")

        _mem_trips.pop(trip_id, None)
        # cascade delete itinerary records in memory
        itins_to_del = [i_id for i_id, itin in _mem_itineraries.items() if itin.get("trip_id") == trip_id]
        for i_id in itins_to_del:
            _mem_itineraries.pop(i_id, None)
        return True

    # --------------------------------------------------------------------------
    # ITINERARIES & DAYS & ACTIVITIES
    # --------------------------------------------------------------------------
    async def create_itinerary(
        self,
        trip_id: str,
        structured_itinerary: Dict[str, Any],
        provider: str = "groq"
    ) -> Dict[str, Any]:
        itin_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        itin_dict = {
            "id": itin_id,
            "trip_id": trip_id,
            "version": 1,
            "structured_itinerary": structured_itinerary,
            "generation_provider": provider,
            "created_at": now,
            "updated_at": now,
            "days": []
        }

        # Build day and activity rows
        days_data = structured_itinerary.get("days", [])
        stored_days = []
        for d in days_data:
            day_id = str(uuid.uuid4())
            day_dict = {
                "id": day_id,
                "itinerary_id": itin_id,
                "day_number": d.get("day_number", 1),
                "date": d.get("date", now[:10]),
                "summary": d.get("summary", ""),
                "notes": d.get("notes", ""),
                "created_at": now,
                "updated_at": now,
                "activities": []
            }
            activities_data = d.get("activities", [])
            for idx, act in enumerate(activities_data):
                act_id = str(uuid.uuid4())
                act_dict = {
                    "id": act_id,
                    "itinerary_day_id": day_id,
                    "name": act.get("name", "Untitled Activity"),
                    "description": act.get("description", ""),
                    "category": act.get("category", "sightseeing"),
                    "start_time": act.get("start_time", "09:00"),
                    "end_time": act.get("end_time", "11:00"),
                    "location_name": act.get("location_name", ""),
                    "latitude": act.get("latitude"),
                    "longitude": act.get("longitude"),
                    "estimated_cost": float(act.get("estimated_cost", 0.0)),
                    "currency": act.get("currency", "USD"),
                    "estimated_duration_minutes": int(act.get("estimated_duration_minutes", 90)),
                    "verification_status": act.get("verification_status", "estimated"),
                    "display_order": act.get("display_order", idx),
                    "created_at": now,
                    "updated_at": now,
                }
                day_dict["activities"].append(act_dict)
                _mem_activities[act_id] = act_dict

            stored_days.append(day_dict)
            _mem_days[day_id] = day_dict

        itin_dict["days"] = stored_days
        _mem_itineraries[itin_id] = itin_dict

        if self.client:
            try:
                # Save into Supabase tables
                self.client.table("itineraries").insert({
                    "id": itin_id,
                    "trip_id": trip_id,
                    "version": 1,
                    "structured_itinerary": structured_itinerary,
                    "generation_provider": provider,
                    "created_at": now,
                    "updated_at": now
                }).execute()
                for sd in stored_days:
                    self.client.table("itinerary_days").insert({
                        "id": sd["id"],
                        "itinerary_id": itin_id,
                        "day_number": sd["day_number"],
                        "date": sd["date"],
                        "summary": sd["summary"],
                        "notes": sd["notes"]
                    }).execute()
                    for sa in sd["activities"]:
                        self.client.table("activities").insert({
                            "id": sa["id"],
                            "itinerary_day_id": sd["id"],
                            "name": sa["name"],
                            "description": sa["description"],
                            "category": sa["category"],
                            "start_time": sa["start_time"],
                            "end_time": sa["end_time"],
                            "location_name": sa["location_name"],
                            "latitude": sa["latitude"],
                            "longitude": sa["longitude"],
                            "estimated_cost": sa["estimated_cost"],
                            "currency": sa["currency"],
                            "estimated_duration_minutes": sa["estimated_duration_minutes"],
                            "verification_status": sa["verification_status"],
                            "display_order": sa["display_order"]
                        }).execute()
            except Exception as e:
                print(f"[Supabase Itinerary Insert Error]: {e}")

        return itin_dict

    async def get_itinerary_by_id(self, itinerary_id: str) -> Optional[Dict[str, Any]]:
        itin = _mem_itineraries.get(itinerary_id)
        if itin:
            return itin

        if self.client:
            try:
                res = self.client.table("itineraries").select("*, itinerary_days(*, activities(*))").eq("id", itinerary_id).execute()
                if res.data:
                    data = res.data[0]
                    # Format to match schema
                    days = data.get("itinerary_days", [])
                    days.sort(key=lambda d: d.get("day_number", 0))
                    for d in days:
                        acts = d.get("activities", [])
                        acts.sort(key=lambda a: a.get("display_order", 0))
                        d["activities"] = acts
                    data["days"] = days
                    return data
            except Exception as e:
                print(f"[Supabase Get Itinerary Error]: {e}")
        return None

    async def get_itineraries_by_trip(self, trip_id: str) -> List[Dict[str, Any]]:
        matched = [i for i in _mem_itineraries.values() if i.get("trip_id") == trip_id]
        if matched:
            return matched

        if self.client:
            try:
                res = self.client.table("itineraries").select("*, itinerary_days(*, activities(*))").eq("trip_id", trip_id).order("version", desc=True).execute()
                if res.data:
                    for item in res.data:
                        days = item.get("itinerary_days", [])
                        days.sort(key=lambda d: d.get("day_number", 0))
                        for d in days:
                            acts = d.get("activities", [])
                            acts.sort(key=lambda a: a.get("display_order", 0))
                            d["activities"] = acts
                        item["days"] = days
                    return res.data
            except Exception as e:
                print(f"[Supabase Get Trip Itineraries Error]: {e}")
        return []

    async def update_activity(self, activity_id: str, data: ActivityUpdate) -> Optional[Dict[str, Any]]:
        act = _mem_activities.get(activity_id)
        if not act:
            return None

        update_fields = data.model_dump(exclude_unset=True)
        act.update(update_fields)
        act["updated_at"] = datetime.now(timezone.utc).isoformat()
        _mem_activities[activity_id] = act

        # Update in parent day & itinerary structured copy
        day_id = act.get("itinerary_day_id")
        if day_id and day_id in _mem_days:
            day = _mem_days[day_id]
            for i, a in enumerate(day["activities"]):
                if a["id"] == activity_id:
                    day["activities"][i] = act
                    break

        if self.client:
            try:
                self.client.table("activities").update(update_fields).eq("id", activity_id).execute()
            except Exception as e:
                print(f"[Supabase Activity Update Error]: {e}")

        return act

    async def delete_activity(self, activity_id: str) -> bool:
        act = _mem_activities.pop(activity_id, None)
        if not act:
            return False

        day_id = act.get("itinerary_day_id")
        if day_id and day_id in _mem_days:
            day = _mem_days[day_id]
            day["activities"] = [a for a in day["activities"] if a["id"] != activity_id]

        if self.client:
            try:
                self.client.table("activities").delete().eq("id", activity_id).execute()
            except Exception as e:
                print(f"[Supabase Activity Delete Error]: {e}")

        return True

    async def replace_day_activities(
        self,
        day_id: str,
        new_activities: List[Dict[str, Any]],
        new_summary: str = "",
        new_notes: str = ""
    ) -> Optional[Dict[str, Any]]:
        day = _mem_days.get(day_id)
        if not day:
            return None

        # Clean old activities from memory
        for a in day.get("activities", []):
            _mem_activities.pop(a["id"], None)

        now = datetime.now(timezone.utc).isoformat()
        created_acts = []
        for idx, act in enumerate(new_activities):
            act_id = str(uuid.uuid4())
            act_obj = {
                "id": act_id,
                "itinerary_day_id": day_id,
                "name": act.get("name", "New Activity"),
                "description": act.get("description", ""),
                "category": act.get("category", "sightseeing"),
                "start_time": act.get("start_time", "09:00"),
                "end_time": act.get("end_time", "11:00"),
                "location_name": act.get("location_name", ""),
                "latitude": act.get("latitude"),
                "longitude": act.get("longitude"),
                "estimated_cost": float(act.get("estimated_cost", 0.0)),
                "currency": act.get("currency", "USD"),
                "estimated_duration_minutes": int(act.get("estimated_duration_minutes", 90)),
                "verification_status": act.get("verification_status", "estimated"),
                "display_order": idx,
                "created_at": now,
                "updated_at": now
            }
            _mem_activities[act_id] = act_obj
            created_acts.append(act_obj)

        day["activities"] = created_acts
        if new_summary:
            day["summary"] = new_summary
        if new_notes:
            day["notes"] = new_notes
        day["updated_at"] = now
        _mem_days[day_id] = day

        # Also update day in itinerary
        itin_id = day.get("itinerary_id")
        if itin_id and itin_id in _mem_itineraries:
            for i, d in enumerate(_mem_itineraries[itin_id]["days"]):
                if d["id"] == day_id:
                    _mem_itineraries[itin_id]["days"][i] = day
                    break

        if self.client:
            try:
                self.client.table("activities").delete().eq("itinerary_day_id", day_id).execute()
                for a in created_acts:
                    self.client.table("activities").insert(a).execute()
                self.client.table("itinerary_days").update({
                    "summary": day["summary"],
                    "notes": day["notes"],
                    "updated_at": now
                }).eq("id", day_id).execute()
            except Exception as e:
                print(f"[Supabase Day Replace Error]: {e}")

        return day

    # --------------------------------------------------------------------------
    # SHARES
    # --------------------------------------------------------------------------
    async def create_share(
        self,
        trip_id: str,
        owner_id: str,
        token_hash: str,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        share_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        share_dict = {
            "id": share_id,
            "trip_id": trip_id,
            "owner_id": owner_id,
            "token_hash": token_hash,
            "expires_at": expires_at.isoformat() if expires_at else None,
            "revoked_at": None,
            "created_at": now
        }
        _mem_shares[token_hash] = share_dict

        if self.client:
            try:
                self.client.table("shares").insert(share_dict).execute()
            except Exception as e:
                print(f"[Supabase Share Insert Error]: {e}")

        return share_dict

    async def get_share_by_token_hash(self, token_hash: str) -> Optional[Dict[str, Any]]:
        share = _mem_shares.get(token_hash)
        if share:
            if share.get("revoked_at"):
                return None
            if share.get("expires_at"):
                exp = datetime.fromisoformat(share["expires_at"])
                if exp < datetime.now(timezone.utc):
                    return None
            return share

        if self.client:
            try:
                res = self.client.table("shares").select("*").eq("token_hash", token_hash).is_("revoked_at", "null").execute()
                if res.data:
                    share_row = res.data[0]
                    if share_row.get("expires_at"):
                        exp = datetime.fromisoformat(share_row["expires_at"])
                        if exp < datetime.now(timezone.utc):
                            return None
                    return share_row
            except Exception as e:
                print(f"[Supabase Get Share Error]: {e}")

        return None

    async def revoke_share(self, share_id: str, owner_id: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        found = False
        for k, v in _mem_shares.items():
            if v.get("id") == share_id and v.get("owner_id") == owner_id:
                v["revoked_at"] = now
                found = True

        if self.client:
            try:
                self.client.table("shares").update({"revoked_at": now}).eq("id", share_id).eq("owner_id", owner_id).execute()
                found = True
            except Exception as e:
                print(f"[Supabase Revoke Share Error]: {e}")

        return found

repository = Repository()
