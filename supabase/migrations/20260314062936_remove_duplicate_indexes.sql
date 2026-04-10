/*
  # Remove Duplicate Indexes

  ## Summary
  Removes duplicate indexes that waste storage and slow down write operations.
  Multiple identical indexes provide no performance benefit while increasing:
  - Storage requirements
  - Index maintenance overhead on INSERT/UPDATE/DELETE
  - Query planning time

  ## Duplicate Indexes Removed

  ### maintenance_requests table
  **Duplicates:** idx_maintenance_requests_assigned and idx_maintenance_requests_assigned_council
  - Both index the same column: assigned_council_member_id
  - **Keeping:** idx_maintenance_requests_assigned_council (more descriptive name)
  - **Removing:** idx_maintenance_requests_assigned

  ### maintenance_updates table
  **Duplicates:** idx_maintenance_updates_request and idx_maintenance_updates_request_id
  - Both index the same column: request_id
  - **Keeping:** idx_maintenance_updates_request_id (more explicit name)
  - **Removing:** idx_maintenance_updates_request

  ## Benefits
  - Reduced storage usage
  - Faster write operations (fewer indexes to update)
  - Simpler query planning
  - Reduced maintenance overhead
*/

-- Remove duplicate index on maintenance_requests.assigned_council_member_id
-- Keep idx_maintenance_requests_assigned_council (more descriptive)
DROP INDEX IF EXISTS idx_maintenance_requests_assigned;

-- Remove duplicate index on maintenance_updates.request_id
-- Keep idx_maintenance_updates_request_id (more explicit)
DROP INDEX IF EXISTS idx_maintenance_updates_request;




