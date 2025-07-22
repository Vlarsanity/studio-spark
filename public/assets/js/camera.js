document.addEventListener("DOMContentLoaded", () => {
  const templateInfo = document.getElementById("template-info");
  const countdownEl = document.getElementById("countdown");
  const photoPreview = document.getElementById("photo-preview");
  const nextBtn = document.getElementById("nextBtn");

  const selectedLayout = localStorage.getItem("selectedLayout");
  const userEmail = localStorage.getItem("userEmail");

  if (!selectedLayout || !userEmail) {
    countdownEl.textContent = "Missing session data. Please start again.";
    return;
  }

  templateInfo.textContent = `Selected Layout: ${selectedLayout} Shots`;

  let shotsToTake = parseInt(selectedLayout, 10);
  let shotsTaken = 0;
  let photos = [];

  nextBtn.disabled = true;

  // Simulate countdown and photo capture
  function startCountdown() {
    let count = 3;
    countdownEl.textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
      } else if (count === 0) {
        countdownEl.textContent = "Smile!";
      } else {
        clearInterval(interval);
        capturePhoto();
      }
    }, 1000);
  }

  function capturePhoto() {
    // Simulate photo capture by creating a placeholder image element
    const img = document.createElement("img");
    img.src = "https://via.placeholder.com/150?text=Photo+" + (shotsTaken + 1);
    img.alt = `Photo ${shotsTaken + 1}`;
    img.classList.add("img-thumbnail");
    photoPreview.appendChild(img);

    photos.push(img.src);
    shotsTaken++;

    if (shotsTaken < shotsToTake) {
      countdownEl.textContent = "Get ready for next shot";
      setTimeout(() => {
        startCountdown();
      }, 1500);
    } else {
      countdownEl.textContent = "Session complete!";
      nextBtn.disabled = false;
    }
  }

  nextBtn.addEventListener("click", () => {
    // For now, just alert the user and clear session data
    alert(`Session complete! ${shotsTaken} photos taken. Thank you, ${userEmail}.`);
    localStorage.removeItem("selectedLayout");
    localStorage.removeItem("userEmail");
    window.location.href = "index.html";
  });

  // Start the first countdown
  startCountdown();
});
