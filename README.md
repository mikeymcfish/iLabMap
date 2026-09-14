# iLab Map

A local-first inventory app for finding lab tools on a floor plan or in a 3D room.
Flask, SQLite, and modular browser JavaScript. No CDN, cloud account, or AI key is
required for inventory browsing or editing.

## Run on Windows

The prepared checkout includes a working Python 3.12 environment.

~~~powershell
.\run.ps1
~~~

Open **http://127.0.0.1:5015**. The server binds to the loopback interface by default.
Staff editing uses the generated password in **instance/admin-password.txt**.
That file, the session secret, .env, and live database are excluded from Git.
Stop a foreground server with Ctrl+C.

For a fresh checkout, install [uv](https://docs.astral.sh/uv/), then:

~~~powershell
$env:UV_PYTHON_INSTALL_DIR = Join-Path $PWD '.runtime\python'
uv --cache-dir .runtime/cache sync --locked
.\.venv\Scripts\python.exe -m flask --app app:create_app init-db
.\.venv\Scripts\python.exe -m flask --app app:create_app import-recovery
.\.venv\Scripts\python.exe main.py
~~~

Built/vendor assets are included, so Node is needed only when developing the UI.
**pyproject.toml** and **uv.lock** are authoritative. **requirements.txt** is a
generated, hash-locked compatibility export. Do not edit it separately.

## Recovered data

[recovery/report.json](recovery/report.json) records the recovery results.
[data/recovered-inventory.json](data/recovered-inventory.json) is the repeatable seed.

- GitHub main was inspected at **ea0282b891e6ccf37bd860dbc8321d0e09011b46**.
  It contained no database or SQL dump.
- Recovered **51 candidates**: **15 inventory candidates** (14 in iLab, one in
  Closet) and **36 archived sample/test entries**.
- **Five candidates have 3D coordinates**. Those coordinates came from form
  submissions that encountered the historical schema bug.
- Seven candidates could be associated with an existing/recovered image.
- The five-row CSV in commit **7946caef785ba044dc9a455d60face471a7a8cbf** is sample
  data, including example.com links. Its entries remain archived.
- Repeated submissions at the same name, map, and 2D location are consolidated.
  Every source line/date is retained in each candidate's provenance.
- This is a partial reconstruction, not a complete database snapshot. Later
  edits/deletions and current physical stock cannot be inferred from these logs.
  The project also changed maps over time; confirm recovered locations.

Recovered candidates start as **Needs review**. Staff can review their details,
place them on the map, and set them to **Verified / available**. Archived samples
remain accessible through **Archived & samples**. Imports are idempotent and never
overwrite staff edits to previously imported records.

Original code and hashes were preserved under **recovery/original-20260914/**.
Raw main-branch assets/logs and historical files are in **recovery/github-main/**
and **recovery/history/**. These local evidence folders are excluded from Git.
The old migrations are retained in **migrations/legacy_2024/**; the new baseline is
for fresh databases. **Do not apply it directly to an unidentified old database.**
Keep that database unchanged and import its data into a separate new database.

## Workflows

- Search by name, tags, description, or shelf; filter stock and review status.
- Select an inventory card or map marker to highlight its location.
- Toggle Floor plan / 3D lab. The 3D renderer loads on demand and renders only
  when the view changes. Zero-valued coordinates are valid.
- Staff can create and edit items. Photos and locations are staged until Save;
  Cancel does not write changes. Quantity zero and cleared text fields persist.
- **Choose on floor plan** or **Choose in 3D** enters placement mode, then returns
  to the form. No Shift-click or hidden canvas is required.
- Archive is reversible. History can restore an earlier snapshot, including its
  image. Optimistic revision checks prevent silent overwrites by another editor.
- **Copy item link** gives a direct link that selects the item and its space.
- **Export inventory** downloads structured JSON for staff.

The default floor-plan asset is the PNG used by the final 3D branch, preserving
its 1024 × 1024 coordinate space. Closet uses its actual SVG dimensions.
The 3D model retains the original scale, rotation, and offset used for saved
coordinates. Original images/models are preserved; delivery derivatives live in
**static/optimized/**.

## Backups and restoration

~~~powershell
.\.venv\Scripts\python.exe backup_db.py
.\.venv\Scripts\python.exe backup_db.py --verify backups\<backup-name>.zip
.\.venv\Scripts\python.exe backup_db.py --restore backups\<backup-name>.zip --destination P:\path\to\new-restore-folder
~~~

Backups use SQLite's online backup API, bundle maps/photos/model assets, produce
JSON from the same database snapshot, and verify file hashes, SQLite integrity,
and foreign keys before publishing the ZIP. Restoration requires a **new**
directory and never overwrites an existing installation. Session secrets and
staff passwords are not exported.

For recurring backups, use Windows Task Scheduler to run the one-shot command
with this project as the working directory. There is no scheduler inside web
workers. Keep a retention policy appropriate to your storage; the app does not
silently delete old backups or images required by history.

## Optional AI guide

Local tool finding works without an API key. Cloud guidance is explicitly opt-in:

~~~dotenv
ILAB_AI_ENABLED=true
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4.1-mini
~~~

Restart after configuration changes. Signed-in staff can then choose **Use AI
guide** in Tool finder. That choice sends the question, recent chat context, and
relevant inventory to OpenAI. The integration uses the Responses API, structured
output, validated inventory IDs, store=False, a 25-second timeout, and bounded
output. No cloud calls were made during restoration/testing; the provider path
is covered with a mock. Model access depends on the configured account.

[OpenAI's migration documentation](https://developers.openai.com/api/docs/assistants/migration)
documents the retired Assistants API and its replacement.

## Development and checks

~~~powershell
uv sync --locked
uv run pytest -q
uv run ruff check . --exclude migrations/legacy_2024
npm ci
npm run vendor
npm test
~~~

**tests/serve.py** runs disposable browser-test inventory on port 5016 with
**browser-test-password**. It uses a temporary database and never reads the live
inventory database. **docs/QA.md** records browser verification.

Use **npm run format** for front-end formatting. After dependency upgrades,
regenerate the vendor files and export requirements:

~~~powershell
uv lock --upgrade
uv sync --locked
uv export --locked --no-dev --format requirements-txt --output-file requirements.txt
npm run vendor
~~~

The server uses [Waitress](https://flask.palletsprojects.com/en/stable/deploying/waitress/)
instead of Flask's development server. For a shared deployment, configure an
HTTPS reverse proxy, ILAB_SECURE_COOKIES=true, a strong staff password, and the
intended bind address. The prepared local instance is not publicly deployed.
