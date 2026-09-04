
require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0
}));

const rate = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 12;
  const item = rate.get(key) || { count: 0, start: now };
  if (now - item.start > windowMs) {
    item.count = 0;
    item.start = now;
  }
  item.count += 1;
  rate.set(key, item);
  if (item.count > max) {
    return res.status(429).json({ message: "Too many submissions. Please try again later." });
  }
  next();
}

function clean(value, max = 500) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
}

function validateLead(body) {
  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  const email = clean(body.email, 180);
  const message = clean(body.message, 2500);

  if (!name || name.length < 2) return "Please enter your name.";
  if (!phone || !/^[+()\-\s0-9]{7,20}$/.test(phone)) return "Please enter a valid phone number.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
  if (body.source === "website_full_form" && !message) return "Please describe your project requirement.";
  return null;
}

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function saveLead(lead) {
  if (supabase) {
    const { data, error } = await supabase.from("website_leads").insert(lead).select("id").single();
    if (error) throw error;
    return { storage: "supabase", id: data.id };
  }

  // Local fallback so the website works during testing before Supabase is configured.
  const file = path.join(__dirname, "data", "leads.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(file, "utf8")); } catch (_) {}
  rows.push(lead);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  return { storage: "local", id: lead.id };
}

app.post("/api/leads", rateLimit, async (req, res) => {
  try {
    if (clean(req.body.website)) return res.status(200).json({ ok: true });

    const validation = validateLead(req.body);
    if (validation) return res.status(400).json({ message: validation });

    const lead = {
      id: crypto.randomUUID(),
      name: clean(req.body.name, 120),
      phone: clean(req.body.phone, 40),
      email: clean(req.body.email, 180) || null,
      college: clean(req.body.college, 180) || null,
      course: clean(req.body.course, 120) || null,
      branch: clean(req.body.branch, 160) || null,
      project_type: clean(req.body.project_type, 120) || null,
      domain: clean(req.body.domain, 120) || null,
      deadline: clean(req.body.deadline, 120) || null,
      message: clean(req.body.message, 2500) || null,
      source: clean(req.body.source, 100) || "website",
      consent: String(req.body.consent || "") === "true",
      utm_source: clean(req.body.utm_source, 200) || null,
      utm_medium: clean(req.body.utm_medium, 200) || null,
      utm_campaign: clean(req.body.utm_campaign, 200) || null,
      utm_content: clean(req.body.utm_content, 200) || null,
      utm_term: clean(req.body.utm_term, 200) || null,
      landing_page: clean(req.body.landing_page || req.body.page_url, 1000) || null,
      referrer: clean(req.body.referrer, 1000) || null,
      status: "new",
      created_at: new Date().toISOString()
    };

    const result = await saveLead(lead);
    res.status(201).json({ ok: true, id: result.id, storage: result.storage });
  } catch (error) {
    console.error("Lead save error:", error);
    res.status(500).json({ message: "We could not save your enquiry. Please contact us by phone or WhatsApp." });
  }
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "automate-me-lead-website",
    leadStorage: supabase ? "supabase" : "local-fallback",
    timestamp: new Date().toISOString()
  });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Automate Me website running on http://localhost:${PORT}`);
  console.log(`Lead storage: ${supabase ? "Supabase" : "local data/leads.json fallback"}`);
});
