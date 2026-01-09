import argparse
import re
from datetime import datetime, timezone

import pandas as pd
import matplotlib.pyplot as plt


def pick_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    lower_map = {c.lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in lower_map:
            return lower_map[cand.lower()]
    return None


def normalize_text(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip()


def save_status_chart(by_status: dict, title: str, out_path: str) -> None:
    if not by_status:
        return
    labels = list(by_status.keys())
    values = list(by_status.values())

    plt.figure()
    plt.bar(labels, values)
    plt.title(title)
    plt.xlabel("Status")
    plt.ylabel("Count")
    plt.xticks(rotation=25, ha="right")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()


def save_keyword_chart(kw_counts: dict, title: str, out_path: str) -> None:
    if not kw_counts:
        return
    labels = list(kw_counts.keys())[::-1]
    values = list(kw_counts.values())[::-1]

    plt.figure()
    plt.barh(labels, values)
    plt.title(title)
    plt.xlabel("Count")
    plt.tight_layout()
    plt.savefig(out_path, dpi=200)
    plt.close()


def main():
    parser = argparse.ArgumentParser(
        description="Generate a client specific bug deploy brief from an Excel export, plus charts."
    )
    parser.add_argument("--file", required=True, help="Path to the Excel file")
    parser.add_argument("--client", default="West Coast", help="Client filter substring")
    parser.add_argument("--fix-version", default="", help="Optional fix version substring filter")
    parser.add_argument("--max-bugs", type=int, default=30, help="Max bugs to list")
    parser.add_argument("--out", default="", help="Optional markdown output file path")
    parser.add_argument(
        "--charts-prefix",
        default="",
        help="Optional prefix for chart filenames (example: west_coast)",
    )
    args = parser.parse_args()

    df = pd.read_excel(args.file)

    key_col = pick_col(df, ["Key", "Issue Key", "Issue"])
    summary_col = pick_col(df, ["Summary", "Title"])
    status_col = pick_col(df, ["Status"])
    created_col = pick_col(df, ["Created", "Created date", "Created At"])
    due_col = pick_col(df, ["Due date", "Due Date", "Due"])
    fix_col = pick_col(df, ["Fix versions", "Fix Version"])
    client_col = pick_col(df, ["Clients", "Client(s)", "Client", "Customer"])

    if not key_col or not summary_col or not status_col:
        raise SystemExit("Missing required columns: Key, Summary, Status")

    if not client_col:
        raise SystemExit("Could not find a client column (Clients or Client(s))")

    df[client_col] = df[client_col].fillna("").astype(str)
    df[summary_col] = df[summary_col].fillna("").astype(str)
    df[status_col] = df[status_col].fillna("").astype(str)

    target = args.client.strip()
    filtered = df[df[client_col].str.contains(target, case=False, na=False)].copy()

    if args.fix_version.strip() and fix_col:
        fv = args.fix_version.strip()
        filtered = filtered[
            filtered[fix_col]
            .fillna("")
            .astype(str)
            .str.contains(fv, case=False, na=False)
        ].copy()

    created_dt = pd.to_datetime(filtered[created_col], errors="coerce") if created_col else None
    due_dt = pd.to_datetime(filtered[due_col], errors="coerce") if due_col else None

    total = len(filtered)
    by_status = filtered[status_col].value_counts(dropna=False).to_dict()
    by_fix = filtered[fix_col].value_counts(dropna=False).head(10).to_dict() if fix_col else {}

    date_min = created_dt.min() if created_dt is not None else None
    date_max = created_dt.max() if created_dt is not None else None
    due_min = due_dt.min() if due_dt is not None else None
    due_max = due_dt.max() if due_dt is not None else None

    keywords = [
        "payment", "chargeback", "refund",
        "move in", "move-in", "movein",
        "mobile",
        "report", "ledger",
        "task", "workflow",
        "login", "auth",
        "sms", "email",
        "api", "integration",
    ]

    def keyword_hits(text: str) -> set[str]:
        t = text.lower()
        return {k for k in keywords if k in t}

    filtered["_kw"] = filtered[summary_col].apply(keyword_hits)

    kw_counts: dict[str, int] = {}
    for hits in filtered["_kw"]:
        for h in hits:
            kw_counts[h] = kw_counts.get(h, 0) + 1
    kw_counts = dict(sorted(kw_counts.items(), key=lambda x: x[1], reverse=True)[:12])

    filtered["_due_dt"] = due_dt if due_dt is not None else pd.NaT
    filtered["_created_dt"] = created_dt if created_dt is not None else pd.NaT
    filtered_sorted = filtered.sort_values(
        by=["_due_dt", status_col, "_created_dt"],
        ascending=[True, True, False],
        na_position="last",
    )

    now = datetime.now(timezone.utc).astimezone()
    lines = []
    lines.append(f"# Bug Deploy Brief: {target}")
    lines.append("")
    lines.append(f"Generated: {now.strftime('%Y-%m-%d %H:%M %Z')}")
    lines.append("")
    lines.append("## Scope")
    lines.append(f"- Source file: `{args.file}`")
    if args.fix_version.strip():
        lines.append(f"- Fix version filter: `{args.fix_version.strip()}`")
    lines.append("")
    lines.append("## Topline")
    lines.append(f"- Total bugs: **{total}**")
    if date_min is not None or date_max is not None:
        lines.append(f"- Created range: **{date_min}** to **{date_max}**")
    if due_min is not None or due_max is not None:
        lines.append(f"- Due date range: **{due_min}** to **{due_max}**")
    lines.append("")
    lines.append("## Status breakdown")
    for k, v in by_status.items():
        lines.append(f"- {k}: {v}")
    lines.append("")
    if by_fix:
        lines.append("## Top fix versions (top 10)")
        for k, v in by_fix.items():
            k2 = "Unknown" if (pd.isna(k) or str(k).strip() == "") else str(k)
            lines.append(f"- {k2}: {v}")
        lines.append("")
    if kw_counts:
        lines.append("## Keyword signals (directional)")
        for k, v in kw_counts.items():
            lines.append(f"- {k}: {v}")
        lines.append("")

    lines.append("## Bug summaries (paste into AI prompt)")
    show = filtered_sorted.head(min(args.max_bugs, len(filtered_sorted)))
    for _, row in show.iterrows():
        key = normalize_text(row.get(key_col, ""))
        summ = normalize_text(row.get(summary_col, ""))
        stat = normalize_text(row.get(status_col, ""))
        lines.append(f"- [{key}] ({stat}) {summ}")

    report = "\n".join(lines)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(report)

    print(report)

    prefix = args.charts_prefix.strip()
    prefix_part = (prefix + "_") if prefix else ""

    save_status_chart(
        by_status=by_status,
        title=f"Status Distribution: {target}",
        out_path=f"{prefix_part}status_distribution.png",
    )
    save_keyword_chart(
        kw_counts=kw_counts,
        title=f"Keyword Signals (Directional): {target}",
        out_path=f"{prefix_part}keyword_signals.png",
    )

    print("")
    print("Charts written:")
    print(f"- {prefix_part}status_distribution.png")
    print(f"- {prefix_part}keyword_signals.png")


if __name__ == "__main__":
    main()

