/**
 * Photo Upload UI Component for Resource Sharing
 * REQ-SHARE-001: Physical Items (Buy-Nothing) - Photo uploads for items
 *
 * Provides accessible, user-friendly photo upload interface
 * Works offline, on old phones, without requiring cloud services
 */

import { photoStorage, validatePhotos, compressImage, type PhotoMetadata } from './photo-upload';

/**
 * Create photo upload UI element
 * Returns a container with file input, preview, and controls
 */
export function createPhotoUploadUI(options: {
  resourceId?: string;
  maxPhotos?: number;
  onPhotosChanged?: (photoIds: string[]) => void;
  existingPhotos?: PhotoMetadata[];
}): HTMLElement {
  const {
    resourceId,
    maxPhotos = 5,
    onPhotosChanged,
    existingPhotos = [],
  } = options;

  const container = document.createElement('div');
  container.className = 'photo-upload-container';

  // State
  let currentPhotos: PhotoMetadata[] = [...existingPhotos];

  // Render function
  const render = () => {
    container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    header.className = 'photo-upload-header';
    header.innerHTML = `
      <h3>Photos</h3>
      <p class="photo-count">${currentPhotos.length} / ${maxPhotos}</p>
    `;
    container.appendChild(header);

    // Photo grid
    const grid = document.createElement('div');
    grid.className = 'photo-grid';

    // Show existing photos
    currentPhotos.forEach((photo, index) => {
      const photoCard = createPhotoCard(photo, index, async () => {
        // Remove photo
        await photoStorage.deletePhoto(photo.id);
        currentPhotos = currentPhotos.filter(p => p.id !== photo.id);
        render();
        notifyChange();
      });
      grid.appendChild(photoCard);
    });

    // Add upload button if not at max
    if (currentPhotos.length < maxPhotos) {
      const uploadCard = createUploadCard(async (files: FileList) => {
        try {
          // Validate photos
          const { valid, errors } = await validatePhotos(files);

          if (errors.length > 0) {
            showErrors(errors);
            return;
          }

          // Check if we'll exceed max photos
          const remaining = maxPhotos - currentPhotos.length;
          if (valid.length > remaining) {
            showErrors([`Can only add ${remaining} more photo(s)`]);
            return;
          }

          // Upload photos
          for (const file of valid) {
            try {
              // Compress if needed
              const processedFile = file.size > 1024 * 1024
                ? await compressImage(file)
                : file;

              // Store photo
              const tempResourceId = resourceId || 'temp-' + Date.now();
              const metadata = await photoStorage.storePhoto(tempResourceId, processedFile);
              currentPhotos.push(metadata);
            } catch (err) {
              showErrors([`Failed to upload ${file.name}: ${err instanceof Error ? err.message : 'Unknown error'}`]);
            }
          }

          render();
          notifyChange();
        } catch (err) {
          showErrors(['Failed to process photos']);
        }
      });
      grid.appendChild(uploadCard);
    }

    container.appendChild(grid);

    // Error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'photo-upload-errors';
    errorContainer.style.display = 'none';
    container.appendChild(errorContainer);
  };

  // Helper: Show errors
  const showErrors = (errors: string[]) => {
    const errorContainer = container.querySelector('.photo-upload-errors') as HTMLElement;
    if (!errorContainer) return;

    errorContainer.innerHTML = errors.map(err => `
      <div class="error-message">⚠️ ${err}</div>
    `).join('');
    errorContainer.style.display = 'block';

    // Hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  };

  // Helper: Notify parent of changes
  const notifyChange = () => {
    if (onPhotosChanged) {
      onPhotosChanged(currentPhotos.map(p => p.id));
    }
  };

  // Initial render
  render();

  return container;
}

/**
 * Create a photo card showing thumbnail and controls
 */
function createPhotoCard(
  photo: PhotoMetadata,
  index: number,
  onRemove: () => void
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'photo-card';
  card.setAttribute('role', 'article');
  card.setAttribute('aria-label', `Photo ${index + 1}: ${photo.filename}`);

  // Thumbnail
  const img = document.createElement('img');
  img.src = photo.thumbnail || '';
  img.alt = `Preview of ${photo.filename}`;
  img.className = 'photo-thumbnail';
  img.loading = 'lazy';

  // Controls
  const controls = document.createElement('div');
  controls.className = 'photo-controls';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'photo-remove-btn';
  removeBtn.textContent = '✕ Remove';
  removeBtn.setAttribute('aria-label', `Remove photo ${index + 1}`);
  removeBtn.onclick = () => {
    if (confirm('Remove this photo?')) {
      onRemove();
    }
  };

  controls.appendChild(removeBtn);

  card.appendChild(img);
  card.appendChild(controls);

  return card;
}

/**
 * Create upload card with file input
 */
function createUploadCard(onFilesSelected: (files: FileList) => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'photo-card photo-upload-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  // Hidden file input
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.className = 'photo-file-input';
  input.style.display = 'none';
  input.onchange = () => {
    if (input.files && input.files.length > 0) {
      onFilesSelected(input.files);
      input.value = ''; // Reset for next upload
    }
  };

  // Upload button content
  const content = document.createElement('div');
  content.className = 'upload-card-content';
  content.innerHTML = `
    <div class="upload-icon">📷</div>
    <div class="upload-text">Add Photo</div>
    <div class="upload-hint">Tap to select</div>
  `;

  // Click handler
  card.onclick = () => input.click();
  card.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  };

  card.appendChild(input);
  card.appendChild(content);

  return card;
}

/**
 * Create photo gallery for viewing resource photos
 */
export function createPhotoGallery(photos: PhotoMetadata[]): HTMLElement {
  const gallery = document.createElement('div');
  gallery.className = 'photo-gallery';

  if (photos.length === 0) {
    gallery.innerHTML = '<p class="no-photos">No photos available</p>';
    return gallery;
  }

  // Create gallery grid
  const grid = document.createElement('div');
  grid.className = 'photo-gallery-grid';

  photos.forEach((photo, index) => {
    const item = document.createElement('div');
    item.className = 'photo-gallery-item';
    item.onclick = () => openPhotoModal(photos, index);
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `View photo ${index + 1}`);

    const img = document.createElement('img');
    img.src = photo.thumbnail || '';
    img.alt = `Photo ${index + 1}`;
    img.className = 'gallery-thumbnail';
    img.loading = 'lazy';

    item.appendChild(img);
    grid.appendChild(item);
  });

  gallery.appendChild(grid);

  return gallery;
}

/**
 * Open photo in modal for full view
 */
async function openPhotoModal(photos: PhotoMetadata[], startIndex: number): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'photo-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-label', 'Photo viewer');

  let currentIndex = startIndex;

  const render = async () => {
    modal.innerHTML = '';

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'photo-modal-overlay';
    overlay.onclick = () => closeModal();

    // Content
    const content = document.createElement('div');
    content.className = 'photo-modal-content';
    content.onclick = (e) => e.stopPropagation();

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'photo-modal-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close photo viewer');
    closeBtn.onclick = () => closeModal();

    // Image
    const photo = photos[currentIndex];
    const storedPhoto = await photoStorage.getPhoto(photo.id);

    const img = document.createElement('img');
    if (storedPhoto) {
      img.src = photoStorage.createPhotoURL(storedPhoto);
    }
    img.alt = `Photo ${currentIndex + 1} of ${photos.length}`;
    img.className = 'photo-modal-image';

    // Navigation
    const nav = document.createElement('div');
    nav.className = 'photo-modal-nav';

    if (photos.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'photo-nav-btn photo-nav-prev';
      prevBtn.textContent = '‹';
      prevBtn.setAttribute('aria-label', 'Previous photo');
      prevBtn.disabled = currentIndex === 0;
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          render();
        }
      };

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'photo-nav-btn photo-nav-next';
      nextBtn.textContent = '›';
      nextBtn.setAttribute('aria-label', 'Next photo');
      nextBtn.disabled = currentIndex === photos.length - 1;
      nextBtn.onclick = () => {
        if (currentIndex < photos.length - 1) {
          currentIndex++;
          render();
        }
      };

      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
    }

    // Counter
    const counter = document.createElement('div');
    counter.className = 'photo-modal-counter';
    counter.textContent = `${currentIndex + 1} / ${photos.length}`;

    content.appendChild(closeBtn);
    content.appendChild(img);
    content.appendChild(nav);
    content.appendChild(counter);

    modal.appendChild(overlay);
    modal.appendChild(content);
  };

  const closeModal = () => {
    document.body.removeChild(modal);
    document.body.style.overflow = '';
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleKeyDown);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      currentIndex--;
      render();
    } else if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
      currentIndex++;
      render();
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  await render();
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
}
