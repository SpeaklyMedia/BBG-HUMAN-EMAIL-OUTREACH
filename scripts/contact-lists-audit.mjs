import fs from "fs";
import path from "path";

const EXPECTED = [
  "CONTACTS.csv",
  "SUPPRESSION.csv",
  "MAILCHIMP_SUBSCRIBERS.csv",
  "CUSTOMERS.csv",
  "SEGMENTS.csv",
  "RUNS.csv",
  "EVENT_LOG.csv",
  "TEMPLATES.csv"
];

function parseArgs(argv) {
  const out = {
    input: "",
    output: ""
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input") out.input = argv[++i] || "";
    else if (arg === "--output") out.output = argv[++i] || "";
  }

  if (!out.input || !out.output) {
    throw new Error("Usage: node scripts/contact-lists-audit.mjs --input <csv-dir> --output <out-dir>");
  }

  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = cols[idx] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  if (!value) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
}

function countDuplicates(values) {
  const seen = new Map();
  for (const value of values) {
    if (!value) continue;
    seen.set(value, (seen.get(value) || 0) + 1);
  }
  let duplicates = 0;
  for (const count of seen.values()) {
    if (count > 1) duplicates += count - 1;
  }
  return duplicates;
}

function analyzeSurface(fileName, parsed) {
  const headers = parsed.headers;
  const rows = parsed.rows;
  const hasEmail = headers.includes("email");
  const hasEmailNorm = headers.includes("email_norm");
  const hasContactId = headers.includes("contact_id");

  const emails = hasEmail ? rows.map((row) => normalizeEmail(row.email)) : [];
  const emailNorms = hasEmailNorm ? rows.map((row) => normalizeEmail(row.email_norm)) : [];
  const contactIds = hasContactId ? rows.map((row) => String(row.contact_id || "").trim()) : [];

  const missingEmailCount = hasEmail ? emails.filter((value) => !value).length : "";
  const invalidEmailCount = hasEmail ? emails.filter((value) => value && !isValidEmail(value)).length : "";

  return {
    surface: fileName.replace(/\.csv$/i, ""),
    file_name: fileName,
    total_rows: rows.length,
    unique_emails: hasEmail ? new Set(emails.filter(Boolean)).size : "",
    unique_email_norm: hasEmailNorm ? new Set(emailNorms.filter(Boolean)).size : "",
    duplicate_email_count: hasEmail ? countDuplicates(emails) : "",
    duplicate_contact_id_count: hasContactId ? countDuplicates(contactIds) : "",
    missing_email_count: missingEmailCount,
    invalid_email_format_count: invalidEmailCount,
    missing_imported_at: headers.includes("imported_at")
      ? rows.filter((row) => !String(row.imported_at || "").trim()).length
      : "",
    headers
  };
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const args = parseArgs(process.argv);
  ensureDir(args.output);

  const summaryRows = [];
  const issueRows = [];

  for (const fileName of EXPECTED) {
    const fullPath = path.join(args.input, fileName);
    if (!fs.existsSync(fullPath)) {
      summaryRows.push({
        surface: fileName.replace(/\.csv$/i, ""),
        file_name: fileName,
        total_rows: "missing",
        unique_emails: "",
        unique_email_norm: "",
        duplicate_email_count: "",
        duplicate_contact_id_count: "",
        missing_email_count: "",
        invalid_email_format_count: "",
        missing_imported_at: "",
        status: "missing_file"
      });
      issueRows.push({
        severity: "high",
        surface: fileName.replace(/\.csv$/i, ""),
        issue: "missing_file",
        detail: fullPath
      });
      continue;
    }

    const parsed = parseCsv(fullPath);
    const analyzed = analyzeSurface(fileName, parsed);
    summaryRows.push({
      surface: analyzed.surface,
      file_name: analyzed.file_name,
      total_rows: analyzed.total_rows,
      unique_emails: analyzed.unique_emails,
      unique_email_norm: analyzed.unique_email_norm,
      duplicate_email_count: analyzed.duplicate_email_count,
      duplicate_contact_id_count: analyzed.duplicate_contact_id_count,
      missing_email_count: analyzed.missing_email_count,
      invalid_email_format_count: analyzed.invalid_email_format_count,
      missing_imported_at: analyzed.missing_imported_at,
      status: "ok"
    });

    if (Number(analyzed.duplicate_email_count) > 0) {
      issueRows.push({
        severity: "medium",
        surface: analyzed.surface,
        issue: "duplicate_emails",
        detail: String(analyzed.duplicate_email_count)
      });
    }

    if (Number(analyzed.duplicate_contact_id_count) > 0) {
      issueRows.push({
        severity: "medium",
        surface: analyzed.surface,
        issue: "duplicate_contact_ids",
        detail: String(analyzed.duplicate_contact_id_count)
      });
    }

    if (Number(analyzed.invalid_email_format_count) > 0) {
      issueRows.push({
        severity: "medium",
        surface: analyzed.surface,
        issue: "invalid_email_format",
        detail: String(analyzed.invalid_email_format_count)
      });
    }
  }

  writeCsv(
    path.join(args.output, "ALL_CONTACT_LISTS_SUMMARY.csv"),
    [
      "surface",
      "file_name",
      "total_rows",
      "unique_emails",
      "unique_email_norm",
      "duplicate_email_count",
      "duplicate_contact_id_count",
      "missing_email_count",
      "invalid_email_format_count",
      "missing_imported_at",
      "status"
    ],
    summaryRows
  );

  writeCsv(
    path.join(args.output, "ALL_CONTACT_LISTS_ISSUES.csv"),
    ["severity", "surface", "issue", "detail"],
    issueRows
  );

  const report = [
    "# Contact Lists Audit",
    "",
    `Input: ${args.input}`,
    `Output: ${args.output}`,
    "",
    "This script is dry-run only. It reads CSV exports and writes audit artifacts without mutating source data.",
    "",
    "Surfaces processed:",
    ...summaryRows.map((row) => `- ${row.surface}: ${row.status}`)
  ].join("\n");

  fs.writeFileSync(path.join(args.output, "ALL_CONTACT_LISTS_REVIEW.md"), `${report}\n`, "utf8");
}

main();
