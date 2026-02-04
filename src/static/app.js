document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageBox = document.getElementById("message");

  // Map of activity name -> { participantsEl, emptyPlaceholderEl, selectOption }
  const activityUI = {};

  function showMessage(text, type = "info") {
    messageBox.className = `message ${type}`;
    messageBox.textContent = text;
    messageBox.classList.remove("hidden");
    setTimeout(() => messageBox.classList.add("hidden"), 5000);
  }

  // Create a participant list item with a delete button and attach handler
  function makeParticipantEl(activityName, email) {
    const li = document.createElement("li");
    li.className = "participant";

    const span = document.createElement("span");
    span.textContent = email;
    li.appendChild(span);

    const btn = document.createElement("button");
    btn.className = "delete-btn";
    btn.setAttribute("aria-label", `Remove ${email} from ${activityName}`);
    btn.textContent = "✖";

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await unregisterParticipant(activityName, email, li);
    });

    li.appendChild(btn);
    return li;
  }

  async function unregisterParticipant(activityName, email, liEl) {
    try {
      const encoded = encodeURIComponent(activityName);
      const res = await fetch(
        `/activities/${encoded}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        showMessage(body.message || "Participant removed", "success");

        // Refresh UI to reflect server state
        await loadActivities();
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage(err.detail || "Failed to remove participant.", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("An error occurred while removing participant.", "error");
    }
  }

  async function loadActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();

      activitiesList.innerHTML = "";
      activitySelect.innerHTML = `<option value="">-- Select an activity --</option>`;

      Object.entries(data).forEach(([name, info]) => {
        // Card
        const card = document.createElement("div");
        card.className = "activity-card";
        card.dataset.activity = name;

        const title = document.createElement("h4");
        title.textContent = name;
        card.appendChild(title);

        const desc = document.createElement("p");
        desc.textContent = info.description;
        card.appendChild(desc);

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${info.schedule}`;
        card.appendChild(schedule);

        const capacity = document.createElement("p");
        capacity.innerHTML = `<strong>Max participants:</strong> ${info.max_participants}`;
        card.appendChild(capacity);

        // Participants section
        const partWrap = document.createElement("div");
        partWrap.className = "activity-participants";

        const partHeader = document.createElement("h5");
        partHeader.textContent = `Participants (${info.participants.length})`;
        partWrap.appendChild(partHeader);

        let participantsList;
        let emptyPlaceholder = null;

        if (info.participants && info.participants.length > 0) {
          participantsList = document.createElement("ul");
          participantsList.className = "participants-list";
          info.participants.forEach((email) => {
            const li = makeParticipantEl(name, email);
            participantsList.appendChild(li);
          });
          partWrap.appendChild(participantsList);
        } else {
          emptyPlaceholder = document.createElement("p");
          emptyPlaceholder.className = "participants-empty";
          emptyPlaceholder.textContent = "No participants yet";
          partWrap.appendChild(emptyPlaceholder);
        }

        card.appendChild(partWrap);
        activitiesList.appendChild(card);

        // Populate select
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = `${name} (${info.participants.length})`;
        activitySelect.appendChild(opt);

        // Save references
        activityUI[name] = {
          participantsList,
          emptyPlaceholder,
          partHeader,
          selectOption: opt,
        };
      });
    } catch (err) {
      console.error(err);
      activitiesList.innerHTML = `<p class="error">Unable to load activities.</p>`;
    }
  }

  // Signup handler
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = activitySelect.value;

    if (!activity) {
      showMessage("Please select an activity.", "error");
      return;
    }
    if (!email) {
      showMessage("Please enter an email.", "error");
      return;
    }

    try {
      const encoded = encodeURIComponent(activity);
      const res = await fetch(`/activities/${encoded}/signup?email=${encodeURIComponent(email)}`, {
        method: "POST",
      });

      if (res.ok) {
        const body = await res.json();
        showMessage(body.message || "Signed up successfully!", "success");

        // Update UI: add participant badge and update counts
        const ui = activityUI[activity];
        if (!ui) {
          // reload if we don't have the UI reference
          await loadActivities();
        } else {
          if (!ui.participantsList) {
            // replace empty placeholder with a new list
            const ul = document.createElement("ul");
            ul.className = "participants-list";
            const li = makeParticipantEl(activity, email);
            ul.appendChild(li);
            ui.emptyPlaceholder?.remove();
            ui.partHeader.parentNode.appendChild(ul);
            ui.participantsList = ul;
            ui.emptyPlaceholder = null;
          } else {
            const li = makeParticipantEl(activity, email);
            ui.participantsList.appendChild(li);
          }
          // Update header count
          const count = ui.participantsList ? ui.participantsList.children.length : 0;
          ui.partHeader.textContent = `Participants (${count})`;

          // Update select option text
          ui.selectOption.textContent = `${activity} (${count})`;

          // Refresh to reflect authoritative server state
          await loadActivities();
        }

        // Clear email input
        document.getElementById("email").value = ""; 
      } else {
        const err = await res.json().catch(() => ({}));
        showMessage(err.detail || "Failed to sign up.", "error");
      }
    } catch (err) {
      console.error(err);
      showMessage("An error occurred while signing up.", "error");
    }
  });

  // Initial load
  loadActivities();
});
