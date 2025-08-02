// Enhanced gallery.js with improved error handling and features

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
    this.bindKeyboardEvents();
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

    // Refresh button (if you want to add one)
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshGallery();
      });
    }
  }

  bindKeyboardEvents() {
    document.addEventListener('keydown', (e) => {
      // Escape key to close modals
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal.show');
        openModals.forEach(modal => {
          const bsModal = bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        });
      }
      
      // Ctrl/Cmd + R to refresh gallery
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        this.refreshGallery();
      }
    });
  }

  loadSessions() {
    try {
      // Load sessions from localStorage using the correct key from editor.js
      const storedSessions = localStorage.getItem('photoSessions');
      console.log('Raw stored sessions:', storedSessions); // Debug log
      
      if (storedSessions) {
        const parsed = JSON.parse(storedSessions);
        
        // Validate session structure and filter out corrupt data
        this.sessions = parsed.filter(session => {
          if (!session) return false;
          
          // Session must have either photos array or photoStrip
          const hasPhotos = (session.photos && Array.isArray(session.photos) && session.photos.length > 0);
          const hasPhotoStrip = session.photoStrip;
          
          return hasPhotos || hasPhotoStrip;
        });
        
        // If we filtered out corrupt sessions, update localStorage
        if (this.sessions.length !== parsed.length) {
          localStorage.setItem('photoSessions', JSON.stringify(this.sessions));
          this.showStatusMessage('Some corrupted session data was cleaned up', 'info');
        }
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
      
      // Clear corrupt data and reset
      localStorage.removeItem('photoSessions');
      this.sessions = [];
      this.showStatusMessage('Gallery data was corrupted and has been reset', 'error');
      this.showEmptyState();
    }
  }

  refreshGallery() {
    this.showLoadingOverlay(true, 'Refreshing gallery...');
    
    // Small delay to show the loading state
    setTimeout(() => {
      this.loadSessions();
      this.showLoadingOverlay(false);
      this.showStatusMessage('Gallery refreshed successfully', 'success');
    }, 500);
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
    const sessionName = session.sessionName || 
                       (session.email ? `${session.email} - ${session.layout || 4} shots` : null) || 
                       `Session ${index + 1}`;
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

  // Enhanced method to get photos matching your data structure
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
      photos = session.photos.map(photo => {
        if (typeof photo === 'string') return photo;
        if (photo && typeof photo === 'object') {
          return photo.dataUrl || photo.src || photo.url || null;
        }
        return null;
      });
      console.log('Using individual photos from camera:', photos.length);
    }
    // Priority 3: Check for other possible photo storage
    else {
      console.log('No photos found in session');
    }

    return photos.filter(photo => photo && photo.length > 0); // Remove any null/undefined/empty photos
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

      if (!photoSrc || photoSrc.length === 0) {
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

    if (modalImage) {
      modalImage.src = photoSrc;
      modalImage.onload = () => {
        // Image loaded successfully
        console.log('Modal image loaded successfully');
      };
      modalImage.onerror = () => {
        console.error('Failed to load modal image:', photoSrc);
        this.showStatusMessage('Failed to load image', 'error');
      };
    }
    
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
    if (!this.currentPhoto) {
      this.showStatusMessage('No photo selected for download', 'error');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = this.currentPhoto.src;
      link.download = `photobooth_${this.currentPhoto.sessionId}_photo_${this.currentPhoto.index + 1}.jpg`;
      link.style.display = 'none';
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

    try {
      // Store session data for editor to load
      const sessionData = {
        photos: session.photos || [],
        layout: session.layout || 4,
        email: session.email || 'gallery@user.com',
        timestamp: session.timestamp || session.savedAt,
        totalShots: session.totalShots || (session.photos ? session.photos.length : 0),
        theme: session.theme || 'classic',
        filters: session.filters || 'none'
      };

      sessionStorage.setItem('photoboothSession', JSON.stringify(sessionData));

      // Show loading state
      this.showLoadingOverlay(true, 'Loading editor...');

      // Small delay to show loading state
      setTimeout(() => {
        window.location.href = 'editor.html';
      }, 500);
    } catch (error) {
      console.error('Error preparing session for editor:', error);
      this.showStatusMessage('Failed to load session in editor', 'error');
      this.showLoadingOverlay(false);
    }
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
        this.showLoadingOverlay(false);
        return;
      }

      const sessionName = session.email ? 
        session.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_') : 
        `Session_${sessionIndex}`;
      
      this.downloadMultiplePhotos(photos, sessionName);
    } catch (error) {
      console.error('Download session error:', error);
      this.showStatusMessage('Failed to download session', 'error');
    } finally {
      this.showLoadingOverlay(false);
    }
  }

  async downloadMultiplePhotos(photos, sessionName) {
    try {
      if (photos.length === 1) {
        // Single photo download (usually the final photo strip)
        const link = document.createElement('a');
        link.href = photos[0];
        link.download = `${sessionName}_photobooth_strip.png`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Multiple photos - download individually with delay
        for (let i = 0; i < photos.length; i++) {
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = photos[i];
            link.download = `${sessionName}_photo_${i + 1}.jpg`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, i * 500);
        }
      }

      this.showStatusMessage(`Downloaded ${photos.length} photo(s) successfully!`, 'success');
    } catch (error) {
      console.error('Error downloading photos:', error);
      this.showStatusMessage('Failed to download some photos', 'error');
    }
  }

  deleteSession(sessionIndex) {
    this.pendingAction = {
      type: 'deleteSession',
      sessionIndex: sessionIndex
    };

    const session = this.sessions[sessionIndex];
    const sessionName = session ? 
      (session.sessionName || session.email || 'Untitled Session') : 
      'this session';

    this.showConfirmModal(
      `Delete Session`,
      `Are you sure you want to delete "${sessionName}"? This action cannot be undone.`
    );
  }

  confirmClearAll() {
    if (this.sessions.length === 0) {
      this.showStatusMessage('No sessions to clear', 'info');
      return;
    }

    this.pendingAction = {
      type: 'clearAll'
    };

    this.showConfirmModal(
      'Clear All Sessions',
      `Are you sure you want to delete ALL ${this.sessions.length} photo sessions? This action cannot be undone.`
    );
  }

  showConfirmModal(title, message) {
    const confirmModal = document.getElementById('confirmModal');
    if (!confirmModal) {
      console.error('Confirmation modal not found');
      return;
    }

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
      default:
        console.warn('Unknown pending action:', this.pendingAction.type);
    }

    this.pendingAction = null;
  }

  performDeleteSession(sessionIndex) {
    try {
      // Validate session index
      if (sessionIndex < 0 || sessionIndex >= this.sessions.length) {
        this.showStatusMessage('Session not found', 'error');
        return;
      }

      const deletedSession = this.sessions[sessionIndex];
      
      // Remove session by index
      this.sessions.splice(sessionIndex, 1);
      
      // Update localStorage with correct key
      localStorage.setItem('photoSessions', JSON.stringify(this.sessions));
      
      const sessionName = deletedSession.sessionName || deletedSession.email || 'Session';
      this.showStatusMessage(`"${sessionName}" deleted successfully`, 'success');
      
      if (this.sessions.length === 0) {
        this.showEmptyState();
      } else {
        this.displaySessions();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      this.showStatusMessage('Failed to delete session', 'error');
    }
  }

  performClearAll() {
    try {
      const sessionCount = this.sessions.length;
      
      // Clear localStorage with correct key
      localStorage.removeItem('photoSessions');
      this.sessions = [];
      this.showEmptyState();
      this.showStatusMessage(`All ${sessionCount} sessions cleared successfully`, 'success');
    } catch (error) {
      console.error('Error clearing sessions:', error);
      this.showStatusMessage('Failed to clear sessions', 'error');
    }
  }

  showStatusMessage(message, type = 'info') {
    const statusEl = document.getElementById('status-message');
    if (!statusEl) {
      console.warn('Status message element not found');
      return;
    }

    // Map error to danger for Bootstrap classes
    const bootstrapType = type === 'error' ? 'danger' : type;
    statusEl.className = `alert alert-modern alert-${bootstrapType}-modern`;
    statusEl.textContent = message;
    statusEl.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
      if (statusEl.style.display === 'block') {
        statusEl.style.display = 'none';
      }
    }, 5000);

    // Smooth scroll to top to ensure message is visible
    statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  showLoadingOverlay(show, message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      console.warn('Loading overlay element not found');
      return;
    }

    if (show) {
      const messageEl = overlay.querySelector('p');
      if (messageEl) messageEl.textContent = message;
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }

  // Utility method to get session statistics
  getSessionStats() {
    const totalSessions = this.sessions.length;
    const totalPhotos = this.sessions.reduce((sum, session) => {
      const photos = this.getPhotosToDisplay(session);
      return sum + photos.length;
    }, 0);

    return {
      totalSessions,
      totalPhotos,
      averagePhotosPerSession: totalSessions > 0 ? Math.round(totalPhotos / totalSessions) : 0
    };
  }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gallery = new PhotoBoothGallery();
  
  // Log session statistics for debugging
  setTimeout(() => {
    const stats = window.gallery.getSessionStats();
    console.log('Gallery Statistics:', stats);
  }, 1000);
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
    console.log('Storage changed in another tab, refreshing gallery');
    window.gallery.loadSessions();
  }
});

// Handle online/offline status
window.addEventListener('online', () => {
  if (window.gallery) {
    window.gallery.showStatusMessage('Connection restored', 'success');
  }
});

window.addEventListener('offline', () => {
  if (window.gallery) {
    window.gallery.showStatusMessage('You are offline. Some features may not work.', 'info');
  }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoBoothGallery;
}