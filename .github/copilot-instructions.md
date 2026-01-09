# Copilot instructions for this repo

Purpose: give AI coding agents the minimal, actionable knowledge to be productive here.

- **Big picture**: This repository is a tiny project containing a static HTML file (`chario_airlines.html`) and a small Python utility under `bug-deploy/` used to produce reports/images (`bug-deploy/bug_deploy_brief.py`). There is no package manifest, web server, or CI configuration present.

- **Primary components**:
  - `chario_airlines.html` — single-page static HTML (presentation/artifact).
  - `bug-deploy/bug_deploy_brief.py` — the main script. Treat this as the canonical entrypoint for data/report generation.
  - `bug-deploy/` images and spreadsheet — inputs/outputs: `west_coast_keyword_signals.png`, `west_coast_status_distribution.png`, and `1_06_26 Bug Deploy.xlsx`.

- **Why this layout**: The project is a simple artifact + report generator. Changes should avoid adding heavy frameworks; prefer small, well-scoped scripts and clear outputs in `bug-deploy/`.

- **Developer workflows (how to run & debug)**:
  - Run the report script locally with the system Python: `python3 bug-deploy/bug_deploy_brief.py`.
  - If editing `chario_airlines.html`, open it directly in a browser to preview.
  - There are no tests or build steps; add lightweight unit tests only if new Python modules are introduced (use `pytest`).

- **Project-specific conventions & patterns**:
  - Keep logic in small, importable functions inside modules if you need to extend `bug_deploy_brief.py` — avoid one huge script body.
  - Data/artifacts live alongside the script in `bug-deploy/`.
  - Prefer explicit relative paths when reading/writing files (e.g., `bug-deploy/outputs/`) and avoid changing working directory implicitly.

- **Integration points & dependencies**:
  - No pinned dependencies or `requirements.txt` present. If you add dependencies, commit a `requirements.txt` and prefer minimal, widely-available packages.
  - The Python script may read the spreadsheet `1_06_26 Bug Deploy.xlsx` and produce PNGs — preserve filenames when updating logic unless the change also updates downstream consumers.

- **Coding/PR guidance for AI agents**:
  - Make minimal, focused edits; explain why a change is needed referencing exact files (examples below).
  - When adding new files, update README.md (if present) and include a one-line usage example.
  - For any runtime changes, include the exact command used to validate locally (e.g., `python3 bug-deploy/bug_deploy_brief.py`).

- **Concrete examples**:
  - To add logging to the report script: modify `bug-deploy/bug_deploy_brief.py`, add `import logging`, configure a basic logger, and show the command you ran to verify output.
  - To change a generated image name: update references in `bug-deploy/` and document the rename in the top of the modified file and in the PR description.

If any section is unclear or you need access patterns I couldn't detect (external services, hidden env files, or preferred Python versions), tell me which part to expand and I'll update this file.
