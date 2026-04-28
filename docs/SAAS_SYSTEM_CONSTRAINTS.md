# ClearStrata SaaS System Constraints

## 0. Core Principle

ClearStrata is not just a QR entry app. It is an identity + property membership system.

Rule:
Better to reject an action than to write incorrect data.

Never introduce a shortcut that breaks user identity, property isolation, or membership integrity.

---

## 1. Identity Rules

All user-specific business data must be tied to a real Supabase Auth user.

Required:
- user_id must always come from auth.uid()
- If auth.uid() is null, stop the operation
- Unauthenticated users must not write property_members
- Unauthenticated users must not write join_requests
- Do not create fake users inside business RPCs

Forbidden:
- gen_random_uuid() as user_id
- NULL user_id
- mock user_id
- temporary user_id
- fallback user_id

Standard RPC pattern:

v_uid := auth.uid();

IF v_uid IS NULL THEN
  RETURN json_build_object(
    'ok', false,
    'kind', 'error',
    'reason', 'auth_required',
    'message', 'Please sign in before continuing.'
  );
END IF;

---

## 2. Property Isolation Rules

Every business row must belong to exactly one property.

Required:
- Every tenant table must contain property_id
- Every query must filter by property_id
- Every write must validate property_id
- Never read or write cross-property data unless explicitly designed for platform_admin

Forbidden:
- select without property_id filter on tenant data
- insert without property_id
- update/delete without property_id
- platform_admin bypassing tenant isolation by accident

---

## 3. Membership Rules

The only valid proof that a user can enter a property is:

property_members.user_id = auth.uid()
property_members.property_id = currentPropertyId
property_members.status = 'active'

Required:
- property_members.user_id must be real auth.uid()
- property_members.property_id must exist
- property_members.status must be active before app access
- property_members.unit_no should be populated when membership comes from unit entry
- Do not rely on join_requests alone for app access

Forbidden:
- property_members.user_id is null
- property_members.user_id is random UUID
- property_members.unit_no is lost during approval
- allowing pending users into the app homepage

---

## 4. Unit Number Rules

unit_no is the canonical field for unit/suite number.

Required:
- unit_whitelist uses unit_no
- join_requests uses unit_no
- property_members uses unit_no
- Frontend display may call it unitNo, but database field is unit_no

Forbidden:
- unit_number
- mixing unit_id and unit_no for new entry logic
- using unit_id as the main owner entry identifier
- checking whitelist by anything other than unit_no

Whitelist match must use:

trim(uw.unit_no) = trim(p_unit_no)

---

## 5. QR Entry Flow Rules

Canonical entry flow:

QR scan
→ /entry?propertyId=...&inviteCode=...
→ if not logged in, redirect to /login?redirect=<full entry URL>
→ after login, return to /entry
→ submit_join_request
→ if unit_no is whitelisted, auto_approved
→ write property_members with real auth.uid()
→ enter app homepage

Required:
- /entry must preserve propertyId and inviteCode
- Login redirect must preserve the full original /entry URL
- Submit must only happen after a valid Supabase session exists
- White-list auto approval must write property_members for the real user

Forbidden:
- unauthenticated submit
- creating random user_id
- dropping redirect parameters
- allowing /entry to write membership without auth.uid()

---

## 6. Join Request Rules

join_requests is for audit and approval workflow, not app access.

Required:
- user_id must be auth.uid()
- property_id must be present
- unit_no must be present
- invite_code should be stored when available
- whitelist_matched must reflect actual whitelist result
- status must be one of pending / approved / rejected

Forbidden:
- user_id null
- random user_id
- unit_no null
- approved join_request without matching active membership
- pending join_request blocking an already active member

---

## 7. submit_join_request RPC Rules

submit_join_request must be the only canonical public entry RPC.

Required return shape:
{
  ok: boolean,
  kind: string,
  property_id: uuid,
  unit_no: text
}

Allowed kind values:
- auto_approved
- pending_submitted
- already_member
- error

Required behavior:
- If auth.uid() is null, return auth_required
- If already active member, return already_member
- If whitelist matches unit_no, insert active property_members and return auto_approved
- If not whitelisted, insert pending join_request and return pending_submitted

Forbidden:
- gen_random_uuid() for user_id
- NULL user_id
- unit_number
- silent failure
- returning success without writing expected row

---

## 8. Guard Rules

Frontend guards must protect app access without causing infinite loading.

Required:
- Logged-out user goes to login
- Logged-in user without active membership goes to join flow or pending page
- Logged-in user with active membership enters app
- /join/pending must redirect active members to homepage
- Loading states must have an exit path

Forbidden:
- infinite loading
- pending user entering homepage
- active member stuck on pending page
- checking membership by unit_id only
- requiring unit_no to exist before recognizing active membership

Membership access check must be based on:
user_id + property_id + status='active'

---

## 9. Demo and Real App Separation

Current locked structure:
- www.clearstrata.ai = public website + demo/sales surface
- clearstrataaiserena.vercel.app currently serves the app/test backend
- future app.clearstrata.ai may become the stable production app domain

Required:
- Do not mix www and app/test flows accidentally
- Do not create another QR system
- Do not create another RPC for the same join flow
- Do not silently change domain architecture

---

## 10. Data Cleanup Rules

Before testing entry flows, remove dirty test rows when needed.

Dirty data examples:
- join_requests.user_id is null
- join_requests.user_id is random and not in auth.users
- property_members.user_id is random
- property_members.unit_no missing for new entry members

Never clean data broadly without property_id filter.

---

## 11. AI / Cursor Instruction Rules

Every Cursor task touching auth, QR, entry, membership, or join_requests must include:

System constraints:
- user_id must come from auth.uid()
- no gen_random_uuid() as user_id
- no null user_id
- no unauthenticated business writes
- property_id is required
- unit_no is canonical
- membership is the only app access proof
- pending users cannot enter app
- active members cannot be stuck on pending
- do not create new RPCs unless explicitly requested
- do not create parallel entry flows

---

## 12. Verification Checklist

After any change to entry/auth/membership:

1. npm run build passes
2. pg_get_functiondef(submit_join_request) shows no gen_random_uuid user fallback
3. White-list unit, e.g. 304:
   - returns auto_approved
   - writes property_members.user_id = auth.uid()
   - writes property_members.unit_no = 304
   - enters homepage
4. Non-white-list unit:
   - returns pending_submitted
   - writes join_requests.user_id = auth.uid()
   - goes to /join/pending
5. Existing active member:
   - returns already_member or enters homepage
   - never stuck on /join/pending
6. Console has no infinite loop logs
7. No SQL error:
   - unit_number does not exist
   - property_members.unit_no does not exist
   - auth.uid null membership issue

End of document.
