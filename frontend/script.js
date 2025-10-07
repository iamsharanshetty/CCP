// Toggle dark mode
const darkToggle = document.getElementById("darkToggle");
const viewLeaderboardBtn = document.getElementById("viewLeaderboard");
const leaderboardSection = document.getElementById("leaderboardSection");

if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    localStorage.setItem("darkMode", isDark);
    darkToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Toggle Dark Mode";
  });
}

// Load theme preference
function loadTheme() {
  const isDark = localStorage.getItem("darkMode") === "true";
  if (isDark && darkToggle) {
    document.body.classList.add("dark");
    darkToggle.textContent = "☀️ Light Mode";
  }
}

// View leaderboard functionality
if (viewLeaderboardBtn) {
  viewLeaderboardBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    await loadLeaderboard();
    leaderboardSection.classList.remove("hidden");
    leaderboardSection.scrollIntoView({ behavior: "smooth" });
  });
}

// Fetch leaderboard and inject into table
async function loadLeaderboard() {
  try {
    const apiBase =
      window.location.hostname === "localhost"
        ? "http://127.0.0.1:8000"
        : window.location.origin + "/api";
    const res = await fetch(`${apiBase}/leaderboard`);
    const data = await res.json();
    const tbody = document.querySelector("#leaderboard tbody");

    if (!tbody) return;

    tbody.innerHTML = ""; // Clear existing content

    if (!data.leaderboard || data.leaderboard.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No submissions yet</td></tr>';
      return;
    }

    data.leaderboard.forEach((entry, index) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.user_id}</td>
        <td>${entry.score}</td>
        <td>${entry.replay_result}</td>
        <td>${new Date(entry.timestamp).toLocaleString()}</td>
      `;

      tbody.appendChild(row);
    });

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    alert("Could not fetch leaderboard. Is the backend running?");
  }
}

// Initialize on page load
window.onload = async () => {
  loadTheme();
  // Only auto-load leaderboard if we're on the leaderboard-only view
  if (
    document.querySelector("#leaderboard") &&
    !document.querySelector(".challenge-btn")
  ) {
    await loadLeaderboard();
  }
};
