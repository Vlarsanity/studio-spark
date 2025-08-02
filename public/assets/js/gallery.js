// Fixed gallery.js to match your actual data structure and localStorage keys

class PhotoBoothGallery {
  constructor() {
    this.sessions = [];
    this.currentPhoto = null;
    this.pendingAction = null;
    this.init();
  }

  init() {
    this.loadSessions();
    this.bindEvents();
    this.showLoadingOverlay(false);
  }

  bindEvents() {
    // Clear all sessions
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.confirmClearAll();
      });
    }

    // Confirmation modal
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    if (confirmActionBtn) {
      confirmActionBtn.addEventListener('click', () => {
        this.executeConfirmedAction();
      });
    }

    // Download button in modal
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        this.downloadCurrentPhoto();
      });
    }
  }

  loadSessions() {
    try {
      // Load sessions from localStorage using the correct key from editor.js
      const storedSessions = localStorage.getItem('photoSessions');
      console.log('Raw stored sessions:', storedSessions); // Debug log
      
      if (storedSessions) {
        this.sessions = JSON.parse(storedSessions);
      } else {
        this.sessions = [];
      }

      console.log('Loaded sessions:', this.sessions); // Debug log
      
      if (this.sessions.length === 0) {
        this.showEmptyState();
      } else {
        this.displaySessions();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      this.showStatusMessage('Error loading gallery data', 'error');
      this.showEmptyState();
    }
  }

  displaySessions() {
    const container = document.getElementById('sessions-container');
    const noSessionsEl = document.getElementById('no-sessions');
    const clearAllSection = document.getElementById('clear-all-section');

    if (!container) {
      console.error('Sessions container not found');
      return;
    }

    // Hide empty state
    if (noSessionsEl) noSessionsEl.style.display = 'none';
    
    // Show clear all section
    if (clearAllSection) clearAllSection.style.display = 'block';

    // Clear existing content
    container.innerHTML = '';

    // Sort sessions by timestamp (newest first)
    const sortedSessions = [...this.sessions].sort((a, b) => 
      new Date(b.savedAt || b.timestamp || 0) - new Date(a.savedAt || a.timestamp || 0)
    );

    sortedSessions.forEach((session, index) => {
      console.log(`Creating card for session ${index}:`, session); // Debug log
      const sessionCard = this.createSessionCard(session, index);
      container.appendChild(sessionCard);
    });
  }

  createSessionCard(session, index) {
    const card = document.createElement('div');
    card.className = 'session-card';
    card.style.setProperty('--delay', `${index * 0.1}s`);

    // Get photos to display (prioritize templated versions)
    const photos = this.getPhotosToDisplay(session);
    const photoCount = photos.length;
    
    // Format date and time - use savedAt from editor or timestamp from camera
    const timestamp = session.savedAt || session.timestamp || Date.now();
    const date = new Date(timestamp).toLocaleDateString();
    const time = new Date(timestamp).toLocaleTimeString();

    // Get session name with fallback to email
    const sessionName = session.sessionName || `${session.email} - ${session.layout} shots` || `Session ${index + 1}`;
    const sessionId = session.sessionId || `session_${index}`;

    // Create metadata items with consistent structure
    const metadataItems = [
      `<div class="meta-item">
        <i class="fas fa-calendar"></i>
        <span>${date}</span>
      </div>`,
      `<div class="meta-item">
        <i class="fas fa-clock"></i>
        <span>${time}</span>
      </div>`,
      `<div class="meta-item">
        <i class="fas fa-camera"></i>
        <span>${photoCount} photos</span>
      </div>`
    ];

    // Add filter info if available (or placeholder to maintain consistent height)
    if (session.filters && session.filters !== 'none') {
      metadataItems.push(`<div class="meta-item">
        <i class="fas fa-magic"></i>
        <span>${session.filters} filter</span>
      </div>`);
    } else {
      metadataItems.push(`<div class="meta-item meta-placeholder">
        <i class="fas fa-image"></i>
        <span>No filter</span>
      </div>`);
    }

    // Add theme info if available (or placeholder to maintain consistent height)
    if (session.theme && session.theme !== 'classic') {
      metadataItems.push(`<div class="meta-item">
        <i class="fas fa-palette"></i>
        <span>${session.theme} theme</span>
      </div>`);
    } else {
      metadataItems.push(`<div class="meta-item meta-placeholder">
        <i class="fas fa-palette"></i>
        <span>Classic theme</span>
      </div>`);
    }

    card.innerHTML = `
      <div class="session-card-header">
        <h3 class="session-title">
          <i class="fas fa-images"></i>
          ${sessionName}
        </h3>
        <div class="session-meta">
          ${metadataItems.join('')}
        </div>
      </div>
      <div class="session-card-body">
        <div class="photos-grid uniform-grid">
          ${this.createPhotoThumbnails(photos, sessionId)}
        </div>
        <div class="session-actions">
          <button class="btn-action btn-view" onclick="gallery.viewSession(${index})">
            <i class="fas fa-eye"></i>
            View All
          </button>
          <button class="btn-action btn-download" onclick="gallery.downloadSession(${index})">
            <i class="fas fa-download"></i>
            Download
          </button>
          <button class="btn-action btn-delete" onclick="gallery.deleteSession(${index})" title="Delete Session">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    return card;
  }

  // Updated method to get photos matching your data structure
  getPhotosToDisplay(session) {
    console.log('Getting photos for session:', session); // Debug log
    
    let photos = [];
    
    // Priority 1: Photo strip (the final templated version from editor)
    if (session.photoStrip) {
      photos = [session.photoStrip];
      console.log('Using photoStrip (final templated version)');
    }
    // Priority 2: Individual photos array from camera
    else if (session.photos && Array.isArray(session.photos) && session.photos.length > 0) {
      photos = session.photos.map(photo => photo.dataUrl || photo);
      console.log('Using individual photos from camera:', photos.length);
    }
    // Priority 3: Check for other possible photo storage
    else {
      console.log('No photos found in session');
    }

    return photos.filter(photo => photo); // Remove any null/undefined photos
  }

  createPhotoThumbnails(photos, sessionId) {
    if (!photos || photos.length === 0) {
      return '<div class="photo-preview-empty">No photos available</div>';
    }

    return photos.slice(0, 6).map((photo, index) => {
      // Handle different photo data formats
      let photoSrc = '';
      
      if (typeof photo === 'string') {
        photoSrc = photo;
      } else if (photo && typeof photo === 'object') {
        photoSrc = photo.dataUrl || photo.src || photo.url || '';
      }

      if (!photoSrc) {
        console.warn(`No valid photo source found for photo ${index}:`, photo);
        return '';
      }
      
      return `
        <img src="${photoSrc}" 
             alt="Photo ${index + 1}" 
             class="photo-thumbnail" 
             onclick="gallery.openPhotoModal('${photoSrc}', '${sessionId}', ${index})"
             onerror="this.style.display='none'"
             loading="lazy">
      `;
    }).join('');
  }

  showEmptyState() {
    const container = document.getElementById('sessions-container');
    const noSessionsEl = document.getElementById('no-sessions');
    const clearAllSection = document.getElementById('clear-all-section');

    if (container) container.innerHTML = '';
    if (noSessionsEl) noSessionsEl.style.display = 'block';
    if (clearAllSection) clearAllSection.style.display = 'none';
  }

  openPhotoModal(photoSrc, sessionId, photoIndex) {
    const photoModal = document.getElementById('photoModal');
    if (!photoModal) return;

    const modal = new bootstrap.Modal(photoModal);
    const modalImage = document.getElementById('modalImage');
    const modalTitle = document.getElementById('photoModalLabel');

    if (modalImage) modalImage.src = photoSrc;
    if (modalTitle) {
      modalTitle.innerHTML = `
        <i class="fas fa-image"></i>
        Photo ${photoIndex + 1} - ${sessionId}
      `;
    }

    // Store current photo info for download
    this.currentPhoto = {
      src: photoSrc,
      sessionId: sessionId,
      index: photoIndex
    };

    modal.show();
  }

  downloadCurrentPhoto() {
    if (!this.currentPhoto) return;

    try {
      const link = document.createElement('a');
      link.href = this.currentPhoto.src;
      link.download = `photobooth_${this.currentPhoto.sessionId}_photo_${this.currentPhoto.index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showStatusMessage('Photo downloaded successfully!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showStatusMessage('Failed to download photo', 'error');
    }
  }

  viewSession(sessionIndex) {
    const session = this.sessions[sessionIndex];
    if (!session) {
      this.showStatusMessage('Session not found', 'error');
      return;
    }

    // Store session data for editor to load
    sessionStorage.setItem('photoboothSession', JSON.stringify({
      photos: session.photos || [],
      layout: session.layout || 4,
      email: session.email || 'gallery@user.com',
      timestamp: session.timestamp || session.savedAt,
      totalShots: session.totalShots || (session.photos ? session.photos.length : 0)
    }));

    // Redirect to editor
    window.location.href = 'editor.html';
  }

  downloadSession(sessionIndex) {
    const session = this.sessions[sessionIndex];
    if (!session) {
      this.showStatusMessage('Session not found', 'error');
      return;
    }

    this.showLoadingOverlay(true, 'Preparing download...');

    try {
      const photos = this.getPhotosToDisplay(session);
      if (photos.length === 0) {
        this.showStatusMessage('No photos to download', 'error');
        return;
      }

      const sessionName = session.email ? session.email.split('@')[0] : `Session_${sessionIndex}`;
      this.downloadMultiplePhotos(photos, sessionName);
    } catch (error) {
      console.error('Download session error:', error);
      this.showStatusMessage('Failed to download session', 'error');
    } finally {
      this.showLoadingOverlay(false);
    }
  }

  async downloadMultiplePhotos(photos, sessionName) {
    if (photos.length === 1) {
      // Single photo download (usually the final photo strip)
      const link = document.createElement('a');
      link.href = photos[0];
      link.download = `${sessionName}_photobooth_strip.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Multiple photos - download individually with delay
      photos.forEach((photo, i) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = photo;
          link.download = `${sessionName}_photo_${i + 1}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, i * 500);
      });
    }

    this.showStatusMessage(`Downloaded ${photos.length} photo(s) successfully!`, 'success');
  }

  deleteSession(sessionIndex) {
    this.pendingAction = {
      type: 'deleteSession',
      sessionIndex: sessionIndex
    };

    const session = this.sessions[sessionIndex];
    const sessionName = session ? (session.email || 'Untitled Session') : 'this session';

    this.showConfirmModal(
      `Delete Session`,
      `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`
    );
  }

  confirmClearAll() {
    this.pendingAction = {
      type: 'clearAll'
    };

    this.showConfirmModal(
      'Clear All Sessions',
      'Are you sure you want to delete ALL photo sessions? This action cannot be undone.'
    );
  }

  showConfirmModal(title, message) {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) return;

    const modal = new bootstrap.Modal(confirmModal);
    const titleEl = document.getElementById('confirmModalLabel');
    const messageEl = document.getElementById('confirmMessage');

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-exclamation-triangle text-warning"></i> ${title}`;
    if (messageEl) messageEl.textContent = message;

    modal.show();
  }

  executeConfirmedAction() {
    if (!this.pendingAction) return;

    const confirmModal = document.getElementById('confirmModal');
    const modal = bootstrap.Modal.getInstance(confirmModal);
    if (modal) modal.hide();

    switch (this.pendingAction.type) {
      case 'deleteSession':
        this.performDeleteSession(this.pendingAction.sessionIndex);
        break;
      case 'clearAll':
        this.performClearAll();
        break;
    }

    this.pendingAction = null;
  }

  performDeleteSession(sessionIndex) {
    try {
      // Remove session by index
      if (sessionIndex >= 0 && sessionIndex < this.sessions.length) {
        this.sessions.splice(sessionIndex, 1);
        
        // Update localStorage with correct key
        localStorage.setItem('photoSessions', JSON.stringify(this.sessions));
        
        this.showStatusMessage('Session deleted successfully', 'success');
        
        if (this.sessions.length === 0) {
          this.showEmptyState();
        } else {
          this.displaySessions();
        }
      } else {
        this.showStatusMessage('Session not found', 'error');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      this.showStatusMessage('Failed to delete session', 'error');
    }
  }

  performClearAll() {
    try {
      // Clear localStorage with correct key
      localStorage.removeItem('photoSessions');
      this.sessions = [];
      this.showEmptyState();
      this.showStatusMessage('All sessions cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing sessions:', error);
      this.showStatusMessage('Failed to clear sessions', 'error');
    }
  }

  showStatusMessage(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) return;

    // Map error to danger for Bootstrap classes
    const bootstrapType = type === 'error' ? 'danger' : type;
    statusEl.className = `alert alert-modern alert-${bootstrapType}-modern`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }

  showLoadingOverlay(show, message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    if (show) {
      const messageEl = overlay.querySelector('p');
      if (messageEl) messageEl.textContent = message;
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gallery = new PhotoBoothGallery();
});

// Handle browser back button
window.addEventListener('popstate', () => {
  if (window.gallery) {
    window.gallery.loadSessions();
  }
});

// Handle storage changes from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'photoSessions' && window.gallery) {
    window.gallery.loadSessions();
  }
});