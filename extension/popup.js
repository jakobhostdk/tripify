"use strict";

const DEFAULT_API_BASE = "http://localhost:3000";

const $ = (id) => document.getElementById(id);

async function getApiBase() {
  try {
    const { apiBase } = await chrome.storage.local.get("apiBase");
    return apiBase || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  return tab;
}

/**
 * Heuristic guess of the proposal kind from a URL's hostname. Defaults to
 * "destination" so the user always has something selected they can override.
 */
function guessKindFromUrl(url) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "destination";
  }
  if (
    /airbnb|booking\.com|hotels?\.|hostelworld|expedia|kayak|trivago|vrbo/.test(
      host,
    )
  ) {
    return "accommodation";
  }
  if (
    /yelp|opentable|zomato|theinfatuation|tabelog|guide-michelin|eater\./.test(
      host,
    )
  ) {
    return "restaurant";
  }
  if (/getyourguide|viator|klook|tiqets|musement|civitatis/.test(host)) {
    return "activity";
  }
  return "destination";
}

/**
 * Parse an Airbnb listing or booking URL into our structured booking shape.
 * Returns null when the URL isn't recognisably Airbnb.
 *
 * Recognised paths:
 *   /rooms/<id>            — listing page
 *   /book/stays/<id>       — booking flow (the example URL the user shared)
 *
 * Recognised query params:
 *   checkin / checkout                        (YYYY-MM-DD)
 *   numberOfAdults / numberOfChildren
 *   numberOfInfants / numberOfPets
 *   guestCurrency                              (ISO 4217)
 */
function parseAirbnbUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!/(^|\.)airbnb\./i.test(u.hostname)) return null;

  const pathMatch = u.pathname.match(/\/(?:rooms|book\/stays)\/(\d+)/);
  const listingId = pathMatch ? pathMatch[1] : undefined;
  if (!listingId) return null;

  const q = u.searchParams;
  const intParam = (name) => {
    const v = q.get(name);
    if (v === null) return undefined;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };
  const dateParam = (name) => {
    const v = q.get(name);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
  };

  return {
    provider: "airbnb",
    listingId,
    checkin: dateParam("checkin"),
    checkout: dateParam("checkout"),
    adults: intParam("numberOfAdults"),
    children: intParam("numberOfChildren"),
    infants: intParam("numberOfInfants"),
    pets: intParam("numberOfPets"),
    currency: (q.get("guestCurrency") || "").toUpperCase() || undefined,
  };
}

function formatShortDate(ymd) {
  if (!ymd) return "";
  const d = new Date(`${ymd}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function nightsBetween(checkin, checkout) {
  if (!checkin || !checkout) return 0;
  const a = new Date(`${checkin}T00:00:00Z`).getTime();
  const b = new Date(`${checkout}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

function synthesizeAirbnbTitle(booking, fallback) {
  if (booking.checkin && booking.checkout) {
    const range = `${formatShortDate(booking.checkin)} – ${formatShortDate(
      booking.checkout,
    )}`;
    const guests = [];
    if (booking.adults)
      guests.push(`${booking.adults} ${booking.adults === 1 ? "adult" : "adults"}`);
    if (booking.children)
      guests.push(`${booking.children} child${booking.children === 1 ? "" : "ren"}`);
    const guestPart = guests.length ? ` · ${guests.join(", ")}` : "";
    return `Airbnb · ${range}${guestPart}`;
  }
  // No dates known — fall back to the page title, stripped of the Airbnb suffix.
  return cleanupAirbnbPageTitle(fallback) || "Airbnb stay";
}

/** Strip the standard " - Airbnb" suffix from a page title. */
function cleanupAirbnbPageTitle(title) {
  if (!title) return "";
  return title
    .replace(/\s*[-–]\s*Airbnb.*$/i, "")
    .replace(/^\s*Confirm and pay.*$/i, "")
    .trim();
}

function renderAirbnbBanner(booking) {
  const detail = $("airbnb-detail");
  detail.innerHTML = "";

  const bits = [];
  if (booking.checkin && booking.checkout) {
    const range = `${formatShortDate(booking.checkin)} – ${formatShortDate(
      booking.checkout,
    )}`;
    const nights = nightsBetween(booking.checkin, booking.checkout);
    bits.push(`${range} (${nights} night${nights === 1 ? "" : "s"})`);
  }
  const guests = [];
  if (booking.adults)
    guests.push(`${booking.adults} ${booking.adults === 1 ? "adult" : "adults"}`);
  if (booking.children) guests.push(`${booking.children} children`);
  if (booking.infants) guests.push(`${booking.infants} infants`);
  if (booking.pets) guests.push(`${booking.pets} pets`);
  if (guests.length) bits.push(guests.join(", "));
  if (booking.currency) bits.push(booking.currency);

  for (let i = 0; i < bits.length; i++) {
    if (i > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "·";
      detail.appendChild(sep);
    }
    const span = document.createElement("span");
    span.textContent = bits[i];
    detail.appendChild(span);
  }

  $("airbnb-banner").hidden = false;
}

function showState(id) {
  for (const el of document.querySelectorAll(".state, form")) {
    el.hidden = el.id !== id;
  }
}

function showError(message) {
  $("error-message").textContent = message;
  showState("error");
}

let detectedBooking = null;

async function init() {
  const apiBase = await getApiBase();
  try {
    $("api-host").textContent = new URL(apiBase).host;
  } catch {
    $("api-host").textContent = apiBase;
  }
  $("open-tripify").href = apiBase;

  const tab = await getActiveTab();

  let me;
  try {
    const meResp = await fetch(`${apiBase}/api/extension/me`, {
      credentials: "include",
    });
    if (meResp.status === 401) {
      showState("signed-out");
      return;
    }
    if (!meResp.ok) {
      throw new Error(`HTTP ${meResp.status}`);
    }
    me = await meResp.json();
  } catch (err) {
    showError(`Can't reach Tripify at ${apiBase} — ${err.message}.`);
    return;
  }

  let trips = [];
  try {
    const resp = await fetch(`${apiBase}/api/extension/trips`, {
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    trips = Array.isArray(data.trips) ? data.trips : [];
  } catch (err) {
    showError(`Couldn't load trips — ${err.message}.`);
    return;
  }

  if (trips.length === 0) {
    showError("No trips to add to yet. Create one in Tripify first.");
    return;
  }

  const tripSelect = $("tripId");
  tripSelect.innerHTML = "";
  for (const t of trips) {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    tripSelect.appendChild(opt);
  }

  try {
    const { lastTripId } = await chrome.storage.local.get("lastTripId");
    if (lastTripId && trips.some((t) => t.id === lastTripId)) {
      tripSelect.value = lastTripId;
    }
  } catch {
    /* ignore */
  }

  const tabUrl = tab?.url || "";
  const tabTitle = (tab?.title || "").trim();

  detectedBooking = parseAirbnbUrl(tabUrl);

  if (detectedBooking) {
    $("kind").value = "accommodation";
    $("title").value = synthesizeAirbnbTitle(detectedBooking, tabTitle);
    $("url").value = tabUrl;
    renderAirbnbBanner(detectedBooking);
  } else {
    $("title").value = tabTitle;
    $("url").value = tabUrl;
    $("kind").value = guessKindFromUrl(tabUrl);
  }

  showState("proposal-form");

  $("proposal-form").addEventListener("submit", onSubmit);
  $("error-retry").addEventListener("click", () => {
    showState("loading");
    init();
  });
  $("success-again").addEventListener("click", () => {
    $("notes").value = "";
    $("fit-message").hidden = true;
    showState("proposal-form");
  });
}

async function onSubmit(event) {
  event.preventDefault();
  const apiBase = await getApiBase();
  const tripId = $("tripId").value;
  const kind = $("kind").value;
  const title = $("title").value.trim();
  const url = $("url").value.trim();
  const notes = $("notes").value.trim();

  if (!title) return;

  const submitBtn = $("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Adding…";

  try {
    const body = { tripId, kind, title, url, notes };
    if (detectedBooking) body.booking = detectedBooking;

    const resp = await fetch(`${apiBase}/api/extension/proposals`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      let detail = `HTTP ${resp.status}`;
      try {
        const errBody = await resp.json();
        if (errBody?.error) detail = errBody.error;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }

    const data = await resp.json();
    try {
      await chrome.storage.local.set({ lastTripId: tripId });
    } catch {
      /* ignore */
    }

    $("success-message").textContent = `Added to ${data.tripName}.`;
    $("success-link").href = `${apiBase}/trips/${tripId}`;

    // If the API checked dates against the trip's target window, surface that.
    const fitEl = $("fit-message");
    if (data.fit === "fits") {
      fitEl.textContent = "✓ Inside the group's target window.";
      fitEl.className = "fit-line ok";
      fitEl.hidden = false;
    } else if (data.fit === "partial") {
      fitEl.textContent = "≈ Overlaps the target window but spills past one edge.";
      fitEl.className = "fit-line warn";
      fitEl.hidden = false;
    } else if (data.fit === "outside") {
      fitEl.textContent = "✗ Outside the group's target window.";
      fitEl.className = "fit-line warn";
      fitEl.hidden = false;
    } else {
      fitEl.hidden = true;
    }

    showState("success");
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Put it on the table";
    showError(err.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
