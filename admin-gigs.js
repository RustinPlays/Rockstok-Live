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

import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

// Firebase services are shared by every admin action on this page.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Keep the allow-list client-side for UI gating; Firestore/Auth rules should still enforce real access.
const allowedEmails = [
  "justin.oshea135@gmail.com",
  "rockstokcovers@gmail.com"
].map((email) => email.toLowerCase());

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");

// Login and session controls.
const loginForm = document.getElementById("admin-login-form");
const emailInput = document.getElementById("admin-email");
const passwordInput = document.getElementById("admin-password");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const loginStatus = document.getElementById("login-status");
const sessionLinks = document.querySelectorAll(".admin-session-link");

// Event form controls. The same form creates new gigs and edits existing gigs.
const gigForm = document.getElementById("gig-form");
const gigFormEyebrow = document.getElementById("gig-form-eyebrow");
const gigFormTitle = document.getElementById("gig-form-title");
const gigFormDescription = document.getElementById("gig-form-description");
const gigTitleInput = document.getElementById("gig-title");
const gigDateInput = document.getElementById("gig-date");
const gigTimeInput = document.getElementById("gig-time");
const gigVenueInput = document.getElementById("gig-venue");
const gigLocationInput = document.getElementById("gig-location");
const gigMapAddressInput = document.getElementById("gig-map-address");
const gigMapPlaceIdInput = document.getElementById("gig-map-place-id");
const gigMapPreview = document.getElementById("gig-map-preview");
const gigTicketLinkInput = document.getElementById("gig-ticket-link");
const gigDescriptionInput = document.getElementById("gig-description");
const gigPublicInput = document.getElementById("gig-public");
const gigSubmitButton = document.getElementById("gig-submit-button");
const gigCancelEditButton = document.getElementById("gig-cancel-edit-button");
const gigFormStatus = document.getElementById("gig-form-status");
const adminGigsList = document.getElementById("admin-gigs-list");
const adminEventSummary = document.getElementById("admin-event-summary");

// Gallery media controls. Files are stored in Firebase Storage and metadata lives in Firestore.
const mediaForm = document.getElementById("media-form");
const mediaFormTitle = document.getElementById("media-form-title");
const mediaGalleryInput = document.getElementById("media-gallery");
const mediaFileInput = document.getElementById("media-file");
const mediaTitleInput = document.getElementById("media-title");
const mediaCaptionInput = document.getElementById("media-caption");
const mediaPublicInput = document.getElementById("media-public");
const mediaSubmitButton = document.getElementById("media-submit-button");
const mediaCancelEditButton = document.getElementById("media-cancel-edit-button");
const mediaFormStatus = document.getElementById("media-form-status");
const mediaUploadProgressBar = document.getElementById("media-upload-progress-bar");
const adminMediaSummary = document.getElementById("admin-media-summary");
const adminMediaList = document.getElementById("admin-media-list");

let unsubscribeGigs = null;
let unsubscribeMedia = null;
let editingGigId = null;
let savedGigsById = new Map();
let savedGigItems = [];
let activeGigFilter = "live";
let savedMediaItems = [];
let editingMediaId = null;
const expiredAutoDeleteDays = 30;

// Start locked down until Firebase auth confirms an allowed admin account.
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

// Show the admin interface only for signed-in users on the allow-list.
onAuthStateChanged(auth, async (user) => {
  const userEmail = user?.email?.toLowerCase() || "";

  if (user && allowedEmails.includes(userEmail)) {
    showAdminPanel();
    loadSavedGigs();
    loadSavedMedia();
    return;
  }

  hideAdminPanel();

  if (unsubscribeGigs) {
    unsubscribeGigs();
    unsubscribeGigs = null;
  }

  if (unsubscribeMedia) {
    unsubscribeMedia();
    unsubscribeMedia = null;
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

    // Keep the Firestore document shape the same for create and update.
    const gig = {
      title: gigTitleInput.value.trim(),
      date: gigDateInput.value,
      time: gigTimeInput.value.trim(),
      venue: gigVenueInput.value.trim(),
      location: gigLocationInput.value.trim(),
      mapAddress: gigMapAddressInput.value.trim(),
      mapPlaceId: gigMapPlaceIdInput.value.trim(),
      ticketLink: gigTicketLinkInput.value.trim(),
      ticketUrl: gigTicketLinkInput.value.trim(),
      description: gigDescriptionInput.value.trim(),
      public: gigPublicInput.value === "true",
      updatedAt: serverTimestamp()
    };

    try {
      if (gigSubmitButton) gigSubmitButton.disabled = true;

      if (editingGigId) {
        await updateDoc(doc(db, "gigs", editingGigId), gig);
      } else {
        // createdAt is only set on new events so edits do not rewrite the original creation time.
        await addDoc(collection(db, "gigs"), {
          ...gig,
          createdAt: serverTimestamp()
        });
      }

      const wasEditing = Boolean(editingGigId);
      resetGigForm();
      gigFormStatus.textContent = wasEditing
        ? "Event updated. Any public changes now appear on the home page and gigs page."
        : "Event saved. If public, it now appears on the home page and gigs page.";
    } catch (error) {
      console.error(error);
      gigFormStatus.textContent = "Could not save gig. Check Firebase Authentication, Firestore, and rules.";
    } finally {
      if (gigSubmitButton) gigSubmitButton.disabled = false;
    }
  });
}

gigCancelEditButton?.addEventListener("click", () => {
  resetGigForm();
  gigFormStatus.textContent = "Edit cancelled.";
});

mediaForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentEmail = auth.currentUser?.email?.toLowerCase() || "";
  const file = mediaFileInput.files?.[0];

  if (!auth.currentUser || !allowedEmails.includes(currentEmail)) {
    mediaFormStatus.textContent = "Please log in before uploading media.";
    hideAdminPanel();
    return;
  }

  if (editingMediaId) {
    mediaSubmitButton.disabled = true;
    mediaFormStatus.textContent = "Updating gallery item...";

    try {
      await updateDoc(doc(db, "galleryMedia", editingMediaId), {
        gallery: mediaGalleryInput.value,
        title: mediaTitleInput.value.trim(),
        caption: mediaCaptionInput.value.trim(),
        public: mediaPublicInput.value === "true",
        updatedAt: serverTimestamp()
      });
      resetMediaForm();
      mediaFormStatus.textContent = "Gallery item updated.";
    } catch (error) {
      console.error(error);
      mediaFormStatus.textContent = "Could not update this gallery item.";
    } finally {
      mediaSubmitButton.disabled = false;
    }
    return;
  }

  if (!file) {
    mediaFormStatus.textContent = "Choose a photo or video to upload.";
    return;
  }

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    mediaFormStatus.textContent = "Please choose an image or video file.";
    return;
  }

  const maxFileSize = file.type.startsWith("video/") ? 150 * 1024 * 1024 : 20 * 1024 * 1024;
  if (file.size > maxFileSize) {
    mediaFormStatus.textContent = file.type.startsWith("video/")
      ? "Videos must be 150 MB or smaller."
      : "Images must be 20 MB or smaller.";
    return;
  }

  mediaSubmitButton.disabled = true;
  mediaUploadProgressBar.style.width = "0%";
  mediaFormStatus.textContent = "Starting upload...";

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storagePath = `gallery/${mediaGalleryInput.value}/${Date.now()}-${safeName}`;
  const fileRef = storageRef(storage, storagePath);
  const uploadTask = uploadBytesResumable(fileRef, file, { contentType: file.type });

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      mediaUploadProgressBar.style.width = `${progress}%`;
      mediaFormStatus.textContent = `Uploading ${progress}%...`;
    },
    (error) => {
      console.error(error);
      mediaSubmitButton.disabled = false;
      mediaFormStatus.textContent = "Upload failed. Check Firebase Storage rules and try again.";
    },
    async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "galleryMedia"), {
          gallery: mediaGalleryInput.value,
          title: mediaTitleInput.value.trim(),
          caption: mediaCaptionInput.value.trim(),
          type: file.type.startsWith("video/") ? "video" : "image",
          contentType: file.type,
          url,
          storagePath,
          public: mediaPublicInput.value === "true",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        resetMediaForm();
        mediaFormStatus.textContent = "Media uploaded and added to the selected gallery.";
      } catch (error) {
        console.error(error);
        try {
          await deleteObject(uploadTask.snapshot.ref);
        } catch (cleanupError) {
          console.warn("Could not remove the upload after its gallery entry failed.", cleanupError);
        }
        mediaFormStatus.textContent = "The file uploaded, but its gallery entry could not be saved. Check Firestore rules.";
      } finally {
        mediaSubmitButton.disabled = false;
      }
    }
  );
});

adminMediaList?.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-media-id]");
  if (!button) return;

  const item = savedMediaItems.find((mediaItem) => mediaItem.id === button.dataset.mediaId);
  if (!item) return;

  try {
    if (button.classList.contains("edit-media-button")) {
      startEditingMedia(item);
      return;
    }

    if (button.classList.contains("toggle-media-button")) {
      await updateDoc(doc(db, "galleryMedia", item.id), {
        public: !item.public,
        updatedAt: serverTimestamp()
      });
      return;
    }

    if (button.classList.contains("delete-media-button")) {
      const confirmed = confirm(`Permanently delete “${item.title || "this media item"}”?`);
      if (!confirmed) return;

      button.disabled = true;
      if (item.storagePath) {
        try {
          await deleteObject(storageRef(storage, item.storagePath));
        } catch (error) {
          if (error?.code !== "storage/object-not-found") throw error;
        }
      }
      await deleteDoc(doc(db, "galleryMedia", item.id));
    }
  } catch (error) {
    console.error(error);
    button.disabled = false;
    alert("Could not update this gallery item. Check Firebase rules.");
  }
});

mediaCancelEditButton?.addEventListener("click", () => {
  resetMediaForm();
  mediaFormStatus.textContent = "Media edit cancelled.";
});

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
  resetGigForm();
  resetMediaForm();
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

function loadSavedMedia() {
  if (unsubscribeMedia || !adminMediaList) return;

  unsubscribeMedia = onSnapshot(
    collection(db, "galleryMedia"),
    (snapshot) => {
      savedMediaItems = snapshot.docs
        .map((mediaDoc) => ({ id: mediaDoc.id, ...mediaDoc.data() }))
        .sort((a, b) => getMediaTimestamp(b) - getMediaTimestamp(a));

      renderAdminMedia();
    },
    (error) => {
      console.error(error);
      adminMediaList.innerHTML = "<p>Could not load gallery media. Check Firestore rules.</p>";
    }
  );
}

function renderAdminMedia() {
  if (!adminMediaList || !adminMediaSummary) return;

  const showCount = savedMediaItems.filter((item) => item.gallery === "shows").length;
  const lightingCount = savedMediaItems.filter((item) => item.gallery === "lighting").length;
  const publicCount = savedMediaItems.filter((item) => item.public !== false).length;

  adminMediaSummary.innerHTML = `
    <span><strong>${showCount}</strong> show gallery</span>
    <span><strong>${lightingCount}</strong> lighting gallery</span>
    <span><strong>${publicCount}</strong> public</span>
  `;

  if (!savedMediaItems.length) {
    adminMediaList.innerHTML = "<p>No gallery media uploaded yet.</p>";
    return;
  }

  adminMediaList.innerHTML = savedMediaItems.map((item) => {
    const title = escapeHtml(item.title || "Untitled media");
    const galleryLabel = item.gallery === "lighting" ? "Lighting Event Gallery" : "Rockstok Show Gallery";
    const preview = item.type === "video"
      ? `<video src="${escapeHtml(item.url || "")}" muted preload="metadata" playsinline></video>`
      : `<img src="${escapeHtml(item.url || "")}" alt="" loading="lazy" />`;

    return `
      <article class="admin-media-card">
        <div class="admin-media-preview">${preview}</div>
        <div class="admin-media-copy">
          <strong>${title}</strong>
          <span>${galleryLabel}</span>
          <span>${item.type === "video" ? "Video" : "Photo"} · ${item.public === false ? "Hidden" : "Public"}</span>
          ${item.caption ? `<p>${escapeHtml(item.caption)}</p>` : ""}
        </div>
        <div class="admin-gig-actions">
          <button class="button small edit-media-button" type="button" data-media-id="${item.id}">Edit</button>
          <button class="button small toggle-media-button" type="button" data-media-id="${item.id}">${item.public === false ? "Show" : "Hide"}</button>
          <button class="button small delete-media-button" type="button" data-media-id="${item.id}">Delete</button>
        </div>
      </article>
    `;
  }).join("");
}

function startEditingMedia(item) {
  editingMediaId = item.id;
  mediaGalleryInput.value = item.gallery === "lighting" ? "lighting" : "shows";
  mediaTitleInput.value = item.title || "";
  mediaCaptionInput.value = item.caption || "";
  mediaPublicInput.value = item.public === false ? "false" : "true";
  mediaFileInput.disabled = true;
  mediaFormTitle.textContent = "Edit gallery item";
  mediaSubmitButton.textContent = "Update Media";
  mediaCancelEditButton.hidden = false;
  mediaFormStatus.textContent = "Update the title, caption, destination or visibility.";
  document.getElementById("media-manager")?.scrollIntoView({ behavior: "smooth", block: "start" });
  mediaTitleInput.focus({ preventScroll: true });
}

function resetMediaForm() {
  editingMediaId = null;
  mediaForm?.reset();
  mediaGalleryInput.value = "shows";
  mediaPublicInput.value = "true";
  mediaFileInput.disabled = false;
  mediaFormTitle.textContent = "Upload a photo or video";
  mediaSubmitButton.textContent = "Upload Media";
  mediaCancelEditButton.hidden = true;
  mediaUploadProgressBar.style.width = "0%";
}

function getMediaTimestamp(item) {
  return item.createdAt?.toMillis?.() || item.updatedAt?.toMillis?.() || 0;
}

// Live admin list: Firestore pushes every change, then the current filter re-renders the visible cards.
function loadSavedGigs() {
  if (unsubscribeGigs) return;

  const gigsQuery = query(
    collection(db, "gigs"),
    orderBy("date", "asc")
  );

  unsubscribeGigs = onSnapshot(
    gigsQuery,
    (snapshot) => {
      savedGigsById = new Map();
      savedGigItems = [];

      if (snapshot.empty) {
        updateEventSummary([]);
        adminGigsList.innerHTML = "<p>No saved events yet.</p>";
        if (editingGigId) {
          resetGigForm();
          gigFormStatus.textContent = "That event is no longer saved.";
        }
        return;
      }

      const gigs = [];

      snapshot.forEach((gigDoc) => {
        const gig = gigDoc.data();
        savedGigsById.set(gigDoc.id, gig);
        gigs.push(gig);
        savedGigItems.push({ id: gigDoc.id, gig });
      });

      if (editingGigId && !savedGigsById.has(editingGigId)) {
        resetGigForm();
        gigFormStatus.textContent = "That event is no longer saved.";
      }

      updateEventSummary(gigs);
      renderAdminGigs();
      // Static sites cannot schedule backend jobs; cleanup runs whenever admin loads the latest snapshot.
      removeOldExpiredGigs(savedGigItems);
    },
    (error) => {
      console.error(error);
      adminGigsList.innerHTML = "<p>Could not load saved gigs. Check Firebase rules.</p>";
    }
  );
}

if (adminEventSummary) {
  adminEventSummary.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;

    activeGigFilter = button.dataset.filter;
    updateEventSummary(savedGigItems.map((item) => item.gig));
    renderAdminGigs();
  });
}

if (adminGigsList) {
  adminGigsList.addEventListener("click", async (event) => {
    const removeExpiredButton = event.target.closest("#remove-expired-gigs-button");
    if (removeExpiredButton) {
      await removeExpiredGigs(removeExpiredButton);
      return;
    }

    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const gigId = button.dataset.id;

    try {
      if (button.classList.contains("edit-gig-button")) {
        startEditingGig(gigId);
        return;
      }

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

function renderAdminGigs() {
  if (!adminGigsList) return;

  const selectedItems = activeGigFilter === "all"
    ? savedGigItems
    : savedGigItems.filter(({ gig }) => getGigStatus(gig).key === activeGigFilter);
  const section = getGigSection(activeGigFilter);

  if (!selectedItems.length) {
    adminGigsList.innerHTML = `<p>${section.emptyText}</p>`;
    return;
  }

  adminGigsList.innerHTML = activeGigFilter === "expired"
    ? `<div class="admin-list-toolbar"><button id="remove-expired-gigs-button" class="button small" type="button">Remove All</button></div>`
    : "";

  selectedItems.forEach(({ id, gig }) => {
    adminGigsList.appendChild(createGigCard(id, gig));
  });
}

// Builds one admin card. Text is escaped because event details are admin-entered content.
function createGigCard(gigId, gig) {
  const card = document.createElement("article");
  card.className = "contact-card glass-panel admin-gig-card";
  const status = getGigStatus(gig);
  const ticketLink = gig.ticketLink || gig.ticketUrl || "";
  const mapAddress = getMapAddress(gig);
  const ticketLinkText = truncateText(ticketLink, 72);

  card.innerHTML = `
    <div class="admin-gig-card-main">
      <strong>${escapeHtml(gig.title || "Untitled event")}</strong>
      <span><strong>Date:</strong> ${escapeHtml(gig.date || "Date TBC")}</span>
      ${gig.time ? `<span><strong>Time:</strong> ${escapeHtml(gig.time)}</span>` : ""}
      ${gig.venue ? `<span><strong>Venue:</strong> ${escapeHtml(gig.venue)}</span>` : ""}
      ${gig.location ? `<span><strong>Location:</strong> ${escapeHtml(gig.location)}</span>` : ""}
      ${mapAddress ? `<span><strong>Map pin:</strong> <a href="${escapeHtml(getGoogleMapsUrl(mapAddress, gig.mapPlaceId))}" target="_blank" rel="noopener">${escapeHtml(mapAddress)}</a></span>` : ""}
      ${ticketLink ? `<span><strong>Link:</strong> <a class="admin-truncated-link" href="${escapeHtml(ticketLink)}" title="${escapeHtml(ticketLink)}" target="_blank" rel="noopener">${escapeHtml(ticketLinkText)}</a></span>` : ""}
      ${gig.description ? `<span><strong>Description:</strong> ${escapeHtml(gig.description)}</span>` : ""}
      <span><strong>Status:</strong> <em class="admin-status ${status.className}">${status.label}</em></span>
    </div>
    <div class="admin-gig-actions">
      <button class="button small edit-gig-button" type="button" data-id="${gigId}">Edit</button>
      <button class="button small toggle-gig-button" type="button" data-id="${gigId}" data-public="${gig.public ? "false" : "true"}">${gig.public ? "Hide" : "Show"}</button>
      <button class="button small delete-gig-button" type="button" data-id="${gigId}">Delete</button>
    </div>
  `;

  return card;
}

async function removeExpiredGigs(button) {
  const expiredItems = savedGigItems.filter(({ gig }) => getGigStatus(gig).key === "expired");

  if (!expiredItems.length) return;

  const confirmed = confirm(`Delete all ${expiredItems.length} expired event${expiredItems.length === 1 ? "" : "s"}?`);
  if (!confirmed) return;

  button.disabled = true;

  try {
    await Promise.all(expiredItems.map(({ id }) => deleteDoc(doc(db, "gigs", id))));
  } catch (error) {
    console.error(error);
    button.disabled = false;
    alert("Could not remove expired events.");
  }
}

// Auto-delete only public gigs that have already been in the expired bucket for 30 days.
async function removeOldExpiredGigs(gigItems) {
  const oldExpiredItems = gigItems.filter(({ gig }) => shouldAutoDeleteExpiredGig(gig));

  if (!oldExpiredItems.length) return;

  try {
    await Promise.all(oldExpiredItems.map(({ id }) => deleteDoc(doc(db, "gigs", id))));
    console.info(`Removed ${oldExpiredItems.length} expired gig${oldExpiredItems.length === 1 ? "" : "s"} older than ${expiredAutoDeleteDays} days.`);
  } catch (error) {
    console.warn("Could not automatically remove old expired gigs.", error);
  }
}

function startEditingGig(gigId) {
  const gig = savedGigsById.get(gigId);
  if (!gig) {
    alert("Could not find this event. Try refreshing the page.");
    return;
  }

  editingGigId = gigId;

  gigTitleInput.value = gig.title || "";
  gigDateInput.value = gig.date || "";
  gigTimeInput.value = gig.time || "";
  gigVenueInput.value = gig.venue || "";
  gigLocationInput.value = gig.location || "";
  gigMapAddressInput.value = gig.mapAddress || "";
  gigMapPlaceIdInput.value = gig.mapPlaceId || "";
  gigTicketLinkInput.value = gig.ticketLink || gig.ticketUrl || "";
  gigDescriptionInput.value = gig.description || "";
  gigPublicInput.value = gig.public ? "true" : "false";

  setGigFormMode("edit");
  updateMapPreview();
  gigFormStatus.textContent = "Editing saved event. Save to update this gig.";
  document.getElementById("make-event")?.scrollIntoView({ behavior: "smooth", block: "start" });
  gigTitleInput.focus({ preventScroll: true });
}

function resetGigForm() {
  if (!gigForm) return;

  editingGigId = null;
  gigForm.reset();
  gigPublicInput.value = "true";
  gigMapPlaceIdInput.value = "";
  setGigFormMode("create");
  updateMapPreview();
}

// Keep the form copy/button states obvious when switching between create and edit.
function setGigFormMode(mode) {
  const isEditing = mode === "edit";

  if (gigFormEyebrow) gigFormEyebrow.textContent = isEditing ? "Edit event" : "Make event";
  if (gigFormTitle) gigFormTitle.textContent = isEditing ? "Edit saved gig" : "Create a new public gig";
  if (gigFormDescription) {
    gigFormDescription.textContent = isEditing
      ? "Update this gig once here. Public changes show on the live website."
      : "Add the details once here. Public events show on the live website.";
  }
  if (gigSubmitButton) gigSubmitButton.textContent = isEditing ? "Update Event" : "Save Event";
  if (gigCancelEditButton) gigCancelEditButton.hidden = !isEditing;
}

// The summary is both a count display and the tab control for all/live/hidden/expired lists.
function updateEventSummary(gigs) {
  if (!adminEventSummary) return;

  const live = gigs.filter((gig) => gig.public && isGigVisible(gig)).length;
  const hidden = gigs.filter((gig) => !gig.public).length;
  const expired = gigs.filter((gig) => gig.public && !isGigVisible(gig)).length;
  const filters = [
    { key: "all", label: "all", count: gigs.length },
    { key: "live", label: "live", count: live },
    { key: "hidden", label: "hidden", count: hidden },
    { key: "expired", label: "expired", count: expired }
  ];

  adminEventSummary.innerHTML = filters.map((filter) => `
    <button class="admin-summary-button ${activeGigFilter === filter.key ? "is-active" : ""}" type="button" data-filter="${filter.key}">
      <strong>${filter.count}</strong>
      <span>${filter.label}</span>
    </button>
  `).join("");
}

function getGigStatus(gig) {
  if (!gig.public) {
    return { key: "hidden", label: "Hidden from website", className: "is-hidden" };
  }

  if (!isGigVisible(gig)) {
    return { key: "expired", label: "Expired", className: "is-expired" };
  }

  return { key: "live", label: "Live on website", className: "is-live" };
}

function getGigSection(filter) {
  if (filter === "all") {
    return {
      emptyText: "No saved events yet."
    };
  }

  if (filter === "hidden") {
    return {
      emptyText: "No hidden events saved."
    };
  }

  if (filter === "expired") {
    return {
      emptyText: "No expired events to remove."
    };
  }

  return {
    emptyText: "No live events right now."
  };
}

function isGigVisible(gig) {
  const expiry = getGigExpiryDate(gig);
  if (!expiry) return false;

  return expiry >= new Date();
}

function shouldAutoDeleteExpiredGig(gig) {
  if (!gig?.public) return false;

  const expiry = getGigExpiryDate(gig);
  if (!expiry) return false;

  const deleteAfter = new Date(expiry);
  deleteAfter.setDate(deleteAfter.getDate() + expiredAutoDeleteDays);

  return deleteAfter < new Date();
}

// A gig expires at the end of the day after its scheduled date.
function getGigExpiryDate(gig) {
  if (!gig?.date) return null;

  const expiry = new Date(`${gig.date}T23:59:59`);
  if (Number.isNaN(expiry.getTime())) return null;

  expiry.setDate(expiry.getDate() + 1);
  return expiry;
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

// Google Places autocomplete is optional; the form still works as a plain address field without a key.
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

function truncateText(value, maxLength) {
  const text = String(value);

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength - 3)}...`;
}
