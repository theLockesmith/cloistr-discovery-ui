# UI Fixes - 2026-03-23

## Summary

**Status: Feature Complete for v1** (as of 2026-03-24)

All UI issues resolved. Service is fully functional and deployed:
- ✓ Map display working (with GeoIP data from backend)
- ✓ Health sorting working (online → degraded → offline)
- ✓ Uptime sorting working (24h rolling window from backend)
- ✓ All 4 sort options functional: Latency, Uptime, Health, Name
- ✓ Recommendation wizard using real backend data
- ✓ Login modal (NIP-07 + NIP-46)
- ✓ Relay comparison view
- ✓ Add to My Relays (NIP-65)

**Deployed:** `37f63eb` on `cloistr-discovery-ui-5875f5ffb9-*` pods in Atlantis cluster

---

## Issues Addressed

### 1. Sorting Options Fixed ✓
**Problem:** Sort options for "Uptime" and "Health" didn't work properly.

**Solution:**
- **Uptime**: Re-added in commit `37f63eb` - sorts by uptime_percent (24h rolling window)
- **Health**: Fixed in commit `f38ede1` - properly sorts by health status (online > degraded > offline)
- Working sort options: **Latency**, **Uptime**, **Health**, **Name**

**Files Changed:**
- `src/components/RelayList.tsx`

**Status:** Both sorting options are deployed and working in production (commit `37f63eb`). Users may need to clear browser cache (Ctrl+Shift+R) to see the latest version.

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

### 4. Map Feature - Fixed ✓
**Problem:** Map container wasn't rendering at all (regression from previous fix attempt).

**Solution:**
- Removed `display: none` style that prevented Leaflet from initializing the map
- Map now renders properly and shows Leaflet tiles
- Currently displays helpful message because backend doesn't provide `country_code` field:

> "Geographic data not available - Relay location data is being collected and will be available soon."

When the backend starts populating the `country_code` field in relay records, markers will automatically appear.

**Backend TODO:** Add geolocation data and populate `country_code` field in relay records.

**Files Changed:**
- `src/components/RelayMap.tsx`

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
