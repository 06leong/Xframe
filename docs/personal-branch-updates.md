# Personal Branch Updates

This document tracks the changes maintained on the `personal` branch of this ChronoFrame fork. The branch is intended for my personal website deployment while keeping `main` available for syncing upstream updates from the original ChronoFrame project.

## Branch Strategy

- `main` stays close to the upstream ChronoFrame repository.
- `personal` contains site-specific UI, deployment, and product changes for my public gallery.
- Personal Docker images are published from the `personal` branch to GitHub Container Registry.

## Version History

### personal-1.0.2.2

- Fixed upgrades from older personal installations where the runtime schema guard had already added public_slug while migration history still ended at 0010. Startup now verifies the column and unique index, records the original 0011 migration hash and timestamp, and runs the remaining published migrations without rewriting photos or public slugs.
- Restores the album fields, photo access-key index, and queue availability field required by public galleries and media authorization. Existing published migration SQL remains unchanged.
- Unified database path resolution for startup migrations and application queries, including file:-prefixed SQLite paths.
- Added regression coverage for the production legacy schema state, repeated upgrades, index validation, and preservation of existing data and migration history.
- Application version: 1.0.2. Personal image version: personal-1.0.2.2.

### personal-1.0.2.1

- Merged upstream ChronoFrame v1.0.2. All seven setup wizard endpoints now require an explicit first-launch state, share a serialized guard, and enforce a shared request limit. Queued requests cannot change settings or administrator credentials after setup completes.
- Fixed long album descriptions stretching the dashboard table; descriptions truncate within a bounded width and remain available on hover.
- Updated upstream dependencies, release version, and the Chinese README banner while retaining the personal English README and Markdown dependencies.
- Preserved all personal customizations, including public slugs and legacy links, album-scoped links, public-only social previews, About, three UI languages, MapTiler, EXIF time zones, and photo information controls. No database schema or migration changes were required.
- Application version: 1.0.2. Personal image version: personal-1.0.2.1.

### personal-1.0.1.1

- Merged upstream ChronoFrame v1.0.1, including the 1.0.0 stable features and 1.0.1 analytics, queue deletion, and dark-mode log fixes.
- Preserved editable About and its Markdown safeguards, the typewriter slogan, MapTiler search, native location names, capture-time EXIF offsets, photo information controls, three UI languages, and personal image publishing.
- Kept global photo URLs as stable public slugs and legacy photo IDs readable. Album browsing and sharing use /albums/:id?photo=<publicSlug> to retain the album scope after refresh and sharing.
- Adapted photo Open Graph metadata and previews to public slugs, legacy IDs, and album query links. Share metadata only uses anonymous-visible photographs, even when an administrator is signed in.
- Preserved published personal migrations through 0012 and appended upstream album positions, album passwords, indexed media access keys, and queue availability as migrations 0013–0016. New snapshots retain the public slug column and unique index.
- Added regression tests for fresh databases, upgrades from the 13-migration personal release, unchanged history and slugs, album order, access-index trigger updates, and legacy photo identifiers.
- Retained markdown-it and its type definitions. Settings and debug stores now use Nuxt auto-imports to share the same Pinia instance in production SSR.
- Application version: 1.0.1. Personal image version: personal-1.0.1.1.

### v0.41

- Fixed a production compatibility issue where photo list APIs could return no photos if the deployed SQLite database had not received the new `public_slug` column before Drizzle selected photo rows.
- Unified runtime database opening with `DATABASE_URL` and added a defensive startup schema guard for the personal public photo slug column and index.

### v0.4

- Added dashboard settings for controlling which photo information sections and individual metadata fields are shown in the public photo viewer.
- Added configurable shooting-time display formats, including automatic locale formatting, US, European, Chinese, and ISO date orders, with 12-hour or 24-hour time.
- Added fixed random public photo slugs so viewer and share URLs no longer expose filename-derived photo IDs.
- Preserved compatibility with old filename-based photo URLs by redirecting them to the new public slug URL when possible.
- Updated globe photo deep links to use public slugs while keeping legacy `photoId` query links readable.

### v0.31

- Fixed EXIF shooting time display so photos with an EXIF time zone offset are shown in the photo's capture-time offset instead of the viewer browser's local time zone.
- Applied the same EXIF-aware date formatting to the viewer information panel, dashboard photo table, gallery photo cards, map pins, and map cluster date ranges.

### v0.3

- Added a stored location name language mode setting for reverse-geocoded location names.
- Supported native local names for stored country and city values, while keeping the configured-language mode available.
- Updated the home gallery statistics so the date range is shown from older to newer dates, with the total photo count on a separate line.
- Updated GitHub Actions Docker workflow actions to newer versions.

### v0.2

- Added MapTiler-powered location search in the dashboard photo editor.
- Allowed location assignment through a search field and explicit search action instead of requiring manual map clicks only.

### v0.1

- Added a typewriter-style slogan animation on the gallery home panel.
- Added personal image version tagging support through `personal-image-version.txt`.

### Initial Personal Changes

- Simplified the README for the personal fork.
- Replaced the ChronoFrame footer link in the gallery header area with an About popup.
- Added a GitHub Actions workflow to publish personal Docker images to GHCR.

## Docker Image Tags

The personal workflow publishes these tags on each push to `personal`:

- `ghcr.io/06leong/xframe:personal`
- `ghcr.io/06leong/xframe:<version>`
- `ghcr.io/06leong/xframe:personal-<short-sha>`

The version tag is read from `personal-image-version.txt`.

## Workflow Note

The `Publish Personal Image` workflow currently runs on every push to the `personal` branch. This means documentation-only commits also trigger a Docker image build unless path filters are added to the workflow.
