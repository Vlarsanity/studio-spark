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
  let stream = null;
  let video = null;
  let canvas = null;

  nextBtn.disabled = true;

  // Initialize camera
  async function initCamera() {
    try {
      // Create video element for camera feed
      video = document.createElement('video');
      video.style.width = '100%';
      video.style.maxWidth = '400px';
      video.style.height = 'auto';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      // Create canvas for capturing photos
      canvas = document.createElement('canvas');
      canvas.style.display = 'none';

      // Add video to the page
      const videoContainer = document.createElement('div');
      videoContainer.classList.add('mb-4');
      videoContainer.appendChild(video);
      countdownEl.parentNode.insertBefore(videoContainer, countdownEl);

      // Get camera stream
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user' // Front camera for selfies
        },
        audio: false
      });

      video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          resolve();
        };
      });

      countdownEl.textContent = "Camera ready! Starting in 3 seconds...";
      setTimeout(() => {
        startCountdown();
      }, 3000);

    } catch (error) {
      console.error('Camera access error:', error);
      handleCameraError(error);
    }
  }

  function handleCameraError(error) {
    let errorMessage = "Camera access failed. ";
    
    if (error.name === 'NotAllowedError') {
      errorMessage += "Please allow camera access and refresh the page.";
    } else if (error.name === 'NotFoundError') {
      errorMessage += "No camera found on this device.";
    } else if (error.name === 'NotSupportedError') {
      errorMessage += "Camera not supported in this browser.";
    } else {
      errorMessage += "Please check your camera and try again.";
    }
    
    countdownEl.textContent = errorMessage;
    countdownEl.style.fontSize = '1.5rem';
    countdownEl.classList.add('text-danger');
  }

  function startCountdown() {
    let count = 3;
    countdownEl.textContent = count;
    countdownEl.style.fontSize = '4rem';
    countdownEl.classList.remove('text-danger');
    
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        countdownEl.textContent = count;
      } else if (count === 0) {
        countdownEl.textContent = "Smile! 📸";
      } else {
        clearInterval(interval);
        capturePhoto();
      }
    }, 1000);
  }

  function capturePhoto() {
    if (!video || !canvas) {
      console.error('Video or canvas not available');
      return;
    }

    // Draw current video frame to canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to image data URL
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    
    // Create image element for preview
    const img = document.createElement("img");
    img.src = photoDataUrl;
    img.alt = `Photo ${shotsTaken + 1}`;
    img.classList.add("img-thumbnail");
    img.style.maxWidth = '150px';
    img.style.height = 'auto';
    img.style.margin = '5px';
    
    photoPreview.appendChild(img);

    // Store photo data
    photos.push({
      dataUrl: photoDataUrl,
      timestamp: new Date().toISOString(),
      shotNumber: shotsTaken + 1
    });

    shotsTaken++;

    if (shotsTaken < shotsToTake) {
      countdownEl.textContent = `Photo ${shotsTaken}/${shotsToTake} captured! Get ready for next shot...`;
      setTimeout(() => {
        startCountdown();
      }, 2000);
    } else {
      countdownEl.textContent = `All ${shotsTaken} photos captured! 🎉`;
      nextBtn.disabled = false;
      
      // Stop camera stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      // Hide video element
      if (video) {
        video.style.display = 'none';
      }
    }
  }

  nextBtn.addEventListener("click", () => {
    // Save photos to localStorage for now
    const sessionData = {
      email: userEmail,
      layout: selectedLayout,
      photos: photos,
      sessionDate: new Date().toISOString(),
      totalShots: shotsTaken
    };

    // Store in localStorage (you can replace this with Supabase later)
    const existingSessions = JSON.parse(localStorage.getItem('photoSessions') || '[]');
    existingSessions.push(sessionData);
    localStorage.setItem('photoSessions', JSON.stringify(existingSessions));

    alert(`Session complete! ${shotsTaken} photos saved locally. Thank you, ${userEmail}!`);
    
    // Clean up session data
    localStorage.removeItem("selectedLayout");
    localStorage.removeItem("userEmail");
    
    window.location.href = "index.html";
  });

  // Initialize camera when page loads
  initCamera();
});