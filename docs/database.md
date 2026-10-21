# Database Design & Migrations: Personalized Travel Itinerary Planner

## Overview
The application utilizes Supabase PostgreSQL with strict Row Level Security (RLS) enforcement.

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ TRIPS : "owns"
    PROFILES ||--o{ SAVED_PLACES : "saves"
    TRIPS ||--o{ ITINERARIES : "contains"
    TRIPS ||--o{ SHARES : "shared_via"
    ITINERARIES ||--o{ ITINERARY_DAYS : "schedules"
    ITINERARY_DAYS ||--o{ ACTIVITIES : "includes"

    PROFILES {
        uuid id PK
        text display_name
        text preferred_currency
        jsonb default_preferences
        timestamptz created_at
        timestamptz updated_at
    }

    TRIPS {
        uuid id PK
        uuid user_id FK
        text title
        text origin
        text destination
        date start_date
        date end_date
        int traveler_count
        numeric budget_amount
        text currency
        jsonb travel_preferences
        text status
        timestamptz created_at
        timestamptz updated_at
    }

    ITINERARIES {
        uuid id PK
        uuid trip_id FK
        int version
        jsonb structured_itinerary
        text generation_provider
        timestamptz created_at
        timestamptz updated_at
    }

    ITINERARY_DAYS {
        uuid id PK
        uuid itinerary_id FK
        int day_number
        date date
        text summary
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    ACTIVITIES {
        uuid id PK
        uuid itinerary_day_id FK
        text name
        text description
        text category
        text start_time
        text end_time
        text location_name
        float latitude
        float longitude
        numeric estimated_cost
        text currency
        int estimated_duration_minutes
        text verification_status
        int display_order
        timestamptz created_at
        timestamptz updated_at
    }

    SHARES {
        uuid id PK
        uuid trip_id FK
        uuid owner_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }
```

---

## 2. Row Level Security Policies Summary

| Table | Policy Name | Command | Rule |
| :--- | :--- | :--- | :--- |
| `profiles` | Users can view own profile | SELECT | `auth.uid() = id` |
| `profiles` | Users can update own profile | UPDATE | `auth.uid() = id` |
| `trips` | Users can manage own trips | ALL | `auth.uid() = user_id` |
| `trips` | Public read shared trip | SELECT | `EXISTS (SELECT 1 FROM shares WHERE shares.trip_id = trips.id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()))` |
| `itineraries` | Users can manage own itineraries | ALL | `EXISTS (SELECT 1 FROM trips WHERE trips.id = itineraries.trip_id AND trips.user_id = auth.uid())` |
| `itinerary_days` | Users can manage own days | ALL | Owner of parent trip |
| `activities` | Users can manage own activities | ALL | Owner of parent trip |
| `shares` | Owners manage shares | ALL | `auth.uid() = owner_id` |
| `shares` | Public lookup by token hash | SELECT | `revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())` |

---

## 3. Applying Migrations to Supabase

1. Open your project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **SQL Editor**.
3. Copy the contents of `supabase/schema.sql` and click **Run**.
4. Confirm in **Table Editor** that `profiles`, `trips`, `itineraries`, `itinerary_days`, `activities`, `saved_places`, and `shares` are created with RLS enabled.
