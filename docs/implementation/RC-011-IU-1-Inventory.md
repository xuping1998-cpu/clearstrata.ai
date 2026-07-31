# RC-011 IU-1 — Migration Drift Inventory

| Field | Value |
|-------|-------|
| **Program** | RC-011 Migration History Reconciliation |
| **Implementation Unit** | **IU-1** — Migration Drift Inventory |
| **Mode** | Read-only (no DDL, no history mutation, no db push) |
| **Authoritative Source** | [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) **Revision v1.0** |
| **Linked Supabase project** | `wqohkxtqozscmwfrryfl` |
| **Inventory date** | 2026-07-30 |
| **DB migration head** | `20261326120000` (`nomination_eligibility_live_members`) |
| **Repo migration head** | `20261728120000` (`e01_iu32_resolution_snapshot_immutability`) |
| **Pending migrations inventoried** | **16** (`20261327120000` → `20261728120000`) |

> **Document class:** Authoritative object-level inventory for IU-2 classification. This document records catalog facts only. It does **not** assign BACKFILL_OK, REPAIR_REQUIRED, APPLY_REQUIRED, or other reconciliation verdicts.

---

## 1. Method

Three sources were compared for each pending migration:

1. **Repository migration file** — objects declared in `supabase/migrations/<version>_*.sql`
2. **`supabase_migrations.schema_migrations`** — deploy ledger row presence
3. **Live PostgreSQL catalog** — `information_schema`, `pg_*` views queried via `npx supabase db query --linked` (read-only)

Object categories inventoried per migration: tables, columns, indexes, constraints, foreign keys, policies, triggers, functions, views, grants.

---

## 2. Global ledger state

| Check | Result |
|-------|--------|
| Pending migration count (repo head − DB head) | 16 |
| All 16 repo files present | **Yes** |
| Any pending migration has `schema_migrations` row | **No** |
| `schema_migrations` row count (linked DB) | 187 |
| Last recorded version | `20261326120000` |

---

## 3. OOB object register

Objects matching pending-migration intent are present in the live catalog **without** a corresponding `schema_migrations` history row. Listed for cross-migration reference; attributed to owning migration in §4.

| Object kind | Object name | Owning migration (repo) | History row |
|-------------|-------------|-------------------------|-------------|
| Table | `public.governance_matters` | `20261704120000` | Absent |
| Table | `public.governance_matter_revisions` | `20261704120000` | Absent |
| Table | `public.governance_matter_comments` | `20261704120000` | Absent |
| Table | `public.governance_matter_comment_moderation` | `20261704120000` | Absent |
| Table | `public.governance_matter_cda_reports` | `20261704130000` | Absent |
| Table | `public.community_resolutions` | `20261706120000` | Absent |
| Table | `public.community_resolution_revisions` | `20261706120000` | Absent |
| Table | `public.governance_matter_subscriptions` | `20261707120000` | Absent |
| Table | `public.sgm_pause_email_deliveries` | `20261422120000` | Absent |
| Table | `public.owner_vote_voter_snapshot` | `20261724120000` (also pre-dates E-01 in production) | Absent |
| Function | `public.council_actions_workflow_audit()` | `20261330120000` | Absent |
| Function | `public.council_actions_created_audit()` | `20261330120000` | Absent |
| Trigger | `trg_council_actions_workflow_audit` | `20261330120000` | Absent |
| Trigger | `trg_council_actions_created_audit` | `20261330120000` | Absent |

---

## 4. Statement-collision register (catalog objects vs migration SQL)

When a catalog object already exists and the migration file uses a **non-idempotent** `CREATE` (no `IF NOT EXISTS`, no preceding `DROP IF EXISTS`), sequential re-execution of that statement would raise a duplicate-object error. Recorded here as inventory evidence only.

| Migration | Catalog object | Migration statement form | Catalog state |
|-----------|----------------|--------------------------|---------------|
| `20261422120000` | Policy `sgm_pause_email_deliveries_select_staff` | `CREATE POLICY` | Present |
| `20261704120000` | Policies `gm_select_tenant`, `gm_insert_council`, `gm_update_council`, `gm_rev_select_tenant`, `gm_comment_select_tenant`, `gm_comment_insert_member`, `gm_mod_select_staff` | `CREATE POLICY` | All present |
| `20261704120000` | Triggers `trg_governance_matter_touch`, `trg_governance_matter_revision_insert`, `trg_governance_matter_revision_update`, `trg_governance_matter_comment_immutable` | `CREATE TRIGGER` (no `DROP IF EXISTS` for touch/insert/update/comment) | All present |
| `20261704130000` | Policy `gm_cda_select_tenant` | `CREATE POLICY` | Present |
| `20261706120000` | Policies `cr_select_tenant`, `cr_insert_council`, `cr_update_council`, `cr_rev_select_tenant` | `CREATE POLICY` | All present |
| `20261707120000` | Policies `gms_select_own`, `gms_insert_own_member`, `gms_delete_own` | `CREATE POLICY` | All present |
| `20261723140000` | Policies `mfr_audit_select_tenant`, `mfr_audit_insert_staff` | `CREATE POLICY` | Absent (table absent) |

Migrations using predominantly idempotent forms (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`) are noted per record in §5.

---

## 5. Per-migration inventory records

---

### 5.1 — `20261327120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261327120000` |
| **Migration filename** | `20261327120000_council_action_manager_bridge.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Columns** | `manager_tasks.source_type`, `manager_tasks.source_id`, `manager_tasks.council_action_id`; `council_actions.manager_task_id` |
| **Indexes** | `idx_manager_tasks_source`, `idx_manager_tasks_action`, `idx_manager_tasks_council_action_unique` |
| **Constraints** | `manager_tasks_task_type_check` (extended enum incl. `follow_up`); FK `manager_tasks.council_action_id` → `council_actions`; FK `council_actions.manager_task_id` → `manager_tasks` |
| **Comments** | Column comments on six bridge columns |

#### Objects found

All expected columns, indexes, FKs, and `manager_tasks_task_type_check` (includes `follow_up` in allowed values).

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- Columns: `information_schema.columns` — all six bridge columns present on `manager_tasks` / `council_actions`
- Indexes: `pg_indexes` — `idx_manager_tasks_source`, `idx_manager_tasks_action`, `idx_manager_tasks_council_action_unique`
- Constraint: `pg_get_constraintdef` on `manager_tasks_task_type_check` — 12-value enum including `follow_up`
- FKs: `manager_tasks_council_action_id_fkey`, `council_actions_manager_task_id_fkey` in `pg_constraint`

---

### 5.2 — `20261328120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261328120000` |
| **Migration filename** | `20261328120000_manager_feedback_rollup.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Columns** | `manager_tasks.manager_feedback`, `manager_tasks.manager_feedback_at`, `manager_tasks.manager_feedback_by` |
| **FKs** | `manager_tasks.manager_feedback_by` → `auth.users` |
| **Comments** | Three column comments |

#### Objects found

All three columns present (`text`, `timestamptz`, `uuid`). FK `manager_tasks_manager_feedback_by_fkey` present.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.columns` query on `manager_tasks` feedback columns — 3/3 present
- `pg_constraint` — `manager_tasks_manager_feedback_by_fkey`

---

### 5.3 — `20261329120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261329120000` |
| **Migration filename** | `20261329120000_council_review_queue.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Columns** | `council_actions.review_status` (NOT NULL, default `not_ready`), `reviewed_by`, `reviewed_at`, `review_note` |
| **Constraints** | `council_actions_review_status_check` |
| **FKs** | `council_actions.reviewed_by` → `auth.users` |
| **Comments** | Four column comments |

#### Objects found

All four columns present. `review_status` NOT NULL with default `'not_ready'::text`. Constraint `council_actions_review_status_check` present. FK `council_actions_reviewed_by_fkey` present.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.columns` — review queue columns on `council_actions`
- `pg_constraint` — `council_actions_review_status_check`, `council_actions_reviewed_by_fkey`

---

### 5.4 — `20261330120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261330120000` |
| **Migration filename** | `20261330120000_council_actions_created_audit_trigger.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Functions** | `public.council_actions_workflow_audit()`, `public.council_actions_created_audit()` |
| **Triggers** | `trg_council_actions_workflow_audit` (BEFORE UPDATE on `council_actions`); `trg_council_actions_created_audit` (AFTER INSERT on `council_actions`) |

#### Objects found

Both functions present. Both triggers present on `public.council_actions`. Migration uses `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` and `CREATE OR REPLACE FUNCTION`.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `pg_proc` — `council_actions_workflow_audit`, `council_actions_created_audit`
- `pg_trigger` — both triggers on `council_actions` (only non-internal triggers on table)
- Repo file — idempotent trigger replacement pattern

---

### 5.5 — `20261422120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261422120000` |
| **Migration filename** | `20261422120000_sgm_pause_email_deliveries.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `public.sgm_pause_email_deliveries` |
| **Indexes** | `idx_sgm_pause_email_deliveries_meeting_user`, `idx_sgm_pause_email_deliveries_property` |
| **Constraints** | PK; `sgm_pause_email_deliveries_meeting_user_attempt_unique`; `status` CHECK (`sent`, `failed`); `attempt_no` CHECK; FKs to `meetings`, `properties`, `profiles` |
| **Policies** | `sgm_pause_email_deliveries_select_staff` |
| **RLS** | Enabled on table |

#### Objects found

Table present. Both indexes present. RLS enabled (`relrowsecurity = true`). Policy `sgm_pause_email_deliveries_select_staff` present. Unique constraint and status CHECK present.

#### Objects missing

None identified at object-existence level.

#### Extra objects

None attributed to this migration.

#### Partial objects

| Object | Expected (migration file) | Catalog state |
|--------|----------------------------|---------------|
| `sgm_pause_email_deliveries_status_check` | Initial migration: `status IN ('sent', 'failed')` | `CHECK ((status = ANY (ARRAY['sent'::text, 'failed'::text])))` — matches this migration; does not include `'sending'` (added in `20261423120000`) |

#### Evidence

- `information_schema.tables` — table exists
- `pg_indexes` — both indexes
- `pg_policy` — `sgm_pause_email_deliveries_select_staff`
- `pg_get_constraintdef` — status CHECK (sent/failed only)
- §4 collision register — policy `CREATE POLICY` without guard; policy exists in catalog

---

### 5.6 — `20261423120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261423120000` |
| **Migration filename** | `20261423120000_sgm_pause_delivery_sending_claim.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Constraints** | `sgm_pause_email_deliveries_status_check` replaced to allow `sending`, `sent`, `failed` |
| **Functions** | `public.claim_sgm_pause_email_delivery(uuid, uuid, uuid, text, integer)` |
| **Grants** | `REVOKE ALL` from PUBLIC; `GRANT EXECUTE` to `service_role` |
| **Comments** | Updated table comment |

#### Objects found

Table `sgm_pause_email_deliveries` exists (dependency from prior migration). Status CHECK present but **does not** include `sending`.

#### Objects missing

| Kind | Objects |
|------|---------|
| **Functions** | `public.claim_sgm_pause_email_delivery(...)` |
| **Grants** | EXECUTE grant on above function to `service_role` |

#### Extra objects

None attributed to this migration.

#### Partial objects

| Object | Expected | Catalog state |
|--------|----------|---------------|
| `sgm_pause_email_deliveries_status_check` | `status IN ('sending', 'sent', 'failed')` | `status IN ('sent', 'failed')` only |

#### Evidence

- `SELECT EXISTS(... claim_sgm_pause_email_delivery ...)` → `false`
- `pg_get_constraintdef` on `sgm_pause_email_deliveries_status_check` — no `'sending'`
- Prerequisite table/indexes from `20261422120000` present

---

### 5.7 — `20261704120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261704120000` |
| **Migration filename** | `20261704120000_governance_matters.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `governance_matters`, `governance_matter_revisions`, `governance_matter_comments`, `governance_matter_comment_moderation` |
| **Indexes** | `idx_governance_matters_property_status`, `idx_governance_matters_property_created`, `idx_governance_matter_revisions_matter`, `idx_governance_matter_comments_matter`, `idx_governance_matter_comment_mod_comment` |
| **Functions** | `governance_matter_next_revision_no`, `governance_matter_log_revision_insert`, `governance_matter_log_revision_update`, `governance_matter_touch_last_revision`, `governance_matter_comment_immutable`, `moderate_governance_matter_comment` |
| **Triggers** | `trg_governance_matter_touch`, `trg_governance_matter_revision_insert`, `trg_governance_matter_revision_update`, `trg_governance_matter_comment_immutable` |
| **Policies** | `gm_select_tenant`, `gm_insert_council`, `gm_update_council`, `gm_rev_select_tenant`, `gm_comment_select_tenant`, `gm_comment_insert_member`, `gm_mod_select_staff` |
| **Grants** | Table grants to `authenticated` / `service_role`; `GRANT EXECUTE` on `moderate_governance_matter_comment` to `authenticated` |
| **RLS** | Enabled on all four tables |

#### Objects found

All four tables present. All five indexes present. All six functions present. All four triggers present. All seven policies present. RLS enabled on all four tables. `has_function_privilege('authenticated', 'moderate_governance_matter_comment(uuid,text,text)', 'EXECUTE')` → `true`.

#### Objects missing

None identified at object-existence level.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified at object-existence level.

#### Evidence

- `information_schema.tables` — four governance tables
- `pg_indexes` — five expected indexes
- `pg_proc` — six functions
- `pg_trigger` — four triggers
- `pg_policy` — seven policies
- `pg_class.relrowsecurity` — RLS true on all four tables
- §4 collision register — seven policies and four triggers use non-idempotent `CREATE`

---

### 5.8 — `20261704130000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261704130000` |
| **Migration filename** | `20261704130000_governance_matter_cda.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `governance_matter_cda_reports` |
| **Indexes** | `idx_governance_matter_cda_reports_matter`, `idx_governance_matter_cda_reports_property` |
| **Functions** | `governance_matter_cda_report_immutable()` |
| **Triggers** | `trg_governance_matter_cda_report_immutable` |
| **Policies** | `gm_cda_select_tenant` |
| **Grants** | SELECT to `authenticated`; ALL to `service_role` |
| **RLS** | Enabled |

#### Objects found

Table, both indexes, function, trigger, policy present. RLS enabled.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- Catalog queries — table, indexes, function, trigger, policy all present
- Migration uses `DROP TRIGGER IF EXISTS` before trigger create
- §4 collision register — policy `gm_cda_select_tenant` uses non-idempotent `CREATE POLICY`; present in catalog

---

### 5.9 — `20261706120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261706120000` |
| **Migration filename** | `20261706120000_community_resolutions.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `community_resolutions`, `community_resolution_revisions` |
| **Columns** | `governance_matters.resolution_id`; `meeting_agenda_items.community_resolution_id`; conditional `owner_vote_resolutions.community_resolution_id`; conditional `meeting_votes.community_resolution_id` |
| **Indexes** | `idx_community_resolutions_property`, `_matter`, `_meeting`; `idx_community_resolution_revisions_resolution`; `idx_governance_matters_resolution`; `idx_meeting_agenda_items_community_resolution`; conditional `idx_owner_vote_resolutions_community_resolution`; conditional `idx_meeting_votes_community_resolution` |
| **Functions** | `community_resolution_next_revision_no`, `community_resolution_log_revision_insert`, `community_resolution_log_revision_update` |
| **Triggers** | `trg_community_resolution_revision_insert`, `trg_community_resolution_revision_update` |
| **Policies** | `cr_select_tenant`, `cr_insert_council`, `cr_update_council`, `cr_rev_select_tenant` |
| **Grants** | Table grants on both tables |
| **RLS** | Enabled on both tables |

#### Objects found

Both tables present. Bridge column `governance_matters.resolution_id` present. `meeting_agenda_items.community_resolution_id` present. `owner_vote_resolutions.community_resolution_id` and `meeting_votes.community_resolution_id` present. All listed indexes present. All three functions and both triggers present. All four policies present. RLS enabled.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.tables` — both community resolution tables
- `information_schema.columns` — bridge columns on four parent tables
- `pg_indexes` — all seven expected indexes including conditional ones
- `pg_proc`, `pg_trigger`, `pg_policy` — functions, triggers, policies present
- Triggers use `DROP TRIGGER IF EXISTS` pattern in migration file
- §4 collision register — four policies use non-idempotent `CREATE POLICY`; all present

---

### 5.10 — `20261707120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261707120000` |
| **Migration filename** | `20261707120000_governance_matter_subscriptions.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `governance_matter_subscriptions` |
| **Indexes** | `idx_governance_matter_subscriptions_matter_id`, `_user_id`, `_property_id` |
| **Constraints** | `governance_matter_subscriptions_unique` |
| **Policies** | `gms_select_own`, `gms_insert_own_member`, `gms_delete_own` |
| **Grants** | SELECT, INSERT, DELETE to `authenticated`; ALL to `service_role` |
| **RLS** | Enabled |

#### Objects found

Table present. All three indexes present. Unique constraint present (as index `governance_matter_subscriptions_unique`). All three policies present. RLS enabled.

#### Objects missing

None identified.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- Catalog table/index/policy queries — all present
- §4 collision register — three policies use non-idempotent `CREATE POLICY`; all present

---

### 5.11 — `20261723140000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261723140000` |
| **Migration filename** | `20261723140000_meeting_formal_resolution_authoring.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Columns** | `meeting_agenda_items.formal_resolution_version`, `formal_resolution_state`, `formal_resolution_modified_by`, `formal_resolution_modified_at` |
| **Constraints** | `meeting_agenda_items_formal_resolution_state_check` |
| **Tables** | `meeting_formal_resolution_audit` |
| **Indexes** | `idx_meeting_formal_resolution_audit_agenda`, `idx_meeting_formal_resolution_audit_meeting` |
| **Policies** | `mfr_audit_select_tenant`, `mfr_audit_insert_staff` |
| **Grants** | SELECT, INSERT on audit table to `authenticated`; ALL to `service_role` |
| **RLS** | Enabled on audit table |

#### Objects found

None of the expected objects from this migration.

#### Objects missing

All expected objects listed above.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.tables` — `meeting_formal_resolution_audit` absent
- `information_schema.columns` on `meeting_agenda_items` — no `formal_resolution_*` columns (only pre-existing `community_resolution_id`)
- `pg_policy` — no `mfr_audit_*` policies

---

### 5.12 — `20261724120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261724120000` |
| **Migration filename** | `20261724120000_e01_iu11_snapshot_domain_schema.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Columns** | `owner_vote_meetings.snapshot_frozen_at` |
| **Tables** | `owner_vote_voter_snapshot` (9-column production contract) |
| **Indexes** | `idx_owner_vote_voter_snapshot_meeting_id`, `_meeting_user`, `_meeting_eligible`, `_meeting_unit_norm` |
| **FKs** | Conditional `owner_vote_voter_snapshot_meeting_id_fkey`, `owner_vote_voter_snapshot_property_id_fkey` |
| **Policies** | `ovvs_select_tenant_member` (only if no existing policies) |
| **Grants** | SELECT to `authenticated`; ALL to `service_role` |
| **RLS** | Enabled on `owner_vote_voter_snapshot` |

#### Objects found

| Kind | Objects |
|------|---------|
| **Columns** | `owner_vote_meetings.snapshot_frozen_at` present |
| **Tables** | `owner_vote_voter_snapshot` present (44 rows) |
| **FKs** | `owner_vote_voter_snapshot_meeting_id_fkey`, `owner_vote_voter_snapshot_property_id_fkey` present |
| **RLS** | Enabled |
| **Grants** | Standard role privileges present via Supabase defaults |

#### Objects missing

| Kind | Objects |
|------|---------|
| **Indexes** | `idx_owner_vote_voter_snapshot_meeting_id`, `idx_owner_vote_voter_snapshot_meeting_user`, `idx_owner_vote_voter_snapshot_meeting_eligible`, `idx_owner_vote_voter_snapshot_meeting_unit_norm` |
| **Policies** | `ovvs_select_tenant_member` (migration guard skipped creation because other policies exist) |

#### Extra objects

| Kind | Objects |
|------|---------|
| **Indexes** | `idx_owner_vote_snapshot_property`, `idx_owner_vote_snapshot_user`, `uq_owner_vote_snapshot_meeting_unit` |
| **FKs** | `owner_vote_voter_snapshot_user_id_fkey` |
| **Policies** | `owner_vote_snapshot_owner_select`, `owner_vote_snapshot_staff_select` |

#### Partial objects

| Object | Note |
|--------|------|
| `owner_vote_voter_snapshot` table | Present with 9 columns matching migration `CREATE TABLE` definition; production naming/index/policy set differs from migration file defaults |
| Conditional FK block | Migration may skip FK add when orphans exist — FKs present including extra `user_id` FK |

#### Evidence

- `information_schema.columns` — `snapshot_frozen_at` on `owner_vote_meetings`; 9 columns on `owner_vote_voter_snapshot`
- `SELECT COUNT(*) FROM owner_vote_voter_snapshot` → **44**
- `pg_indexes` on `owner_vote_voter_snapshot` — four production indexes (names differ from migration)
- `pg_policy` — `owner_vote_snapshot_owner_select`, `owner_vote_snapshot_staff_select` (not `ovvs_select_tenant_member`)
- `pg_constraint` FKs — meeting, property, user

---

### 5.13 — `20261725120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261725120000` |
| **Migration filename** | `20261725120000_e01_iu21_freeze_event_identity.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `owner_vote_freeze_events` |
| **Columns** | `owner_vote_voter_snapshot.freeze_event_id` |
| **Indexes** | `owner_vote_freeze_events_one_primary_per_meeting`, `idx_owner_vote_freeze_events_meeting_id`, `idx_owner_vote_freeze_events_property_id`, `idx_owner_vote_voter_snapshot_freeze_event_id` |
| **FKs** | Conditional FKs on freeze events table; conditional `owner_vote_voter_snapshot_freeze_event_id_fkey` |
| **Policies** | `ovfe_select_tenant_member` (conditional) |
| **Grants** | SELECT on freeze events to `authenticated`; ALL to `service_role` |
| **RLS** | Enabled on `owner_vote_freeze_events` |

#### Objects found

None.

#### Objects missing

All expected objects listed above.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.tables` — `owner_vote_freeze_events` absent
- `information_schema.columns` — `freeze_event_id` absent on `owner_vote_voter_snapshot`
- `pg_indexes` — no `owner_vote_freeze_events_*` or `idx_owner_vote_voter_snapshot_freeze_event_id`

---

### 5.14 — `20261726120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261726120000` |
| **Migration filename** | `20261726120000_e01_iu22_voter_snapshot_immutability.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Functions** | `owner_vote_voter_snapshot_event_linked_immutable()` |
| **Triggers** | `trg_owner_vote_voter_snapshot_event_linked_immutable` (BEFORE UPDATE OR DELETE, `WHEN (OLD.freeze_event_id IS NOT NULL)`) |
| **Comments** | Updated table comment on `owner_vote_voter_snapshot` |

#### Objects found

None.

#### Objects missing

Function and trigger listed above.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified (prerequisite column `freeze_event_id` also absent).

#### Evidence

- `pg_proc` — function absent
- `pg_trigger` — trigger absent on `owner_vote_voter_snapshot`
- Migration uses `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` (idempotent form when applied)

---

### 5.15 — `20261727120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261727120000` |
| **Migration filename** | `20261727120000_e01_iu31_resolution_snapshot_foundation.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Tables** | `owner_vote_resolution_snapshot`, `owner_vote_frozen_motions` |
| **Indexes** | `owner_vote_resolution_snapshot_one_per_freeze_event`, `idx_owner_vote_resolution_snapshot_meeting_id`, `idx_owner_vote_resolution_snapshot_property_id`, `owner_vote_frozen_motions_snapshot_display_order`, `idx_owner_vote_frozen_motions_freeze_event_id`, `_meeting_id`, `_property_id`, `idx_owner_vote_frozen_motions_source_resolution_id` |
| **FKs** | Multiple conditional FKs on both tables |
| **Policies** | `ovrs_select_tenant_member`, `ovfm_select_tenant_member` (conditional) |
| **Grants** | SELECT to `authenticated`; ALL to `service_role` on both tables |
| **RLS** | Enabled on both tables |

#### Objects found

None.

#### Objects missing

All expected objects listed above.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified.

#### Evidence

- `information_schema.tables` — both E-01 Phase 3 tables absent
- `pg_indexes`, `pg_policy` — no matching objects

---

### 5.16 — `20261728120000`

| Field | Value |
|-------|-------|
| **Migration version** | `20261728120000` |
| **Migration filename** | `20261728120000_e01_iu32_resolution_snapshot_immutability.sql` |
| **Repository exists** | Yes |
| **History row exists** | No |

#### Objects expected

| Kind | Objects |
|------|---------|
| **Functions** | `owner_vote_resolution_snapshot_event_linked_immutable()`, `owner_vote_frozen_motions_event_linked_immutable()` |
| **Triggers** | `trg_owner_vote_resolution_snapshot_event_linked_immutable`, `trg_owner_vote_frozen_motions_event_linked_immutable` |
| **Comments** | Updated table comments on both Phase 3 tables |

#### Objects found

None.

#### Objects missing

Both functions and both triggers.

#### Extra objects

None attributed to this migration.

#### Partial objects

None identified (prerequisite tables from IU-3.1 absent).

#### Evidence

- `pg_proc` — both immutability functions absent
- `pg_trigger` — both triggers absent
- Prerequisite tables `owner_vote_resolution_snapshot`, `owner_vote_frozen_motions` absent

---

## 6. Summary matrix

| Version | Filename | Repo | History | Catalog match |
|---------|----------|------|---------|---------------|
| `20261327120000` | `council_action_manager_bridge` | Yes | No | All expected objects found |
| `20261328120000` | `manager_feedback_rollup` | Yes | No | All expected objects found |
| `20261329120000` | `council_review_queue` | Yes | No | All expected objects found |
| `20261330120000` | `council_actions_created_audit_trigger` | Yes | No | All expected objects found |
| `20261422120000` | `sgm_pause_email_deliveries` | Yes | No | All expected objects found; policy collision candidate (§4) |
| `20261423120000` | `sgm_pause_delivery_sending_claim` | Yes | No | Function absent; status CHECK partial |
| `20261704120000` | `governance_matters` | Yes | No | All expected objects found; policy/trigger collision candidates (§4) |
| `20261704130000` | `governance_matter_cda` | Yes | No | All expected objects found; policy collision candidate (§4) |
| `20261706120000` | `community_resolutions` | Yes | No | All expected objects found; policy collision candidates (§4) |
| `20261707120000` | `governance_matter_subscriptions` | Yes | No | All expected objects found; policy collision candidates (§4) |
| `20261723140000` | `meeting_formal_resolution_authoring` | Yes | No | All expected objects missing |
| `20261724120000` | `e01_iu11_snapshot_domain_schema` | Yes | No | Table/column partial match; index/policy naming differs |
| `20261725120000` | `e01_iu21_freeze_event_identity` | Yes | No | All expected objects missing |
| `20261726120000` | `e01_iu22_voter_snapshot_immutability` | Yes | No | All expected objects missing |
| `20261727120000` | `e01_iu31_resolution_snapshot_foundation` | Yes | No | All expected objects missing |
| `20261728120000` | `e01_iu32_resolution_snapshot_immutability` | Yes | No | All expected objects missing |

---

## 7. Query log (read-only evidence)

All queries executed via `npx supabase db query --linked` against project `wqohkxtqozscmwfrryfl` on 2026-07-30. No DDL or DML.

| # | Purpose |
|---|---------|
| 1 | Full `schema_migrations` version list |
| 2 | Pending-migration table existence |
| 3 | `manager_tasks` bridge + feedback columns |
| 4 | `council_actions` review + bridge columns |
| 5 | Pending-migration function existence |
| 6 | Pending-migration trigger existence |
| 7 | Index inventory (migration-scoped names) |
| 8 | Constraint inventory (selected migrations) |
| 9 | RLS policy inventory |
| 10 | Bridge/resolution/formal-resolution columns |
| 11 | `sgm_pause_email_deliveries_status_check` definition |
| 12 | `claim_sgm_pause_email_delivery` existence |
| 13 | `owner_vote_voter_snapshot` column list |
| 14 | `meeting_agenda_items` formal resolution columns |
| 15 | RLS enabled flags |
| 16 | All `council_actions` triggers |
| 17 | `owner_vote_voter_snapshot` indexes |
| 18 | `meeting_agenda_items` community resolution index |
| 19 | Table grants (selected) |
| 20 | `governance_matters.resolution_id` + bridge columns |
| 21 | `owner_vote_voter_snapshot` FK list |
| 22 | Community resolution conditional indexes |
| 23 | `owner_vote_meetings.snapshot_frozen_at` |
| 24 | `moderate_governance_matter_comment` EXECUTE privilege |
| 25 | `owner_vote_voter_snapshot` row count |

---

## Document control

| Field | Value |
|-------|-------|
| **Standard** | CES-010 |
| **Authoritative for** | RC-011 IU-2 classification input |
| **Next IU** | IU-2 — Drift Classification & Reconciliation Plan |

**Depends on:** [`RC-011-Implementation-Plan.md`](RC-011-Implementation-Plan.md) v1.0
