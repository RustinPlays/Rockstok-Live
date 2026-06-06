import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const gigsList = document.getElementById("gigs-list");

if (!gigsList) {
  console.error("Could not find #gigs-list on this page.");
} else {
  const gigsQuery = query(
    collection(db, "gigs"),
    where("public", "==", true),
    orderBy("date", "asc")
  );

  onSnapshot(
    gigsQuery,
    (snapshot) => {
      gigsList.innerHTML = "";

      if (snapshot.empty) {
        gigsList.innerHTML = "<p>No upcoming gigs listed yet. Check back soon!</p>";
        return;
      }

      snapshot.forEach((doc) => {
        const gig = doc.data();

        const card = document.createElement("article");
        card.className = "gig-card glass-panel";

        const formattedDate = formatDate(gig.date);

        card.innerHTML = `
          <p class="eyebrow">${formattedDate}</p>
          <h2>${escapeHtml(gig.title || "Rockstok Live")}</h2>

          ${gig.venue ? `<p><strong>Venue:</strong> ${escapeHtml(gig.venue)}</p>` : ""}
          ${gig.location ? `<p><strong>Location:</strong> ${escapeHtml(gig.location)}</p>` : ""}
          ${gig.time ? `<p><strong>Time:</strong> ${escapeHtml(gig.time)}</p>` : ""}
          ${gig.description ? `<p>${escapeHtml(gig.description)}</p>` : ""}

          ${
            gig.ticketLink
              ? `<a class="button primary" href="${escapeHtml(gig.ticketLink)}" target="_blank" rel="noopener">More Info</a>`
              : ""
          }
        `;

        gigsList.appendChild(card);
      });
    },
    (error) => {
      console.error("Error loading gigs:", error);

      gigsList.innerHTML = `
        <p>Could not load gigs right now. Please check back soon.</p>
      `;
    }
  );
}

function formatDate(dateString) {
  if (!dateString) return "Date TBC";

  const date = new Date(dateString + "T00:00:00");

  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}