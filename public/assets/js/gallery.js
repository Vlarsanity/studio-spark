document.addEventListener("DOMContentLoaded", () => {
  const sessionsContainer = document.getElementById("sessions-container");
  const noSessionsDiv = document.getElementById("no-sessions");
  const clearAllBtn = document.getElementById("clearAllBtn");
  const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.getElementById("photoModalTitle");
  const downloadBtn = document.getElementById("downloadBtn");

  let currentPhotoData = null;

  function loadSessions() {
    const sessions = JSON.parse(localStorage.getItem('photoSessions') || '[]');
    
    if (sessions.length === 0) {
      noSessionsDiv.style.display = 'block';
      sessionsContainer.style.display = 'none';
      clearAllBtn.style.display = 'none';
      return;
    }

    noSessionsDiv.style.display = 'none';
    sessionsContainer.style.display = 'block';
    clearAllBtn.style.display = 'block';

    // Sort sessions by date (newest first)
    sessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));

    sessionsContainer.innerHTML = '';

    sessions.forEach((session, sessionIndex) => {
      const sessionCard = createSessionCard(session, sessionIndex);
      sessionsContainer.appendChild(sessionCard);
    });
  }

  function createSessionCard(session, sessionIndex) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 mb-4';

    const sessionDate = new Date(session.sessionDate);
    const formattedDate = sessionDate.toLocaleDateString();
    const formattedTime = sessionDate.toLocaleTimeString();

    col.innerHTML = `
      <div class="card session-card h-100">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">📧 ${session.email}</h6>
          <small>${formattedDate} at ${formattedTime}</small>
        </div>
        <div class="card-body">
          <div class="row align-items-center mb-3">
            <div class="col">
              <span class="badge bg-secondary">${session.layout} Shots Template</span>
            </div>
            <div class="col-auto">
              <small class="text-muted">${session.totalShots} photos</small>
            </div>
          </div>
          
          <div class="photo-thumbnails row g-2" id="thumbnails-${sessionIndex}">
            <!-- Thumbnails will be added here -->
          </div>
          
          <div class="mt-3">
            <button class="btn btn-outline-primary btn-sm me-2" onclick="downloadAllPhotos(${sessionIndex})">
              📥 Download All
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="deleteSession(${sessionIndex})">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
    `;

    // Add thumbnails
    const thumbnailsContainer = col.querySelector(`#thumbnails-${sessionIndex}`);
    session.photos.forEach((photo, photoIndex) => {
      const thumbnailCol = document.createElement('div');
      thumbnailCol.className = 'col-4';
      
      const img = document.createElement('img');
      img.src = photo.dataUrl;
      img.alt = `Photo ${photo.shotNumber}`;
      img.className = 'photo-thumbnail img-fluid';
      img.onclick = () => openPhotoModal(photo, `${session.email} - Photo ${photo.shotNumber}`);
      
      thumbnailCol.appendChild(img);
      thumbnailsContainer.appendChild(thumbnailCol);
    });

    return col;
  }

  function openPhotoModal(photo, title) {
    modalImage.src = photo.dataUrl;
    modalTitle.textContent = title;
    currentPhotoData = photo.dataUrl;
    photoModal.show();
  }

  function downloadPhoto(dataUrl, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Global functions for button clicks
  window.downloadAllPhotos = function(sessionIndex) {
    const sessions = JSON.parse(localStorage.getItem('photoSessions') || '[]');
    const session = sessions[sessionIndex];
    
    if (!session) return;

    session.photos.forEach((photo, index) => {
      const filename = `photobooth_${session.email.replace('@', '_')}_${session.sessionDate.split('T')[0]}_photo_${index + 1}.jpg`;
      setTimeout(() => {
        downloadPhoto(photo.dataUrl, filename);
      }, index * 500); // Delay downloads to avoid browser blocking
    });
  };

  window.deleteSession = function(sessionIndex) {
    if (confirm('Are you sure you want to delete this photo session?')) {
      const sessions = JSON.parse(localStorage.getItem('photoSessions') || '[]');
      sessions.splice(sessionIndex, 1);
      localStorage.setItem('photoSessions', JSON.stringify(sessions));
      loadSessions();
    }
  };

  // Download current modal photo
  downloadBtn.addEventListener('click', () => {
    if (currentPhotoData) {
      const filename = `photobooth_photo_${new Date().getTime()}.jpg`;
      downloadPhoto(currentPhotoData, filename);
    }
  });

  // Clear all sessions
  clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete ALL photo sessions? This cannot be undone!')) {
      localStorage.removeItem('photoSessions');
      loadSessions();
    }
  });

  // Load sessions on page load
  loadSessions();
});