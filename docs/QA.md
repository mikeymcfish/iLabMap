# Verification record

The restored database is separate from all test databases.

## Automated checks

- Final result: 27 Python tests and 4 Node tests passed.
- Python tests cover fresh migration/schema agreement, idempotent recovery,
  preservation of edited recovered records, CRUD/search/pagination, zero
  quantities/coordinates, cleared fields, stale revision conflicts, staff auth,
  CSRF, rate limiting, unsafe URLs/numeric input, image content verification and
  re-encoding, local tool finding, bounded mocked Responses API output, and
  backup verification/restoration.
- Node tests exercise the actual API client: session/CSRF propagation,
  preservation of empty strings and zero, atomic multipart requests, and clear
  server error messages.
- Ruff checks the active Python code. Historical migration files are archived.
- npm audit reported zero known vulnerabilities for the installed front-end dependencies.

## Browser checks

Performed through the Codex in-app browser, using the real application and a
separate disposable inventory server on port 5016.

- Recovered inventory loads; floor-plan selection creates a highlighted marker.
- The original 3D model and texture load successfully with no console errors.
- Staff sign-in exposes editing/export/history controls.
- HTML-like tags display as literal text.
- Editing preserves a zero-valued 3D coordinate and the other original values.
- Renaming and setting quantity to zero leave the item count unchanged.
- Clearing description and link persists after saving.
- Creating an item preserves description/link and explicitly placed 2D coordinates.
- Cancelling a subsequent edit leaves the saved record unchanged.
- Archive confirmation preserves the item in Archived & samples.
- Restoring history returns the item to the active list and highlights its marker,
  including when the previous view was filtered to archived items.
- Switching spaces clears the previous selection and loads the correct inventory.
- Local tool finding reveals and highlights a result excluded by the current search.
- At a 390 x 844 viewport, the map, detail controls, search, filters, and inventory
  were visually checked. No horizontal overflow occurred. The temporary viewport
  override was reset after checking.
- Final desktop 3D view renders the original room and selected marker with no
  browser console errors or warnings.

## Backup and preservation

The final backup is **backups/ilab-20260914T015751Z-5fa4dfd2.zip**. It was restored
into a separate new folder under **.runtime/restore-check-final/**. All 67 restored
files match the archive checksums. SQLite integrity and foreign-key checks pass;
both databases contain 15 review candidates and 36 archived entries.

Original media hashes still match the pre-change manifest. The machine-readable
results and backup SHA-256 are in **docs/verification.json**. Browser edits used
only the disposable database; the recovered inventory was not edited.

## Scope

Recovery is partial. All recovered physical locations and stock require review.
No real OpenAI request was sent; the cloud adapter was tested with a mock.
The GitHub Actions workflow is prepared; its equivalent checks were run locally.
