# Personal Branch Updates

This document tracks the changes maintained on the `personal` branch of this ChronoFrame fork. The branch is intended for my personal website deployment while keeping `main` available for syncing upstream updates from the original ChronoFrame project.

## Branch Strategy

- `main` stays close to the upstream ChronoFrame repository.
- `personal` contains site-specific UI, deployment, and product changes for my public gallery.
- Personal Docker images are published from the `personal` branch to GitHub Container Registry.

## Version History

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
