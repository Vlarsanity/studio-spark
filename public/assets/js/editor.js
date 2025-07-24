class PhotoStripEditor {
  constructor() {
    this.sessionData = null;
    this.canvas = null;
    this.context = null;
    this.selectedPhotos = [];
    this.currentFilter = 'none';
    this.textOverlays = [];
    this.isInitialized = false;
    
    // Template dimensions (adjust as needed)
    this.stripWidth = 600;
    this.stripHeight = 1800; // For 4-6 photos vertically
    this.photoSpacing = 20;
    this.borderWidth = 40;
    
    this.init();
  }

  async init() {
    try {
      this.loadSessionData();
      this.setupElements();
      this.attachEventListeners();
      this.setupCanvas();
      this.displayPhotos();
      this.generateInitialStrip();
      this.isInitialized = true;
      console.log('Photo Strip Editor initialized successfully');
    } catch (error) {
      console.error('Failed to initialize editor:', error);
      this.showError('Editor initialization failed. Please try again.');
    }
  }

  loadSessionData() {
    const stored = sessionStorage.getItem('photoboothSession');
    if (!stored) {
      this.showError('No photo session found. Redirecting to home...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
      throw new Error('No session data found');
    }

    this.sessionData = JSON.parse(stored);
    
    // Initialize selected photos with all photos
    this.selectedPhotos = [...this.sessionData.photos];
    
    console.log('Session data loaded:', this.sessionData);
  }

  setupElements() {
    // Session info
    const sessionInfo = document.getElementById('session-info');
    if (sessionInfo) {
      const sessionDetails = sessionInfo.querySelector('#session-details');
      if (sessionDetails) {
        sessionDetails.innerHTML = `
          📧 ${this.sessionData.email} | 
          Layout: ${this.sessionData.layout} shots | 
          Photos taken: ${this.sessionData.totalShots}
        `;
      }
    }

    // Get UI elements
    this.photoThumbnails = document.getElementById('photo-thumbnails');
    this.canvasContainer = document.getElementById('canvas-container');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.downloadBtn = document.getElementById('downloadBtn');
    this.saveBtn = document.getElementById('saveBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.homeBtn = document.getElementById('homeBtn');
    
    // Filter buttons
    this.filterButtons = {
      none: document.getElementById('filter-none'),
      sepia: document.getElementById('filter-sepia'),
      grayscale: document.getElementById('filter-grayscale'),
      vintage: document.getElementById('filter-vintage'),
      bright: document.getElementById('filter-bright'),
      contrast: document.getElementById('filter-contrast')
    };

    // Text overlay controls
    this.textInput = document.getElementById('text-input');
    this.textColorPicker = document.getElementById('text-color');
    this.textSizeSlider = document.getElementById('text-size');
    this.textSizeValue = document.getElementById('text-size-value');
    this.addTextBtn = document.getElementById('add-text-btn');
    this.clearTextBtn = document.getElementById('clear-text-btn');
  }

  attachEventListeners() {
    // Filter buttons
    Object.entries(this.filterButtons).forEach(([filter, button]) => {
      if (button) {
        button.addEventListener('click', () => this.applyFilter(filter));
      }
    });

    // Text overlay controls
    if (this.addTextBtn) {
      this.addTextBtn.addEventListener('click', () => this.addTextOverlay());
    }

    if (this.clearTextBtn) {
      this.clearTextBtn.addEventListener('click', () => this.clearTextOverlays());
    }

    // Text size slider
    if (this.textSizeSlider && this.textSizeValue) {
      this.textSizeSlider.addEventListener('input', (e) => {
        this.textSizeValue.textContent = e.target.value + 'px';
      });
    }

    // Action buttons
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadPhotoStrip());
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => this.saveToGallery());
    }

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetEditor());
    }

    // Home button
    if (this.homeBtn) {
      this.homeBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to go home? Unsaved changes will be lost.')) {
          window.location.href = 'index.html';
        }
      });
    }
  }

  setupCanvas() {
    this.canvas = document.getElementById('photo-strip-canvas');
    if (!this.canvas) {
      // Create canvas if it doesn't exist
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'photo-strip-canvas';
      this.canvas.className = 'photo-strip-canvas';
      this.canvasContainer.appendChild(this.canvas);
    }

    this.context = this.canvas.getContext('2d');
    
    // Set canvas dimensions
    this.canvas.width = this.stripWidth;
    this.canvas.height = this.stripHeight;
    
    // Set display size (responsive)
    this.canvas.style.maxWidth = '100%';
    this.canvas.style.height = 'auto';
  }

  displayPhotos() {
    if (!this.photoThumbnails) return;

    this.photoThumbnails.innerHTML = '';

    this.sessionData.photos.forEach((photo, index) => {
      const photoDiv = document.createElement('div');
      photoDiv.className = 'col-auto mb-2';

      const img = document.createElement('img');
      img.src = photo.dataUrl;
      img.alt = `Photo ${photo.shotNumber}`;
      img.className = 'photo-thumbnail selected'; // All selected by default
      img.dataset.index = index;
      img.style.width = '80px';
      img.style.height = '80px';
      img.style.objectFit = 'cover';
      img.style.cursor = 'pointer';
      img.style.border = '3px solid #0d6efd';
      img.style.borderRadius = '8px';

      img.addEventListener('click', () => this.togglePhotoSelection(index, img));

      photoDiv.appendChild(img);
      this.photoThumbnails.appendChild(photoDiv);
    });
  }

  togglePhotoSelection(index, imgElement) {
    const photo = this.sessionData.photos[index];
    const selectedIndex = this.selectedPhotos.findIndex(p => p.timestamp === photo.timestamp);

    if (selectedIndex > -1) {
      // Remove from selection
      this.selectedPhotos.splice(selectedIndex, 1);
      imgElement.classList.remove('selected');
      imgElement.style.border = '2px solid #e9ecef';
    } else {
      // Add to selection
      this.selectedPhotos.push(photo);
      imgElement.classList.add('selected');
      imgElement.style.border = '3px solid #0d6efd';
    }

    // Regenerate strip
    this.generatePhotoStrip();
  }

  applyFilter(filterType) {
    // Update active filter button
    Object.values(this.filterButtons).forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    
    if (this.filterButtons[filterType]) {
      this.filterButtons[filterType].classList.add('active');
    }

    // Store current filter
    this.currentFilter = filterType;
    
    // Regenerate strip with filter
    this.generatePhotoStrip();
    
    this.showStatus(`Filter "${filterType}" applied!`);
  }

  addTextOverlay() {
    const text = this.textInput?.value.trim();
    if (!text) {
      this.showError('Please enter text to add.');
      return;
    }

    const overlay = {
      text: text,
      color: this.textColorPicker?.value || '#ffffff',
      size: parseInt(this.textSizeSlider?.value) || 24,
      x: this.stripWidth / 2, // Center horizontally
      y: 100 + (this.textOverlays.length * 50), // Stack vertically
      id: Date.now()
    };

    this.textOverlays.push(overlay);
    
    // Clear input
    if (this.textInput) {
      this.textInput.value = '';
    }

    // Regenerate strip
    this.generatePhotoStrip();
    
    this.showStatus(`Text overlay "${text}" added!`);
  }

  clearTextOverlays() {
    this.textOverlays = [];
    this.generatePhotoStrip();
    this.showStatus('All text overlays cleared!');
  }

  async generateInitialStrip() {
    this.showLoading(true);
    await this.generatePhotoStrip();
    this.showLoading(false);
  }

  async generatePhotoStrip() {
    if (!this.canvas || !this.context) return;

    this.showLoading(true);

    try {
      // Clear canvas
      this.context.fillStyle = '#ffffff';
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Add border
      this.context.fillStyle = '#f8f9fa';
      this.context.fillRect(0, 0, this.canvas.width, this.borderWidth);
      this.context.fillRect(0, this.canvas.height - this.borderWidth, this.canvas.width, this.borderWidth);

      if (this.selectedPhotos.length === 0) {
        // Show message when no photos selected
        this.context.fillStyle = '#6c757d';
        this.context.font = '24px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('Select photos to create strip', this.canvas.width / 2, this.canvas.height / 2);
        this.showLoading(false);
        return;
      }

      // Calculate photo dimensions
      const availableHeight = this.canvas.height - (2 * this.borderWidth) - ((this.selectedPhotos.length - 1) * this.photoSpacing);
      const photoHeight = Math.floor(availableHeight / this.selectedPhotos.length);
      const photoWidth = this.canvas.width - (2 * this.borderWidth);

      // Draw each selected photo
      for (let i = 0; i < this.selectedPhotos.length; i++) {
        const photo = this.selectedPhotos[i];
        const y = this.borderWidth + (i * (photoHeight + this.photoSpacing));

        await this.drawPhotoWithFilter(photo.dataUrl, this.borderWidth, y, photoWidth, photoHeight);
      }

      // Add text overlays
      this.drawTextOverlays();

      // Add watermark/branding
      this.addBranding();

      this.showLoading(false);
      console.log('Photo strip generated successfully');

    } catch (error) {
      console.error('Error generating photo strip:', error);
      this.showError('Failed to generate photo strip. Please try again.');
      this.showLoading(false);
    }
  }

  async drawPhotoWithFilter(imageSrc, x, y, width, height) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Draw image
          this.context.drawImage(img, x, y, width, height);

          // Apply filter if selected
          if (this.currentFilter && this.currentFilter !== 'none') {
            this.applyCanvasFilter(x, y, width, height);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  }

  applyCanvasFilter(x, y, width, height) {
    const imageData = this.context.getImageData(x, y, width, height);
    const data = imageData.data;

    switch (this.currentFilter) {
      case 'sepia':
        this.applySepiaFilter(data);
        break;
      case 'grayscale':
        this.applyGrayscaleFilter(data);
        break;
      case 'vintage':
        this.applyVintageFilter(data);
        break;
      case 'bright':
        this.applyBrightnessFilter(data, 1.3);
        break;
      case 'contrast':
        this.applyContrastFilter(data, 1.5);
        break;
    }

    this.context.putImageData(imageData, x, y);
  }

  applySepiaFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }

  applyGrayscaleFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.299) + (data[i + 1] * 0.587) + (data[i + 2] * 0.114);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
  }

  applyVintageFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Vintage effect (warm tones, slight vignette effect)
      data[i] = Math.min(255, r * 1.1);
      data[i + 1] = Math.min(255, g * 1.05);
      data[i + 2] = Math.min(255, b * 0.9);
    }
  }

  applyBrightnessFilter(data, factor) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
  }

  applyContrastFilter(data, factor) {
    const contrast = (factor - 1) * 255;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, (data[i] - 128) * factor + 128 + contrast));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * factor + 128 + contrast));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * factor + 128 + contrast));
    }
  }

  drawTextOverlays() {
    this.textOverlays.forEach(overlay => {
      // Add text shadow for better visibility
      this.context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      this.context.shadowOffsetX = 2;
      this.context.shadowOffsetY = 2;
      this.context.shadowBlur = 3;
      
      this.context.fillStyle = overlay.color;
      this.context.font = `bold ${overlay.size}px Arial`;
      this.context.textAlign = 'center';
      this.context.fillText(overlay.text, overlay.x, overlay.y);
      
      // Reset shadow
      this.context.shadowColor = 'transparent';
    });
  }

  addBranding() {
    // Add subtle branding/date at bottom of strip
    this.context.fillStyle = '#6c757d';
    this.context.font = '12px Arial';
    this.context.textAlign = 'center';
    
    const date = new Date().toLocaleDateString();
    this.context.fillText(`📸 Photobooth - ${date}`, this.canvas.width / 2, this.canvas.height - 10);
  }

  downloadPhotoStrip() {
    if (!this.canvas) {
      this.showError('No photo strip to download.');
      return;
    }

    try {
      const link = document.createElement('a');
      const filename = `photobooth_strip_${this.sessionData.email.replace('@', '_')}_${new Date().getTime()}.png`;
      
      link.download = filename;
      link.href = this.canvas.toDataURL('image/png');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      this.showStatus('Photo strip downloaded successfully! 📥');
      console.log('Photo strip downloaded:', filename);
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showError('Failed to download photo strip. Please try again.');
    }
  }

  saveToGallery() {
    if (!this.canvas) {
      this.showError('No photo strip to save.');
      return;
    }

    try {
      // Create session data for gallery
      const gallerySession = {
        ...this.sessionData,
        photoStrip: this.canvas.toDataURL('image/png'),
        savedAt: new Date().toISOString(),
        filters: this.currentFilter,
        textOverlays: this.textOverlays.length,
        sessionDate: this.sessionData.timestamp || new Date().toISOString()
      };

      // Get existing sessions
      const existingSessions = JSON.parse(localStorage.getItem('photoSessions') || '[]');
      
      // Add new session
      existingSessions.push(gallerySession);
      
      // Save to localStorage
      localStorage.setItem('photoSessions', JSON.stringify(existingSessions));
      
      this.showStatus('Photo strip saved to gallery! 💾');
      console.log('Session saved to gallery');
      
    } catch (error) {
      console.error('Save failed:', error);
      this.showError('Failed to save to gallery. Please try again.');
    }
  }

  resetEditor() {
    if (confirm('Are you sure you want to reset all changes?')) {
      // Reset selections
      this.selectedPhotos = [...this.sessionData.photos];
      this.currentFilter = 'none';
      this.textOverlays = [];
      
      // Reset UI
      this.displayPhotos();
      
      // Reset filter buttons
      Object.values(this.filterButtons).forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (this.filterButtons.none) {
        this.filterButtons.none.classList.add('active');
      }
      
      // Clear text input
      if (this.textInput) {
        this.textInput.value = '';
      }
      
      // Reset text size display
      if (this.textSizeValue) {
        this.textSizeValue.textContent = '24px';
      }
      
      // Regenerate strip
      this.generatePhotoStrip();
      
      this.showStatus('Editor reset to original state.');
    }
  }

  showLoading(show) {
    if (this.loadingSpinner) {
      this.loadingSpinner.style.display = show ? 'block' : 'none';
    }
  }

  showStatus(message) {
    console.log('Status:', message);
    
    // Create temporary status message
    const statusDiv = document.createElement('div');
    statusDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    statusDiv.style.top = '20px';
    statusDiv.style.right = '20px';
    statusDiv.style.zIndex = '9999';
    statusDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(statusDiv);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      if (document.body.contains(statusDiv)) {
        statusDiv.remove();
      }
    }, 4000);
  }

  showError(message) {
    console.error('Error:', message);
    
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        errorDiv.remove();
      }
    }, 6000);
  }

  // Get current editor state (useful for debugging)
  getEditorState() {
    return {
      sessionData: this.sessionData,
      selectedPhotos: this.selectedPhotos.length,
      currentFilter: this.currentFilter,
      textOverlays: this.textOverlays.length,
      isInitialized: this.isInitialized
    };
  }

  // Clean up resources
  destroy() {
    // Clear canvas
    if (this.context) {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    // Reset state
    this.selectedPhotos = [];
    this.textOverlays = [];
    this.isInitialized = false;
    
    console.log('Photo Strip Editor destroyed');
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on editor page
  if (document.getElementById("photo-strip-canvas") || document.getElementById("canvas-container")) {
    window.photoStripEditor = new PhotoStripEditor();
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.photoStripEditor) {
    window.photoStripEditor.destroy();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoStripEditor;
}