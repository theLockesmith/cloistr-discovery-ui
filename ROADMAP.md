# Discovery UI Roadmap

## v1 - Feature Complete ✓

All planned features implemented and deployed. See `FIXES.md` for details.

---

## v2 - Future Ideas

### Enhanced Discovery Features
- **Advanced Filters**
  - Multiple health status selection (e.g., "online OR degraded")
  - Latency range slider (e.g., "< 200ms")
  - Multiple NIP selection with AND/OR logic
  - Date range filters (first_seen, last_seen)

- **Search Improvements**
  - Search history/saved searches
  - Search by relay operator (pubkey lookup)
  - Search by specific NIP combinations
  - Fuzzy matching for relay names

- **Relay Details Page**
  - Individual relay detail view (click to expand)
  - Historical uptime graph (last 7/30 days)
  - Historical latency graph
  - Connection test from browser
  - Relay operator info (if NIP-11 contact provided)
  - List of users using this relay (aggregated, privacy-preserving)

### Social Features
- **Community Annotations**
  - User reviews/ratings (signed with Nostr keys)
  - Topic tags (community-submitted)
  - Atmosphere tags (community-submitted)
  - Report issues (spam, offline, etc.)

- **Relay Lists**
  - Save custom relay lists (beyond NIP-65)
  - Share relay lists with others
  - Import/export relay lists
  - Preset lists by use case (developer, creator, general)

### Analytics & Insights
- **Relay Analytics Dashboard**
  - Network-wide health statistics
  - Geographic distribution charts
  - NIP adoption rates
  - Average latency by region
  - Growth trends (new relays over time)

- **Personal Stats**
  - Your relay connection quality
  - Your relay diversity score
  - Recommendations based on your Nostr activity

### Performance & UX
- **Progressive Web App (PWA)**
  - Offline support
  - Install as standalone app
  - Push notifications for relay status changes

- **Accessibility**
  - Keyboard navigation improvements
  - Screen reader optimization
  - High contrast theme option
  - Font size controls

- **Internationalization (i18n)**
  - Multi-language support
  - Translated relay metadata
  - Region-specific relay recommendations

### Backend Integration
- **Real-time Updates**
  - WebSocket connection for live health updates
  - Live relay count changes
  - Real-time latency monitoring

- **Advanced Backend Features** (requires backend work)
  - Relay trustworthiness score
  - Spam/malicious relay detection
  - Relay operator verification (NIP-05)
  - Historical data retention (trends, graphs)

---

## Contributing Ideas

Have a feature idea? Create an issue in GitLab or submit a PR!

**Priorities:**
- User-requested features
- Features that improve discovery quality
- Features that leverage Nostr identity
- Features that enhance privacy

**Non-priorities:**
- Features requiring centralized accounts
- Features that don't respect user privacy
- Overly complex UI patterns
