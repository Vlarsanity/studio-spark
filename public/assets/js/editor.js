class PhotoStripEditor {
  constructor() {
    this.sessionData = null;
    this.canvas = null;
    this.context = null;
    this.selectedPhotos = [];
    this.currentFilter = 'none';
    this.textOverlays = [];
    this.currentTheme = 'classic'; // Add theme support
    this.customBgColor = '#ffffff'; // Add custom background color
    this.isInitialized = false;
    
    // Template dimensions (adjust as needed)
    this.stripWidth = 600;
    this.stripHeight = 1800; // For 4-6 photos vertically
    this.photoSpacing = 20;
    this.borderWidth = 80; // Increased border for text space
    
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

    // Theme buttons
    this.themeButtons = {
      classic: document.getElementById('theme-classic'),
      gradient1: document.getElementById('theme-gradient1'),
      gradient2: document.getElementById('theme-gradient2'),
      gradient3: document.getElementById('theme-gradient3'),
      pattern1: document.getElementById('theme-pattern1'),
      pattern2: document.getElementById('theme-pattern2')
    };

    // Custom background color picker
    this.customBgColorPicker = document.getElementById('custom-bg-color');

    // Text overlay controls
    this.textInput = document.getElementById('text-input');
    this.textColorPicker = document.getElementById('text-color');
    this.textSizeSlider = document.getElementById('text-size');
    this.textSizeValue = document.getElementById('text-size-value');
    this.addTextBtn = document.getElementById('add-text-btn');
    this.clearTextBtn = document.getElementById('clear-text-btn');
    
    // Text position controls
    this.textPositionInputs = document.querySelectorAll('input[name="text-position"]');
    this.textOrientationInputs = document.querySelectorAll('input[name="text-orientation"]');

    // Create simplified download buttons (NO EMAIL)
    this.createSimplifiedDownloadButtons();
  }

  createSimplifiedDownloadButtons() {
    // Find or create action buttons container
    let actionContainer = document.querySelector('.action-buttons') || document.querySelector('.text-center');
    
    if (!actionContainer) {
      actionContainer = document.createElement('div');
      actionContainer.className = 'text-center mt-4';
      
      // Insert before home button if it exists
      const homeBtn = document.getElementById('homeBtn');
      if (homeBtn && homeBtn.parentNode) {
        homeBtn.parentNode.insertBefore(actionContainer, homeBtn);
      } else {
        // Append to canvas container or body
        const container = this.canvasContainer || document.body;
        container.appendChild(actionContainer);
      }
    }

    // Create simplified download buttons row
    const downloadRow = document.createElement('div');
    downloadRow.className = 'row g-2 justify-content-center mb-3';
    downloadRow.id = 'simplified-download-buttons';

    // Remove existing buttons to prevent duplicates
    const existing = document.getElementById('simplified-download-buttons');
    if (existing) {
      existing.remove();
    }

    // Simplified, working buttons only (NO EMAIL)
    downloadRow.innerHTML = `
      <div class="col-auto">
        <button id="download-strip-enhanced" class="btn btn-success btn-lg">
          <i class="fas fa-download"></i> Download Photo Strip
        </button>
      </div>
      <div class="col-auto">
        <button id="download-individual-enhanced" class="btn btn-warning btn-lg">
          <i class="fas fa-images"></i> Download All Photos
        </button>
      </div>
      <div class="col-auto">
        <button id="share-social-enhanced" class="btn btn-primary btn-lg">
          <i class="fas fa-share-alt"></i> Share
        </button>
      </div>
    `;

    actionContainer.appendChild(downloadRow);

    // Add helpful instruction text
    const instructionText = document.createElement('div');
    instructionText.className = 'alert alert-info mt-3';
    instructionText.innerHTML = `
      <i class="fas fa-info-circle"></i> 
      <strong>How to share:</strong> Download your photos and share them via your favorite apps, email them manually, or print them out!
    `;
    actionContainer.appendChild(instructionText);

    // Attach simplified event listeners
    this.attachSimplifiedDownloadListeners();
  }

  attachSimplifiedDownloadListeners() {
    // Download photo strip (enhanced)
    const downloadStripBtn = document.getElementById('download-strip-enhanced');
    if (downloadStripBtn) {
      downloadStripBtn.addEventListener('click', () => this.downloadPhotoStripEnhanced());
    }

    // Download individual photos (enhanced)
    const downloadIndividualBtn = document.getElementById('download-individual-enhanced');
    if (downloadIndividualBtn) {
      downloadIndividualBtn.addEventListener('click', () => this.downloadAllPhotosEnhanced());
    }

    // Share functionality (simplified - just show share options)
    const shareBtn = document.getElementById('share-social-enhanced');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.showSimpleShareOptions());
    }
  }

  attachEventListeners() {
    // Filter buttons
    Object.entries(this.filterButtons).forEach(([filter, button]) => {
      if (button) {
        button.addEventListener('click', () => this.applyFilter(filter));
      }
    });

    // Theme buttons
    Object.entries(this.themeButtons).forEach(([theme, button]) => {
      if (button) {
        button.addEventListener('click', () => this.applyTheme(theme));
      }
    });

    // Custom background color picker
    if (this.customBgColorPicker) {
      this.customBgColorPicker.addEventListener('change', (e) => {
        this.customBgColor = e.target.value;
        this.applyTheme('custom');
      });
    }

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

    // Text position change
    this.textPositionInputs.forEach(input => {
      input.addEventListener('change', () => this.generatePhotoStrip());
    });

    // Text orientation change
    this.textOrientationInputs.forEach(input => {
      input.addEventListener('change', () => this.generatePhotoStrip());
    });

    // Original action buttons (keep for backward compatibility)
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

  // SIMPLIFIED DOWNLOAD FUNCTIONALITY (NO EMAIL METHODS)

  downloadPhotoStripEnhanced() {
    if (!this.canvas) {
      this.showError('No photo strip to download.');
      return;
    }

    try {
      // Show loading state
      const btn = document.getElementById('download-strip-enhanced');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
      btn.disabled = true;

      // Generate filename with metadata
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const email = this.sessionData.email.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `photobooth_${email}_${this.currentTheme}_${this.currentFilter}_${timestamp}.png`;
      
      // Create high-quality download
      const link = document.createElement('a');
      link.download = filename;
      link.href = this.canvas.toDataURL('image/png', 1.0); // Max quality
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Log download for analytics
      this.logDownload('photo_strip', filename);
      
      this.showStatus('📥 Photo strip downloaded successfully!');
      
      // Reset button
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Enhanced download failed:', error);
      this.showError('Failed to download photo strip. Please try again.');
      
      // Reset button on error
      const btn = document.getElementById('download-strip-enhanced');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-download"></i> Download Photo Strip';
        btn.disabled = false;
      }
    }
  }

  downloadAllPhotosEnhanced() {
    if (!this.selectedPhotos || this.selectedPhotos.length === 0) {
      this.showError('No photos selected to download.');
      return;
    }

    try {
      // Show loading state
      const btn = document.getElementById('download-individual-enhanced');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
      btn.disabled = true;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const email = this.sessionData.email.replace(/[^a-zA-Z0-9]/g, '_');

      // Download each photo with enhanced naming
      this.selectedPhotos.forEach((photo, index) => {
        setTimeout(() => {
          const filename = `photobooth_${email}_photo_${photo.shotNumber}_${timestamp}.jpg`;
          
          const link = document.createElement('a');
          link.download = filename;
          link.href = photo.dataUrl;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Log individual photo download
          this.logDownload('individual_photo', filename);
          
        }, index * 300); // Stagger downloads by 300ms
      });

      this.showStatus(`📥 Downloading ${this.selectedPhotos.length} photos...`);
      
      // Reset button after all downloads
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        this.showStatus(`✅ All ${this.selectedPhotos.length} photos downloaded!`);
      }, (this.selectedPhotos.length * 300) + 1000);
      
    } catch (error) {
      console.error('Enhanced individual download failed:', error);
      this.showError('Failed to download photos. Please try again.');
      
      // Reset button on error
      const btn = document.getElementById('download-individual-enhanced');
      if (btn) {
        btn.innerHTML = '<i class="fas fa-images"></i> Download All Photos';
        btn.disabled = false;
      }
    }
  }

  showSimpleShareOptions() {
    // Show loading state briefly
    const btn = document.getElementById('share-social-enhanced');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
    btn.disabled = true;

    // First, download the photo strip
    this.downloadPhotoStripEnhanced();

    // Then show simple share modal
    setTimeout(() => {
      this.showSimpleShareModal();
      
      // Reset button
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1000);
  }

  showSimpleShareModal() {
    // Create modal with simple share instructions
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'shareModal';
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-share-alt"></i> Share Your Photo Strip
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="text-center mb-4">
              <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
              <h4 class="mt-2 text-success">Photo Strip Downloaded!</h4>
              <p class="text-muted">Your photo strip has been saved to your device</p>
            </div>
            
            <div class="alert alert-info">
              <i class="fas fa-lightbulb"></i>
              <strong>Now you can share it anywhere:</strong>
            </div>
            
            <div class="row g-3">
              <div class="col-md-6">
                <div class="card h-100 border-warning">
                  <div class="card-body text-center">
                    <i class="fas fa-envelope text-warning" style="font-size: 2.5rem;"></i>
                    <h5 class="mt-3">📧 Email</h5>
                    <p class="small">
                      Open your email app, compose a message, and attach the downloaded photo strip to send to friends and family
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="col-md-6">
                <div class="card h-100 border-success">
                  <div class="card-body text-center">
                    <i class="fas fa-comments text-success" style="font-size: 2.5rem;"></i>
                    <h5 class="mt-3">💬 Messaging</h5>
                    <p class="small">
                      Share via WhatsApp, Telegram, SMS, or any messaging app by selecting the downloaded image from your gallery
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="col-md-6">
                <div class="card h-100 border-info">
                  <div class="card-body text-center">
                    <i class="fab fa-facebook text-info" style="font-size: 2.5rem;"></i>
                    <h5 class="mt-3">📱 Social Media</h5>
                    <p class="small">
                      Post to Facebook, Instagram, Twitter, TikTok by uploading the downloaded image to your favorite social platform
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="col-md-6">
                <div class="card h-100 border-secondary">
                  <div class="card-body text-center">
                    <i class="fas fa-print text-secondary" style="font-size: 2.5rem;"></i>
                    <h5 class="mt-3">🖨️ Print</h5>
                    <p class="small">
                      Print your photo strip at home, at a photo printing service, or create physical copies for keepsakes
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="mt-4 text-center">
              <button class="btn btn-outline-success me-2" onclick="window.photoStripEditor.downloadPhotoStripEnhanced()">
                <i class="fas fa-download"></i> Download Again
              </button>
              <button class="btn btn-outline-warning" onclick="window.photoStripEditor.downloadAllPhotosEnhanced()">
                <i class="fas fa-images"></i> Download Individual Photos
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
    
    // Clean up when modal is hidden
    modal.addEventListener('hidden.bs.modal', () => {
      document.body.removeChild(modal);
    });
  }

  // LOGGING AND ANALYTICS

  logDownload(type, filename) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionData.sessionId,
        email: this.sessionData.email,
        type: type,
        filename: filename,
        theme: this.currentTheme,
        filter: this.currentFilter,
        photoCount: this.selectedPhotos.length,
        textOverlays: this.textOverlays.length
      };
      
      // Store in localStorage for analytics
      const logs = JSON.parse(localStorage.getItem('photoboothLogs') || '[]');
      logs.push(logEntry);
      
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('photoboothLogs', JSON.stringify(logs));
      
      console.log('Download logged:', logEntry);
      
    } catch (error) {
      console.error('Failed to log download:', error);
    }
  }

  // EXISTING METHODS (keep all your original functionality)

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

  applyTheme(themeType) {
    // Update active theme button
    Object.values(this.themeButtons).forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    
    if (this.themeButtons[themeType]) {
      this.themeButtons[themeType].classList.add('active');
    } else if (themeType === 'custom') {
      // Handle custom theme - don't highlight any preset theme button
      Object.values(this.themeButtons).forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
    }

    // Store current theme
    this.currentTheme = themeType;
    
    // Regenerate strip with new theme
    this.generatePhotoStrip();
    
    this.showStatus(`Theme "${themeType}" applied!`);
  }

  addTextOverlay() {
    const text = this.textInput?.value.trim();
    if (!text) {
      this.showError('Please enter text to add.');
      return;
    }

    // Get selected position and orientation
    const selectedPosition = document.querySelector('input[name="text-position"]:checked')?.value || 'top';
    const selectedOrientation = document.querySelector('input[name="text-orientation"]:checked')?.value || 'horizontal';

    const overlay = {
      text: text,
      color: this.textColorPicker?.value || '#000000',
      size: parseInt(this.textSizeSlider?.value) || 24,
      position: selectedPosition, // top, bottom, left, right
      orientation: selectedOrientation, // horizontal, vertical
      id: Date.now()
    };

    this.textOverlays.push(overlay);
    
    // Clear input
    if (this.textInput) {
      this.textInput.value = '';
    }

    // Regenerate strip
    this.generatePhotoStrip();
    
    this.showStatus(`Text overlay "${text}" added to ${selectedPosition}!`);
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
      // Clear canvas and apply theme background
      this.drawThemeBackground();

      // Draw template borders/background
      this.drawTemplateBorders();

      if (this.selectedPhotos.length === 0) {
        // Show message when no photos selected
        this.context.fillStyle = '#6c757d';
        this.context.font = '24px Arial';
        this.context.textAlign = 'center';
        this.context.fillText('Select photos to create strip', this.canvas.width / 2, this.canvas.height / 2);
        this.showLoading(false);
        return;
      }

      // Calculate photo area dimensions (excluding borders)
      const photoAreaWidth = this.canvas.width - (2 * this.borderWidth);
      const photoAreaHeight = this.canvas.height - (2 * this.borderWidth);
      const availableHeight = photoAreaHeight - ((this.selectedPhotos.length - 1) * this.photoSpacing);
      const photoHeight = Math.floor(availableHeight / this.selectedPhotos.length);

      // Draw each selected photo in the center area
      for (let i = 0; i < this.selectedPhotos.length; i++) {
        const photo = this.selectedPhotos[i];
        const x = this.borderWidth;
        const y = this.borderWidth + (i * (photoHeight + this.photoSpacing));

        await this.drawPhotoWithFilter(photo.dataUrl, x, y, photoAreaWidth, photoHeight);
      }

      // Add text overlays in border areas
      this.drawTextOverlaysInBorders();

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

  drawThemeBackground() {
    // Clear canvas first
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.currentTheme) {
      case 'classic':
        this.context.fillStyle = '#ffffff';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      case 'gradient1': // Sunset
        const gradient1 = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient1.addColorStop(0, '#ff7e5f');
        gradient1.addColorStop(1, '#feb47b');
        this.context.fillStyle = gradient1;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      case 'gradient2': // Ocean
        const gradient2 = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient2.addColorStop(0, '#667eea');
        gradient2.addColorStop(1, '#764ba2');
        this.context.fillStyle = gradient2;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      case 'gradient3': // Forest
        const gradient3 = this.context.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient3.addColorStop(0, '#11998e');
        gradient3.addColorStop(1, '#38ef7d');
        this.context.fillStyle = gradient3;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      case 'pattern1': // Dots
        this.context.fillStyle = '#f8f9fa';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawDotPattern();
        break;

      case 'pattern2': // Stripes
        this.drawStripePattern();
        break;

      case 'custom':
        this.context.fillStyle = this.customBgColor;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        break;

      default:
        this.context.fillStyle = '#ffffff';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawDotPattern() {
    this.context.fillStyle = '#e9ecef';
    const dotSize = 4;
    const spacing = 20;
    
    for (let x = spacing; x < this.canvas.width; x += spacing) {
      for (let y = spacing; y < this.canvas.height; y += spacing) {
        this.context.beginPath();
        this.context.arc(x, y, dotSize, 0, 2 * Math.PI);
        this.context.fill();
      }
    }
  }

  drawStripePattern() {
    const stripeWidth = 30;
    let isLight = true;
    
    for (let x = 0; x < this.canvas.width; x += stripeWidth) {
      this.context.fillStyle = isLight ? '#f8f9fa' : '#e9ecef';
      this.context.fillRect(x, 0, stripeWidth, this.canvas.height);
      isLight = !isLight;
    }
  }

  drawTemplateBorders() {
    // Add border lines around the photo area (inner rectangle)
    this.context.strokeStyle = this.getStrokeColorForTheme();
    this.context.lineWidth = 3;
    this.context.strokeRect(this.borderWidth, this.borderWidth, 
                           this.canvas.width - (2 * this.borderWidth), 
                           this.canvas.height - (2 * this.borderWidth));
    
    // Add a subtle inner shadow effect for depth (optional)
    this.context.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    this.context.lineWidth = 1;
    this.context.strokeRect(this.borderWidth + 1, this.borderWidth + 1, 
                           this.canvas.width - (2 * this.borderWidth) - 2, 
                           this.canvas.height - (2 * this.borderWidth) - 2);
  }

  getBorderColorForTheme() {
    // Return appropriate border color based on current theme
    switch (this.currentTheme) {
      case 'gradient1':
      case 'gradient2':
      case 'gradient3':
        return 'rgba(255, 255, 255, 0.9)';
      case 'pattern1':
      case 'pattern2':
        return 'rgba(248, 249, 250, 0.95)';
      default:
        return 'rgba(248, 249, 250, 0.95)';
    }
  }

  getStrokeColorForTheme() {
    // Return appropriate stroke color based on current theme
    switch (this.currentTheme) {
      case 'gradient1':
      case 'gradient2':
      case 'gradient3':
        return 'rgba(255, 255, 255, 0.8)';
      case 'pattern1':
      case 'pattern2':
        return 'rgba(0, 0, 0, 0.3)';
      case 'custom':
        // Choose stroke color based on background brightness
        return this.isLightColor(this.customBgColor) ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.8)';
      default:
        return '#dee2e6';
    }
  }

  // Helper function to determine if a color is light or dark
  isLightColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  }

  drawTextOverlaysInBorders() {
    this.textOverlays.forEach((overlay, index) => {
      // Adjust text color for better visibility on different themes
      const textColor = this.getTextColorForTheme(overlay.color);
      this.context.fillStyle = textColor;
      this.context.font = `bold ${overlay.size}px Arial`;
      
      // Add text shadow for better readability on complex backgrounds
      this.context.shadowColor = textColor === '#ffffff' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)';
      this.context.shadowBlur = 2;
      this.context.shadowOffsetX = 1;
      this.context.shadowOffsetY = 1;
      
      let x, y, maxWidth;
      
      // Calculate position based on overlay.position
      switch (overlay.position) {
        case 'top':
          x = this.canvas.width / 2;
          y = (this.borderWidth / 2) + (overlay.size / 2) + (index * (overlay.size + 5));
          maxWidth = this.canvas.width - 20;
          this.context.textAlign = 'center';
          if (overlay.orientation === 'horizontal') {
            this.context.save();
            this.context.translate(x, y);
            this.context.fillText(overlay.text, 0, 0);
            this.context.restore();
          } else {
            this.drawVerticalText(overlay.text, x, y, textColor, overlay.size);
          }
          break;
          
        case 'bottom':
          x = this.canvas.width / 2;
          y = this.canvas.height - (this.borderWidth / 2) + (overlay.size / 2) - (index * (overlay.size + 5));
          maxWidth = this.canvas.width - 20;
          this.context.textAlign = 'center';
          if (overlay.orientation === 'horizontal') {
            this.context.save();
            this.context.translate(x, y);
            this.context.fillText(overlay.text, 0, 0);
            this.context.restore();
          } else {
            this.drawVerticalText(overlay.text, x, y, textColor, overlay.size);
          }
          break;
          
        case 'left':
          x = this.borderWidth / 2;
          y = (this.canvas.height / 2) + (index * (overlay.size + 10));
          maxWidth = this.borderWidth - 10;
          this.context.textAlign = 'center';
          if (overlay.orientation === 'vertical') {
            this.drawVerticalText(overlay.text, x, y, textColor, overlay.size);
          } else {
            // Rotate text 90 degrees for horizontal text in vertical space
            this.context.save();
            this.context.translate(x, y);
            this.context.rotate(-Math.PI / 2);
            this.context.fillText(overlay.text, 0, 0);
            this.context.restore();
          }
          break;
          
        case 'right':
          x = this.canvas.width - (this.borderWidth / 2);
          y = (this.canvas.height / 2) + (index * (overlay.size + 10));
          maxWidth = this.borderWidth - 10;
          this.context.textAlign = 'center';
          if (overlay.orientation === 'vertical') {
            this.drawVerticalText(overlay.text, x, y, textColor, overlay.size);
          } else {
            // Rotate text 90 degrees for horizontal text in vertical space
            this.context.save();
            this.context.translate(x, y);
            this.context.rotate(Math.PI / 2);
            this.context.fillText(overlay.text, 0, 0);
            this.context.restore();
          }
          break;
      }
      
      // Reset shadow
      this.context.shadowColor = 'transparent';
      this.context.shadowBlur = 0;
      this.context.shadowOffsetX = 0;
      this.context.shadowOffsetY = 0;
    });
  }

  getTextColorForTheme(originalColor) {
    // For gradient themes, might want to use white text for better visibility
    switch (this.currentTheme) {
      case 'gradient1':
      case 'gradient2':
      case 'gradient3':
        // If original color is too dark, use white for better contrast
        if (originalColor === '#000000') {
          return '#ffffff';
        }
        return originalColor;
      default:
        return originalColor;
    }
  }

  drawVerticalText(text, x, y, color, size) {
    this.context.fillStyle = color;
    this.context.font = `bold ${size}px Arial`;
    this.context.textAlign = 'center';
    
    // Draw each character vertically
    const chars = text.split('');
    const charHeight = size + 5;
    const startY = y - ((chars.length - 1) * charHeight) / 2;
    
    chars.forEach((char, index) => {
      this.context.fillText(char, x, startY + (index * charHeight));
    });
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

  addBranding() {
    // Add subtle branding at the very bottom
    this.context.fillStyle = '#6c757d';
    this.context.font = '10px Arial';
    this.context.textAlign = 'center';
    
    const date = new Date().toLocaleDateString();
    this.context.fillText(`📸 Photobooth - ${date}`, this.canvas.width / 2, this.canvas.height - 5);
  }

  // ORIGINAL DOWNLOAD METHOD (keep for backward compatibility)
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
        theme: this.currentTheme,
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
      this.currentTheme = 'classic';
      this.customBgColor = '#ffffff';
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

      // Reset theme buttons
      Object.values(this.themeButtons).forEach(btn => {
        if (btn) btn.classList.remove('active');
      });
      if (this.themeButtons.classic) {
        this.themeButtons.classic.classList.add('active');
      }

      // Reset custom background color
      if (this.customBgColorPicker) {
        this.customBgColorPicker.value = '#ffffff';
      }
      
      // Clear text input
      if (this.textInput) {
        this.textInput.value = '';
      }
      
      // Reset text size display
      if (this.textSizeValue) {
        this.textSizeValue.textContent = '24px';
      }
      
      // Reset text position and orientation
      const topPosition = document.getElementById('text-top');
      const horizontalOrientation = document.getElementById('text-horizontal');
      if (topPosition) topPosition.checked = true;
      if (horizontalOrientation) horizontalOrientation.checked = true;
      
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
      currentTheme: this.currentTheme,
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