import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const allowedEmails = [
  "justin.oshea135@gmail.com",
  "rockstokcovers@gmail.com"
].map((email) => email.toLowerCase());

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");

const loginForm = document.getElementById("admin-login-form");
const emailInput = document.getElementById("admin-email");
const passwordInput = document.getElementById("admin-password");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const loginStatus = document.getElementById("login-status");
const sessionLinks = document.querySelectorAll(".admin-session-link");

const gigForm = document.getElementById("gig-form");
const gigVenueInput = document.getElementById("gig-venue");
const gigLocationInput = document.getElementById("gig-location");
const gigMapAddressInput = document.getElementById("gig-map-address");
const gigMapPlaceIdInput = document.getElementById("gig-map-place-id");
const gigMapPreview = document.getElementById("gig-map-preview");
const gigFormStatus = document.getElementById("gig-form-status");
const adminGigsList = document.getElementById("admin-gigs-list");
const adminEventSummary = document.getElementById("admin-event-summary");

let unsubscribeGigs = null;

hideAdminPanel();
setupBackstageFade();
setupGoogleMapsAutocomplete();

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginStatus.textContent = "Logging in...";
    loginButton.disabled = true;

    try {
      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );

      loginStatus.textContent = "";
      passwordInput.value = "";
    } catch (error) {
      console.error(error);
      loginStatus.textContent = "Login failed. Check your email and password.";
    }

    loginButton.disabled = false;
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await signOut(auth);
  });
}

onAuthStateChanged(auth, async (user) => {
  const userEmail = user?.email?.toLowerCase() || "";

  if (user && allowedEmails.includes(userEmail)) {
    showAdminPanel();
    loadSavedGigs();
    return;
  }

  hideAdminPanel();

  if (unsubscribeGigs) {
    unsubscribeGigs();
    unsubscribeGigs = null;
  }

  if (user && !allowedEmails.includes(userEmail)) {
    loginStatus.textContent = "This account is not allowed to access Rockstok admin.";
    await signOut(auth);
  }
});

if (gigForm) {
  gigForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const currentEmail = auth.currentUser?.email?.toLowerCase() || "";

    if (!auth.currentUser || !allowedEmails.includes(currentEmail)) {
      gigFormStatus.textContent = "Please log in before adding gigs.";
      hideAdminPanel();
      return;
    }

    gigFormStatus.textContent = "Saving gig...";

    const gig = {
      title: document.getElementById("gig-title").value.trim(),
      date: document.getElementById("gig-date").value,
      time: document.getElementById("gig-time").value.trim(),
      venue: gigVenueInput.value.trim(),
      location: gigLocationInput.value.trim(),
      mapAddress: gigMapAddressInput.value.trim(),
      mapPlaceId: gigMapPlaceIdInput.value.trim(),
      ticketLink: document.getElementById("gig-ticket-link").value.trim(),
      description: document.getElementById("gig-description").value.trim(),
      public: document.getElementById("gig-public").value === "true",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "gigs"), gig);

      gigForm.reset();
      document.getElementById("gig-public").value = "true";
      gigMapPlaceIdInput.value = "";
      updateMapPreview();
      gigFormStatus.textContent = "Event saved. If public, it now appears on the home page and gigs page.";
    } catch (error) {
      console.error(error);
      gigFormStatus.textContent = "Could not save gig. Check Firebase Authentication, Firestore, and rules.";
    }
  });
}

[gigVenueInput, gigLocationInput, gigMapAddressInput].forEach((input) => {
  input?.addEventListener("input", updateMapPreview);
});

gigMapAddressInput?.addEventListener("input", () => {
  if (gigMapPlaceIdInput) gigMapPlaceIdInput.value = "";
});

updateMapPreview();

function showAdminPanel() {
  loginPanel.hidden = true;
  adminPanel.hidden = false;
  setSessionLinksVisible(true);
}

function hideAdminPanel() {
  loginPanel.hidden = false;
  adminPanel.hidden = true;
  setSessionLinksVisible(false);
}

function setSessionLinksVisible(visible) {
  sessionLinks.forEach((link) => {
    link.hidden = !visible;
  });
}

function setupBackstageFade() {
  const pageSection = document.querySelector(".admin-page-section");
  if (!pageSection) return;

  const updateFade = () => {
    const opacity = Math.max(0, 1 - window.scrollY / 180);
    pageSection.style.setProperty("--backstage-word-opacity", opacity.toFixed(3));
  };

  updateFade();
  window.addEventListener("scroll", updateFade, { passive: true });
}

function loadSavedGigs() {
  if (unsubscribeGigs) return;

  const gigsQuery = query(
    collection(db, "gigs"),
    orderBy("date", "asc")
  );

  unsubscribeGigs = onSnapshot(
    gigsQuery,
    (snapshot) => {
      adminGigsList.innerHTML = "";

      if (snapshot.empty) {
        updateEventSummary([]);
        adminGigsList.innerHTML = "<p>No saved events yet.</p>";
        return;
      }

      const gigs = [];

      snapshot.forEach((gigDoc) => {
        const gig = gigDoc.data();
        gigs.push(gig);

        const card = document.createElement("article");
        card.className = "contact-card glass-panel admin-gig-card";
        const status = getGigStatus(gig);
        const ticketLink = gig.ticketLink || gig.ticketUrl || "";
        const mapAddress = getMapAddress(gig);

        card.innerHTML = `
          <div class="admin-gig-card-main">
            <strong>${escapeHtml(gig.title || "Untitled event")}</strong>
            <span><strong>Date:</strong> ${escapeHtml(gig.date || "Date TBC")}</span>
            ${gig.time ? `<span><strong>Time:</strong> ${escapeHtml(gig.time)}</span>` : ""}
            ${gig.venue ? `<span><strong>Venue:</strong> ${escapeHtml(gig.venue)}</span>` : ""}
            ${gig.location ? `<span><strong>Location:</strong> ${escapeHtml(gig.location)}</span>` : ""}
            ${mapAddress ? `<span><strong>Map pin:</strong> <a href="${escapeHtml(getGoogleMapsUrl(mapAddress, gig.mapPlaceId))}" target="_blank" rel="noopener">${escapeHtml(mapAddress)}</a></span>` : ""}
            ${ticketLink ? `<span><strong>Link:</strong> <a href="${escapeHtml(ticketLink)}" target="_blank" rel="noopener">${escapeHtml(ticketLink)}</a></span>` : ""}
            ${gig.description ? `<span><strong>Description:</strong> ${escapeHtml(gig.description)}</span>` : ""}
            <span><strong>Status:</strong> <em class="admin-status ${status.className}">${status.label}</em></span>
          </div>
          <div class="admin-gig-actions">
            <button class="button small toggle-gig-button" type="button" data-id="${gigDoc.id}" data-public="${gig.public ? "false" : "true"}">${gig.public ? "Hide" : "Show"}</button>
            <button class="button small delete-gig-button" type="button" data-id="${gigDoc.id}">Delete</button>
          </div>
        `;

        adminGigsList.appendChild(card);
      });

      updateEventSummary(gigs);
    },
    (error) => {
      console.error(error);
      adminGigsList.innerHTML = "<p>Could not load saved gigs. Check Firebase rules.</p>";
    }
  );
}

if (adminGigsList) {
  adminGigsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const gigId = button.dataset.id;

    try {
      if (button.classList.contains("delete-gig-button")) {
        const confirmed = confirm("Delete this event?");
        if (!confirmed) return;

        await deleteDoc(doc(db, "gigs", gigId));
        return;
      }

      if (button.classList.contains("toggle-gig-button")) {
        await updateDoc(doc(db, "gigs", gigId), {
          public: button.dataset.public === "true",
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error(error);
      alert("Could not update this event.");
    }
  });
}

function updateEventSummary(gigs) {
  if (!adminEventSummary) return;

  const live = gigs.filter((gig) => gig.public && isGigVisible(gig)).length;
  const hidden = gigs.filter((gig) => !gig.public).length;
  const expired = gigs.filter((gig) => gig.public && !isGigVisible(gig)).length;

  adminEventSummary.innerHTML = `
    <span><strong>${live}</strong> live</span>
    <span><strong>${hidden}</strong> hidden</span>
    <span><strong>${expired}</strong> expired</span>
  `;
}

function getGigStatus(gig) {
  if (!gig.public) {
    return { label: "Hidden from website", className: "is-hidden" };
  }

  if (!isGigVisible(gig)) {
    return { label: "Expired", className: "is-expired" };
  }

  return { label: "Live on website", className: "is-live" };
}

function isGigVisible(gig) {
  if (!gig?.date) return false;

  const expiry = new Date(`${gig.date}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return false;

  expiry.setDate(expiry.getDate() + 1);
  return expiry >= new Date();
}

function updateMapPreview() {
  if (!gigMapPreview) return;

  const address = getMapAddress({
    venue: gigVenueInput?.value || "",
    location: gigLocationInput?.value || "",
    mapAddress: gigMapAddressInput?.value || ""
  });

  gigMapPreview.href = address ? getGoogleMapsUrl(address, gigMapPlaceIdInput?.value || "") : "https://www.google.com/maps";
  gigMapPreview.classList.toggle("is-disabled", !address);
  gigMapPreview.setAttribute("aria-disabled", String(!address));
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

function setupGoogleMapsAutocomplete() {
  const apiKey = window.ROCKSTOK_CONFIG?.GOOGLE_MAPS_BROWSER_API_KEY;

  if (!gigMapAddressInput || !apiKey) return;

  loadGoogleMapsScript(apiKey)
    .then(() => {
      if (!window.google?.maps?.places?.Autocomplete) return;

      const autocomplete = new window.google.maps.places.Autocomplete(gigMapAddressInput, {
        componentRestrictions: { country: "nz" },
        fields: ["formatted_address", "geometry", "name", "place_id"]
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        const address = place.formatted_address || place.name || gigMapAddressInput.value.trim();

        gigMapAddressInput.value = address;
        if (gigMapPlaceIdInput) gigMapPlaceIdInput.value = place.place_id || "";
        updateMapPreview();
      });
    })
    .catch((error) => {
      console.warn("Google Maps autocomplete could not load.", error);
    });
}

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (window.rockstokGoogleMapsLoading) {
    return window.rockstokGoogleMapsLoading;
  }

  window.rockstokGoogleMapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "places"
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.rockstokGoogleMapsLoading;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
