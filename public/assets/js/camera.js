class PhotoboothCamera {
  constructor() {
      this.video = null;
      this.canvas = null;
      this.context = null;
      this.stream = null;
      this.isInitialized = false;
      this.constraints = {
          video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
          },
          audio: false
      };
      
      // Get session data
      this.selectedLayout = localStorage.getItem("selectedLayout");
      this.userEmail = localStorage.getItem("userEmail");
      this.shotsToTake = parseInt(this.selectedLayout, 10) || 4;
      this.shotsTaken = 0;
      this.photos = [];
      
      this.init();
  }

  async init() {
      // Check for session data
      if (!this.selectedLayout || !this.userEmail) {
          this.showError("Missing session data. Please start again.");
          setTimeout(() => {
              window.location.href = "index.html";
          }, 3000);
          return;
      }

      try {
          this.setupElements();
          this.attachEventListeners();
          await this.startCamera();
          this.isInitialized = true;
          this.updateUI();
          console.log('Photobooth camera initialized successfully');
      } catch (error) {
          console.error('Failed to initialize camera:', error);
          this.showError('Camera initialization failed. Please check your camera permissions.');
      }
  }

  setupElements() {
      // Create camera elements if they don't exist
      this.createCameraElements();
      
      // Get existing UI elements
      this.templateInfo = document.getElementById("template-info");
      this.countdownEl = document.getElementById("countdown");
      this.photoPreview = document.getElementById("photo-preview");
      this.nextBtn = document.getElementById("nextBtn");
      
      // Setup canvas for photo capture
      this.canvas = document.createElement('canvas');
      this.canvas.style.display = 'none';
      document.body.appendChild(this.canvas);
      this.context = this.canvas.getContext('2d');
  }

  createCameraElements() {
      // Create video element for camera feed
      this.video = document.createElement('video');
      this.video.id = 'camera-video';
      this.video.autoplay = true;
      this.video.playsInline = true;
      this.video.muted = true;
      this.video.style.width = '100%';
      this.video.style.maxWidth = '500px';
      this.video.style.height = 'auto';
      this.video.style.borderRadius = '10px';
      this.video.style.border = '3px solid #0d6efd';
      this.video.style.display = 'none'; // Initially hidden

      // Create camera controls
      const cameraContainer = document.createElement('div');
      cameraContainer.id = 'camera-container';
      cameraContainer.className = 'text-center mb-4';
      cameraContainer.appendChild(this.video);

      // Insert camera container before countdown
      const countdownEl = document.getElementById("countdown");
      countdownEl.parentNode.insertBefore(cameraContainer, countdownEl);

      // Create capture button (initially hidden)
      this.captureButton = document.createElement('button');
      this.captureButton.id = 'capture-btn';
      this.captureButton.className = 'btn btn-danger btn-lg mt-3';
      this.captureButton.textContent = 'Take Photo';
      this.captureButton.style.display = 'none';
      cameraContainer.appendChild(this.captureButton);

      // Create switch camera button
      const switchBtn = document.createElement('button');
      switchBtn.id = 'switch-camera-btn';
      switchBtn.className = 'btn btn-outline-secondary ms-2 mt-3';
      switchBtn.textContent = '🔄';
      switchBtn.title = 'Switch Camera';
      switchBtn.style.display = 'none';
      cameraContainer.appendChild(switchBtn);

      // Create status message element
      const statusEl = document.createElement('div');
      statusEl.id = 'status-message';
      statusEl.className = 'alert mt-3';
      statusEl.style.display = 'none';
      cameraContainer.appendChild(statusEl);
  }

  attachEventListeners() {
      if (this.captureButton) {
          this.captureButton.addEventListener('click', () => this.capturePhoto());
      }

      if (this.nextBtn) {
          this.nextBtn.addEventListener('click', () => this.proceedToEditor());
      }

      // Handle video metadata loaded
      this.video.addEventListener('loadedmetadata', () => {
          this.adjustCanvasSize();
      });

      // Handle camera switch button
      const switchCameraBtn = document.getElementById('switch-camera-btn');
      if (switchCameraBtn) {
          switchCameraBtn.addEventListener('click', () => this.switchCamera());
      }
  }

  async startCamera() {
      try {
          this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
          this.video.srcObject = this.stream;
          
          await new Promise((resolve) => {
              this.video.onloadedmetadata = resolve;
          });

          this.adjustCanvasSize();
          this.video.style.display = 'block';
          document.getElementById('switch-camera-btn').style.display = 'inline-block';
          
          // Start the photo session
          this.startPhotoSession();
          
      } catch (error) {
          console.error('Error accessing camera:', error);
          let errorMessage = 'Unable to access camera. ';
          
          if (error.name === 'NotAllowedError') {
              errorMessage += 'Please allow camera permissions and reload the page.';
          } else if (error.name === 'NotFoundError') {
              errorMessage += 'No camera found on this device.';
          } else {
              errorMessage += 'Please check your camera settings.';
          }
          
          this.showError(errorMessage);
          throw error;
      }
  }

  updateUI() {
      if (this.templateInfo) {
          this.templateInfo.textContent = `Selected Layout: ${this.selectedLayout} Shots - Email: ${this.userEmail}`;
      }
      
      if (this.nextBtn) {
          this.nextBtn.disabled = true;
          this.nextBtn.textContent = 'Proceed to Editor';
      }
  }

  startPhotoSession() {
      this.showStatus('Camera ready! Photo session will begin shortly...');
      setTimeout(() => {
          this.startCountdown();
      }, 2000);
  }

  startCountdown() {
      if (this.shotsTaken >= this.shotsToTake) {
          this.completeSession();
          return;
      }

      let count = 3;
      this.countdownEl.textContent = `Photo ${this.shotsTaken + 1} of ${this.shotsToTake} - Get Ready: ${count}`;
      this.captureButton.style.display = 'none';
      
      const interval = setInterval(() => {
          count--;
          if (count > 0) {
              this.countdownEl.textContent = `Photo ${this.shotsTaken + 1} of ${this.shotsToTake} - Get Ready: ${count}`;
          } else if (count === 0) {
              this.countdownEl.textContent = 'Smile! 📸';
              this.captureButton.style.display = 'inline-block';
          } else {
              clearInterval(interval);
              // Auto-capture after showing "Smile!" for 1 second
              setTimeout(() => {
                  this.capturePhoto();
              }, 1000);
          }
      }, 1000);
  }

  adjustCanvasSize() {
      if (this.video.videoWidth && this.video.videoHeight) {
          this.canvas.width = this.video.videoWidth;
          this.canvas.height = this.video.videoHeight;
      }
  }

  async capturePhoto() {
      if (!this.isInitialized || !this.video.videoWidth) {
          this.showError('Camera not ready. Please wait a moment and try again.');
          return;
      }

      try {
          // Draw current video frame to canvas
          this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
          
          // Convert to data URL
          const photoDataUrl = this.canvas.toDataURL('image/jpeg', 0.9);
          
          // Show capture flash effect
          this.showCaptureFlash();
          
          // Create thumbnail for preview
          const img = document.createElement("img");
          img.src = photoDataUrl;
          img.alt = `Photo ${this.shotsTaken + 1}`;
          img.classList.add("img-thumbnail", "m-1");
          img.style.width = "100px";
          img.style.height = "100px";
          img.style.objectFit = "cover";
          this.photoPreview.appendChild(img);

          // Store photo data
          this.photos.push({
              dataUrl: photoDataUrl,
              timestamp: new Date().toISOString(),
              shotNumber: this.shotsTaken + 1
          });
          
          this.shotsTaken++;
          
          // Update UI
          this.captureButton.style.display = 'none';
          
          if (this.shotsTaken < this.shotsToTake) {
              this.countdownEl.textContent = `Great shot! Preparing for next photo...`;
              setTimeout(() => {
                  this.startCountdown();
              }, 2000);
          } else {
              this.completeSession();
          }
          
          console.log(`Photo ${this.shotsTaken} captured successfully`);
          
      } catch (error) {
          console.error('Error capturing photo:', error);
          this.showError('Failed to capture photo. Please try again.');
      }
  }

  completeSession() {
      this.countdownEl.textContent = '🎉 Photo session complete!';
      this.captureButton.style.display = 'none';
      
      // Store all photos in sessionStorage for editor
      const sessionData = {
          photos: this.photos,
          layout: this.selectedLayout,
          email: this.userEmail,
          timestamp: new Date().toISOString(),
          totalShots: this.shotsTaken
      };
      
      try {
          sessionStorage.setItem('photoboothSession', JSON.stringify(sessionData));
          console.log('Photo session data stored successfully');
      } catch (error) {
          console.error('Failed to store session data:', error);
          this.showError('Failed to save photos. Please try again.');
          return;
      }
      
      // Enable next button
      if (this.nextBtn) {
          this.nextBtn.disabled = false;
          this.nextBtn.classList.remove('btn-success');
          this.nextBtn.classList.add('btn-primary');
      }
      
      this.showStatus(`All ${this.shotsTaken} photos captured! Click "Proceed to Editor" to create your photo strip.`);
      
      // Stop camera stream to save resources
      if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.video.style.display = 'none';
          document.getElementById('switch-camera-btn').style.display = 'none';
      }
  }

  proceedToEditor() {
      // Verify session data exists
      const sessionData = sessionStorage.getItem('photoboothSession');
      if (!sessionData) {
          this.showError('No photo data found. Please retake photos.');
          return;
      }
      
      // Navigate to editor
      try {
          window.location.href = 'editor.html';
      } catch (error) {
          console.error('Navigation error:', error);
          this.showError('Unable to proceed to editor. Please try again.');
      }
  }

  showCaptureFlash() {
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.top = '0';
      flash.style.left = '0';
      flash.style.width = '100%';
      flash.style.height = '100%';
      flash.style.backgroundColor = 'white';
      flash.style.opacity = '0.8';
      flash.style.zIndex = '9999';
      flash.style.pointerEvents = 'none';
      flash.style.transition = 'opacity 0.3s ease';
      
      document.body.appendChild(flash);
      
      setTimeout(() => {
          flash.style.opacity = '0';
          setTimeout(() => {
              if (document.body.contains(flash)) {
                  document.body.removeChild(flash);
              }
          }, 300);
      }, 100);
  }

  async switchCamera() {
      if (!this.isInitialized) return;

      try {
          // Stop current stream
          if (this.stream) {
              this.stream.getTracks().forEach(track => track.stop());
          }

          // Toggle between front and back camera
          const currentFacingMode = this.constraints.video.facingMode;
          this.constraints.video.facingMode = currentFacingMode === 'user' ? 'environment' : 'user';

          // Restart camera with new constraints
          await this.startCamera();
          this.showStatus(`Switched to ${this.constraints.video.facingMode === 'user' ? 'front' : 'back'} camera`);
          
      } catch (error) {
          console.error('Error switching camera:', error);
          this.showError('Unable to switch camera. This device may only have one camera.');
          
          // Revert to previous facing mode
          this.constraints.video.facingMode = this.constraints.video.facingMode === 'user' ? 'environment' : 'user';
      }
  }

  showStatus(message) {
      const statusElement = document.getElementById('status-message');
      if (statusElement) {
          statusElement.textContent = message;
          statusElement.className = 'alert alert-info mt-3';
          statusElement.style.display = 'block';
          
          // Auto-hide after 5 seconds
          setTimeout(() => {
              statusElement.style.display = 'none';
          }, 5000);
      }
      console.log('Status:', message);
  }

  showError(message) {
      const statusElement = document.getElementById('status-message');
      if (statusElement) {
          statusElement.textContent = message;
          statusElement.className = 'alert alert-danger mt-3';
          statusElement.style.display = 'block';
      } else {
          console.error('Error:', message);
          alert(message);
      }
  }

  // Method to get session data (useful for other components)
  getSessionData() {
      const stored = sessionStorage.getItem('photoboothSession');
      return stored ? JSON.parse(stored) : null;
  }

  // Clean up resources
  destroy() {
      if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
      }
      
      if (this.video) {
          this.video.srcObject = null;
      }
      
      this.isInitialized = false;
      console.log('Camera resources cleaned up');
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on camera page
  if (document.getElementById("countdown") && document.getElementById("photo-preview")) {
      window.photoboothCamera = new PhotoboothCamera();
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.photoboothCamera) {
      window.photoboothCamera.destroy();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhotoboothCamera;
}