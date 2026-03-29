/*
  # Add Foreign Key Indexes for Performance

  ## Summary
  Adds indexes to all foreign key columns that were missing covering indexes.
  This significantly improves query performance for JOINs and foreign key lookups.

  ## Performance Issue Fixed
  **Problem:** Foreign keys without indexes cause full table scans during:
  - JOIN operations
  - Foreign key constraint checks
  - CASCADE operations
  - Queries filtering by related records
  
  **Impact:** As tables grow, queries become exponentially slower
  
  **Solution:** Add btree indexes on all foreign key columns

  ## Indexes Added

  ### Communication Tables
  1. `communication_likes.user_id` - Lookup likes by user
  2. `communications.posted_by` - Find posts by author
  3. `communications.replied_by` - Find replies by council member

  ### Hiring Tables
  4. `hiring_candidates.recommended_by` - Track who recommended candidates
  5. `hiring_jobs.posted_by` - Find jobs by poster

  ### Maintenance Tables
  6. `maintenance_requests.completed_confirmed_by` - Track who confirmed completion
  7. `maintenance_requests.cost_approved_by` - Track who approved costs
  8. `maintenance_requests.payment_confirmed_by` - Track payment confirmations
  9. `maintenance_requests.submitted_by` - Find requests by submitter

  ### Owner Info Tables
  10. `owner_info.approved_by` - Track approvals

  ### Procurement Tables
  11. `procurement_jobs.approved_by` - Track job approvals
  12. `procurement_jobs.posted_by` - Find jobs by poster
  13. `procurement_quotes.submitted_by` - Track quote submitters

  ### Voting Tables
  14. `vote_responses.user_id` - Find responses by user
  15. `votes.initiated_by` - Find votes by initiator

  ## Performance Benefits
  - Faster JOIN operations (O(log n) vs O(n))
  - Efficient foreign key constraint validation
  - Better query planning by PostgreSQL optimizer
  - Reduced I/O operations
*/

-- Communication tables
CREATE INDEX IF NOT EXISTS idx_communication_likes_user_id ON communication_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_communications_posted_by ON communications(posted_by);
CREATE INDEX IF NOT EXISTS idx_communications_replied_by ON communications(replied_by);

-- Hiring tables
CREATE INDEX IF NOT EXISTS idx_hiring_candidates_recommended_by ON hiring_candidates(recommended_by);
CREATE INDEX IF NOT EXISTS idx_hiring_jobs_posted_by ON hiring_jobs(posted_by);

-- Maintenance tables
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_completed_confirmed_by ON maintenance_requests(completed_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_cost_approved_by ON maintenance_requests(cost_approved_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_payment_confirmed_by ON maintenance_requests(payment_confirmed_by);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_submitted_by ON maintenance_requests(submitted_by);

-- Owner info tables
CREATE INDEX IF NOT EXISTS idx_owner_info_approved_by ON owner_info(approved_by);

-- Procurement tables
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_approved_by ON procurement_jobs(approved_by);
CREATE INDEX IF NOT EXISTS idx_procurement_jobs_posted_by ON procurement_jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_procurement_quotes_submitted_by ON procurement_quotes(submitted_by);

-- Voting tables
CREATE INDEX IF NOT EXISTS idx_vote_responses_user_id ON vote_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_initiated_by ON votes(initiated_by);
