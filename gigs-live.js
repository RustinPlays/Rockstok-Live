import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Public pages only need Firestore; auth is handled separately on backstage.html.
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// index.html and gigs.html use different IDs, so support both with one loader.
const gigsLists = [
  document.getElementById("gigs-list"),
  document.getElementById("gigList")
].filter(Boolean);

if (!gigsLists.length) {
  console.error("Could not find a public gigs list on this page.");
} else {
  // Firestore cannot order by date here without a composite index for the public filter,
  // so the snapshot is filtered first and then sorted in the browser.
  const gigsQuery = query(
    collection(db, "gigs"),
    where("public", "==", true)
  );

  onSnapshot(
    gigsQuery,
    (snapshot) => {
      const gigs = [];

      snapshot.forEach((doc) => {
        const gig = doc.data();

        // Public gigs are hidden from visitors after the expiry window passes.
        if (isGigVisible(gig)) {
          gigs.push(gig);
        }
      });

      gigs.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (!gigs.length) {
        renderGigsHtml(`
          <article class="empty-card glass-panel">
            <span class="pill">Coming soon</span>
            <h3>Fresh dates coming soon</h3>
            <p>Rockstok is lining up the next run of shows. For private events, venues and party bookings, get in touch below.</p>
            <a class="button ghost" href="booking.html">Enquire about bookings</a>
          </article>
        `);
        updateNextGig(null);
        return;
      }

      renderGigsHtml(gigs.map((gig) => {
        const d = formatDate(gig.date);
        const ticketLink = gig.ticketLink || gig.ticketUrl || "";
        const href = ticketLink || "booking.html";
        const buttonText = ticketLink ? "Details / Tickets" : "Enquire";
        const mapAddress = getMapAddress(gig);

        return `
          <article class="gig-card glass-panel">
            <div class="gig-date">
              <span>${d ? d.month : "TBC"}</span>
              <strong>${d ? d.day : "--"}</strong>
            </div>

            <div>
              <h3>${escapeHtml(gig.title || "Rockstok Live")}</h3>
              <p class="gig-meta">
                ${d ? d.full : "Date TBC"} - ${escapeHtml(gig.time || "Time TBC")} - ${escapeHtml(gig.venue || "Venue TBC")}${gig.location ? ` - ${escapeHtml(gig.location)}` : ""}
              </p>
              ${mapAddress ? `<a class="gig-map-link" href="${escapeHtml(getGoogleMapsUrl(mapAddress, gig.mapPlaceId))}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(mapAddress)} in Google Maps"><span class="map-pin-icon" aria-hidden="true"></span><span>${escapeHtml(mapAddress)}</span></a>` : ""}
              ${gig.description ? `<p class="gig-meta">${escapeHtml(gig.description)}</p>` : ""}
            </div>

            <a class="button ghost" href="${escapeHtml(href)}" ${ticketLink ? 'target="_blank" rel="noopener"' : ""}>${buttonText}</a>
          </article>
        `;
      }).join(""));

      updateNextGig(gigs[0]);
    },
    (error) => {
      console.error("Error loading gigs:", error);

      renderGigsHtml(`
        <article class="empty-card glass-panel">
          <span class="pill">Could not load gigs</span>
          <h3>Please check back soon</h3>
          <p>There was an issue loading the latest Rockstok dates.</p>
          <a class="button ghost" href="booking.html">Enquire about bookings</a>
        </article>
      `);
    }
  );
}

function renderGigsHtml(html) {
  gigsLists.forEach((list) => {
    list.innerHTML = html;
  });
}

// The hero "Next up" panel mirrors the first visible public gig.
function updateNextGig(gig) {
  const nextGigTitle = document.getElementById("nextGigTitle");
  const nextGigDetails = document.getElementById("nextGigDetails");

  if (!nextGigTitle || !nextGigDetails) return;

  if (!gig) {
    nextGigTitle.textContent = "Bookings open now";
    nextGigDetails.textContent = "Want Rockstok at your venue or event? Send an enquiry and we will get back to you.";
    return;
  }

  const d = formatDate(gig.date);
  nextGigTitle.textContent = gig.venue || gig.title || "Rockstok Live";
  nextGigDetails.textContent = `${d ? d.full : "Date TBC"} - ${gig.time || "Time TBC"}${gig.location ? ` - ${gig.location}` : ""}`;
}

function formatDate(dateString) {
  if (!dateString) return null;

  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return {
    day: date.toLocaleDateString("en-NZ", { day: "2-digit" }),
    month: date.toLocaleDateString("en-NZ", { month: "short" }).toUpperCase(),
    full: date.toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric"
    })
  };
}

// Matches admin expiry: visible through the day after the event date.
function isGigVisible(gig) {
  if (!gig?.date) return false;

  const expiry = new Date(`${gig.date}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return false;

  expiry.setDate(expiry.getDate() + 1);
  return expiry >= new Date();
}

function getMapAddress(gig) {
  return (gig.mapAddress || [gig.venue, gig.location].filter(Boolean).join(", ")).trim();
}

function getGoogleMapsUrl(address, placeId = "") {
  const params = new URLSearchParams({
    api: "1",
    query: address
  });

  if (placeId) {
    params.set("query_place_id", placeId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

// Public Firestore data is admin-entered, so escape before injecting HTML.
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
