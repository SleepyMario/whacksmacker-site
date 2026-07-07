(async function loadProgress() {
  const target = document.querySelector("#progress-list");
  if (!target) {
    return;
  }

  try {
    const response = await fetch("data/progress.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Progress data request failed: ${response.status}`);
    }
    const data = await response.json();
    const milestones = Array.isArray(data.milestones) ? data.milestones : [];
    if (milestones.length === 0) {
      target.innerHTML = "<p>No progress entries yet.</p>";
      return;
    }

    target.innerHTML = "";
    for (const milestone of milestones) {
      const entry = document.createElement("article");
      entry.className = "timeline-entry";

      const date = document.createElement("time");
      date.dateTime = String(milestone.date || "");
      date.textContent = String(milestone.date || "Undated");

      const title = document.createElement("h3");
      title.textContent = String(milestone.title || "Untitled milestone");

      const summary = document.createElement("p");
      summary.textContent = String(milestone.summary || "");

      entry.append(date, title, summary);
      target.append(entry);
    }
  } catch (error) {
    target.innerHTML = "<p>Progress data could not be loaded. The chaos escaped its JSON box.</p>";
  }
})();
