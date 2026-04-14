# Hacktivity Stats Technical Documentation

## Overview

Hacktivity Stats is a React + Vite dashboard that displays HackerOne Hacktivity reports. The app does not query the HackerOne API directly for every render. Instead, it uses a Firestore-backed cache so the UI can load quickly from stored data and refresh only when the user triggers a sync.

Only disclosed reports are cached. Any API item whose `attributes.disclosed` is not `true` is filtered out before the cache is written.

The main data flow is:

1. Load cached report data from Firestore on app start.
2. Render the table from React state derived from that cached data.
3. When the user clicks Update Data, fetch the latest pages from the HackerOne API.
4. Merge new reports into the cached set.
5. Write the merged set back to Firestore.
6. Read the Firestore cache again and update the UI from that stored data.

## Firestore Structure

The app stores cache data in the `api_cache` collection.

### 1. `api_cache/meta`

This is the metadata document.

It stores:

- `savedAt`: Unix timestamp in milliseconds for when the cache was last written.
- `chunkCount`: Number of chunk documents currently in the cache.
- `totalItems`: Total number of report records stored across all chunks.

`totalItems` reflects only disclosed reports.

Purpose:

- Tells the app how many chunk documents to load.
- Provides the timestamp shown in the UI as the last update time.

### 2. `api_cache/chunk_0`, `api_cache/chunk_1`, ...

These are the chunk documents.

Each chunk document stores:

- `items`: an array of report objects.

The reports are split across chunk documents so each Firestore document stays well under Firestore's 1 MB document size limit.

### How chunking works

The chunking logic is defined in `src/hooks/useCachedPaginatedApi.js`.

- `CHUNK_SIZE` is set to `400`.
- The merged report array is filtered to disclosed reports first, then sliced into groups of 400 items.
- Each slice becomes one Firestore document.
- Chunk document IDs are deterministic: `chunk_0`, `chunk_1`, `chunk_2`, and so on.

So if there are 6635 reports:

- `chunk_0` contains items `0..399`
- `chunk_1` contains items `400..799`
- ...
- `chunk_16` contains the final remainder

The app does not use random document IDs for the cache. If you see something that looks like a random cache document in Firestore, that is not created by this code path.

## Cache Read Flow

The read path is implemented in `readAllChunks()` in `src/hooks/useCachedPaginatedApi.js`.

Steps:

1. Read `api_cache/meta`.
2. If `meta` does not exist, return `null`.
3. Read `chunk_0` through `chunk_{chunkCount - 1}`.
4. Flatten all `items` arrays into a single report list.
5. Return:

```js
{ items, savedAt }
```

That data is then loaded into React state by `loadFromFirestore()`.

## Cache Write Flow

The write path is implemented in `writeAllChunks(items)`.

Steps:

1. Split the full report array into chunks of 400 items.
2. Write each chunk to `chunk_0`, `chunk_1`, etc.
3. Write the `meta` document last with:
   - `savedAt`
   - `chunkCount`
   - `totalItems`
4. Commit the batched writes to Firestore.

The write path is currently append-like in memory, but it preserves existing items by:

- Reading the existing Firestore cache first.
- Creating a set of existing report IDs.
- Filtering fetched items down to disclosed items first.
- Filtering those disclosed items against the existing ID set.
- Merging only new disclosed IDs into the cache.

## Sync Flow

The sync function is exposed as `refetch` from the hook and is triggered by the Update Data button in `src/App.jsx`.

Steps:

1. Read current cache from Firestore.
2. Build a set of existing report IDs.
3. Fetch the HackerOne API pages one by one.
4. Filter fetched items down to disclosed items.
5. Combine the cached disclosed items with any newly fetched disclosed IDs.
6. Write the merged array back to Firestore.
7. Read Firestore again so the UI reflects what was actually persisted.

The sync progress state tracks:

- `fetched`: how many API pages have been fetched.
- `total`: how many pages will be fetched.
- `newItems`: how many unique items were added during the sync.

## Frontend Data Flow

The React app renders from hook state, not directly from Firestore.

### In `App.jsx`

- `useCachedPaginatedApi(REPORTS_URL, TOTAL_PAGES)` returns the cache-backed dataset.
- `data` is renamed to `raw`.
- `cleanReports(raw)` converts the raw payload into a normalized report array.
- Filters are derived from the normalized reports.
- The `DataTable` component receives `filteredReports`.

So the table renders:

1. Firestore cache data on first load.
2. Updated Firestore cache data after sync completes.

## Important Files

- `src/hooks/useCachedPaginatedApi.js`: Firestore cache read/write logic and sync orchestration.
- `src/App.jsx`: Main dashboard UI and table rendering.
- `backend/firebase.js`: Firebase app initialization and Firestore instance creation.

## Logging And Validation

The hook logs these events to the browser console:

- `[cache] loaded ...` when cache is read from Firestore.
- `[cache] firestore payload: ...` when data is loaded into state.
- `[cache] wrote ...` when cache is written.
- `[sync] ...` when sync merges API data.
- `[api] fetched ...` when the HackerOne API pages are fetched.

Useful validation checks:

1. Trigger sync.
2. Confirm the console shows the write log and the follow-up Firestore load log.
3. Inspect `api_cache/meta` in Firestore and confirm `savedAt`, `chunkCount`, and `totalItems` changed.
4. Reload the page and confirm the cache load log appears again.
5. Confirm the table still renders the same total item count from Firestore-backed state.

## Notes

- The app uses Firestore as a cache, not as the primary source of truth.
- The HackerOne API is still the upstream source for new data.
- The current design assumes one user-driven sync at a time.
- The hook guards against overlapping sync calls with the `syncing` flag.
