# UI Fixes - 2026-03-23

## Issues Addressed

### 1. Sorting Options Fixed ✓
**Problem:** Sort options showed "Uptime" and "Health" which didn't work because the backend doesn't provide these fields.

**Solution:**
- Removed "Uptime" and "Health" sort options from src/components/RelayList.tsx
- Now only shows "Latency" and "Name" which have reliable data from the backend
- Simplified sorting logic to handle only these two fields

**Files Changed:**
- `src/components/RelayList.tsx`

---

### 2. Recommendations Feature Fixed ✓
**Problem:** Recommendation wizard was filtering by `moderation` and `content_policy` fields that the backend doesn't populate, causing no results.

**Solution:**
- Replaced "Moderation" preference with "Performance" preference (based on latency)
- Now filters by actual available data: health, payment status, NIPs, and latency
- Client-side filtering for performance tiers:
  - Fastest: < 200ms latency
  - Balanced: < 500ms latency
  - Any Speed: no filter
- Results sorted by latency (fastest first)
- Updated result display to show relevant data (latency, payment status, search support)

**Files Changed:**
- `src/components/RecommendationWizard.tsx`

---

### 3. Login Converted to Modal ✓
**Problem:** Login was shown as an inline dropdown, not as polished as other modals.

**Solution:**
- Converted LoginButton component to use modal overlay (similar to RecommendationWizard)
- Clean modal interface with two options:
  - Browser Extension (NIP-07)
  - Remote Signer (NIP-46)
- Proper backdrop click handling
- Better UX with autofocus on bunker input

**Files Changed:**
- `src/components/LoginButton.tsx`

---

### 4. Map Feature - Already Working Correctly ✓
**Status:** No changes needed

**Explanation:**
The map is properly implemented. It requires `country_code` field from the backend API to display relay locations. Currently the backend doesn't provide this field, so the map shows a helpful message:

> "Geographic data not available - Relay location data is being collected and will be available soon."

When the backend starts populating the `country_code` field in relay records, the map will automatically display markers grouped by country.

**Backend TODO:** Add geolocation data and populate `country_code` field in relay records.

---

### 5. Cloudflare Integrity Warning - Not Fixable from UI
**Status:** No action needed from UI

**Explanation:**
The console error about SHA512 hash mismatch for `beacon.min.js` is caused by Cloudflare automatically injecting analytics scripts when the site is served through Cloudflare's CDN. This script injection happens at the edge, after the HTML leaves our server.

This is a known Cloudflare behavior and is:
- Not a security risk for users
- Not something we control from the UI codebase
- Can be disabled in Cloudflare dashboard if desired (Settings → Speed → Disable "Browser Insights")

**Cloudflare Dashboard Action (Optional):**
If you want to remove this warning, disable "Browser Insights" in the Cloudflare dashboard for the discover.cloistr.xyz domain.

---

## Data Fields Available from Backend

Based on API inspection (`https://discover.cloistr.xyz/api/v1/relays`), the backend currently provides:

**Always Present:**
- `url`, `name`, `description`, `pubkey`
- `software`, `version`
- `supported_nips` (array or null)
- `health` (online/degraded/offline)
- `latency_ms` (number)
- `last_checked` (ISO timestamp)
- `payment_required` (boolean)
- `auth_required` (boolean)

**Not Currently Populated:**
- `uptime_percent`
- `country_code` (needed for map)
- `moderation`
- `content_policy`
- `topics`, `atmosphere`, `languages`
- `community`, `admission`
- `first_seen`, `last_seen`

The UI now only uses fields that are reliably populated by the backend.

---

## Testing

Build successful:
```bash
pnpm build
✓ built in 2.51s
dist/index.html                   0.83 kB │ gzip:   0.42 kB
dist/assets/index-B3fsFZ3o.css   38.21 kB │ gzip:  10.47 kB
dist/assets/index-DlQY9eGe.js   321.20 kB │ gzip: 102.42 kB
```

All TypeScript compilation passes with no errors.
