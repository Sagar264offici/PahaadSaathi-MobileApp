# PahaadSaathi — Database & PostGIS Schema Specification
**Database:** PostgreSQL 15+ with PostGIS  
**Platform:** Supabase Cloud  
**Migration Path:** `supabase/migrations/20261121000000_core_schema.sql`

---

## 1. Entities & Relational Architecture

### `profiles` & `user_roles`
- **Fields:** `id`, `name`, `phone`, `role`, `district`, `tehsil`, `panchayat`, `created_at`, `updated_at`.
- **Enforced Roles:** `citizen`, `tourist`, `community_moderator`, `verified_volunteer`, `field_responder`, `village_administrator`, `district_operator`, `district_admin`, `state_admin`, `super_admin`.

### `communities`
- **Fields:** `id`, `name`, `district`, `tehsil`, `panchayat`, `description`, `emergency_hotline`, `sdrf_base`, `boundary` (GEOMETRY Polygon, 4326).

### `incidents`
- **Fields:** `id`, `reporter_id`, `type`, `severity`, `description`, `location_name`, `latitude`, `longitude`, `location` (GEOMETRY Point, 4326), `accuracy_meters`, `status`, `verification_status`, `corroborations_count`.
- **Spatial Index:** `idx_incidents_location` using GiST.

### `help_requests`
- **Fields:** `id`, `community_id`, `requester_name`, `requester_phone`, `category`, `title`, `description`, `location`, `urgency`, `status`, `assigned_volunteer_id`.

### `emergency_resources` & `shelters`
- **Fields:** `id`, `community_id`, `name`, `category`, `address`, `phone`, `latitude`, `longitude`, `capacity`, `current_occupancy`, `is_operational`.

### `district_alerts` (Official Public Warnings)
- **Fields:** `id`, `sender_agency`, `sender_officer_name`, `target_district`, `target_region`, `category`, `headline_en`, `headline_hi`, `instructions_en`, `instructions_hi`, `severity`, `effective_until`, `approvals_required`, `approved_by` (array of signatures), `status`.

---

## 2. Row Level Security (RLS) Policies
- Unauthenticated citizens and tourists can read active incidents, communities, and approved public alerts.
- Only authenticated and role-verified District Operators/Admins can update verification status or authorize public warnings.
- Service role key is strictly forbidden in mobile clients; client requests use Supabase publishable anonymous key.
