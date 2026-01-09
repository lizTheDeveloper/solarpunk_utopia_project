/**
 * Photo Upload Integration Example
 * REQ-SHARE-001: Physical Items (Buy-Nothing) - Photo uploads for items
 *
 * Demonstrates how to integrate photo uploads with resource sharing
 */

import { db } from '../core/database';
import { photoStorage } from './photo-upload';
import { createPhotoUploadUI, createPhotoGallery } from './photo-upload-ui';
import type { Resource } from '../types';

/**
 * Example 1: Create resource form with photo upload
 */
export async function createResourceFormWithPhotos(): Promise<HTMLElement> {
  const form = document.createElement('form');
  form.className = 'resource-form';

  form.innerHTML = `
    <h2>Share an Item</h2>

    <div class="form-group">
      <label for="name">Item Name *</label>
      <input type="text" id="name" name="name" required />
    </div>

    <div class="form-group">
      <label for="description">Description *</label>
      <textarea id="description" name="description" required></textarea>
    </div>

    <div class="form-group">
      <label for="resourceType">Type *</label>
      <select id="resourceType" name="resourceType" required>
        <option value="tool">Tool</option>
        <option value="equipment">Equipment</option>
        <option value="space">Space</option>
        <option value="food">Food</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="shareMode">Share Mode *</label>
      <select id="shareMode" name="shareMode" required>
        <option value="give">Give Away</option>
        <option value="lend">Lend</option>
        <option value="share">Share</option>
      </select>
    </div>

    <div class="form-group">
      <label for="location">Location (optional)</label>
      <input type="text" id="location" name="location" />
    </div>

    <div class="form-group">
      <label>Photos (optional)</label>
      <div id="photo-upload"></div>
    </div>

    <button type="submit" class="btn-primary">Share Item</button>
  `;

  // Track uploaded photo IDs
  let photoIds: string[] = [];

  // Add photo upload component
  const photoUploadContainer = form.querySelector('#photo-upload');
  if (photoUploadContainer) {
    const photoUploadUI = createPhotoUploadUI({
      maxPhotos: 5,
      onPhotosChanged: (ids) => {
        photoIds = ids;
      }
    });
    photoUploadContainer.appendChild(photoUploadUI);
  }

  // Handle form submission
  form.onsubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const userId = 'current-user'; // In real app, get from auth

    try {
      // Create resource
      const resource = await db.addResource({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        resourceType: formData.get('resourceType') as any,
        shareMode: formData.get('shareMode') as any,
        available: true,
        ownerId: userId,
        location: formData.get('location') as string || undefined,
        photos: photoIds.length > 0 ? photoIds : undefined,
        tags: [],
      });

      // Update photos with correct resource ID (if they were uploaded before resource was created)
      if (photoIds.length > 0) {
        for (const photoId of photoIds) {
          const photo = await photoStorage.getPhoto(photoId);
          if (photo && photo.metadata.resourceId.startsWith('temp-')) {
            // Update the resource ID in metadata
            // (In a real implementation, you'd update the metadata)
            console.log('Photo uploaded successfully:', photoId);
          }
        }
      }

      alert('Item shared successfully! 🌻');
      form.reset();
      photoIds = [];

    } catch (error) {
      console.error('Failed to share item:', error);
      alert('Failed to share item. Please try again.');
    }
  };

  return form;
}

/**
 * Example 2: Display resource with photos
 */
export async function displayResourceWithPhotos(resourceId: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'resource-detail';

  // Load resource
  const resource = db.getResource(resourceId);

  if (!resource) {
    container.innerHTML = '<p>Resource not found</p>';
    return container;
  }

  // Create resource display
  const header = document.createElement('div');
  header.className = 'resource-header';
  header.innerHTML = `
    <h2>${resource.name}</h2>
    <div class="resource-meta">
      <span class="badge">${resource.resourceType}</span>
      <span class="badge">${resource.shareMode}</span>
      <span class="badge ${resource.available ? 'available' : 'unavailable'}">
        ${resource.available ? 'Available' : 'Claimed'}
      </span>
    </div>
  `;

  const description = document.createElement('div');
  description.className = 'resource-description';
  description.innerHTML = `
    <p>${resource.description}</p>
    ${resource.location ? `<p><strong>Location:</strong> ${resource.location}</p>` : ''}
  `;

  container.appendChild(header);

  // Add photo gallery if photos exist
  if (resource.photos && resource.photos.length > 0) {
    const photosSection = document.createElement('div');
    photosSection.className = 'resource-photos';

    try {
      // Load photo metadata
      const photoMetadata = [];
      for (const photoId of resource.photos) {
        const photo = await photoStorage.getPhoto(photoId);
        if (photo) {
          photoMetadata.push(photo.metadata);
        }
      }

      if (photoMetadata.length > 0) {
        const gallery = createPhotoGallery(photoMetadata);
        photosSection.appendChild(gallery);
        container.appendChild(photosSection);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    }
  }

  container.appendChild(description);

  // Add action buttons
  const actions = document.createElement('div');
  actions.className = 'resource-actions';

  if (resource.available) {
    const requestBtn = document.createElement('button');
    requestBtn.className = 'btn-primary';
    requestBtn.textContent = 'Request This Item';
    requestBtn.onclick = () => {
      // Handle request
      alert('Request functionality would go here');
    };
    actions.appendChild(requestBtn);
  }

  container.appendChild(actions);

  return container;
}

/**
 * Example 3: Edit resource photos
 */
export async function editResourcePhotos(resourceId: string): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'edit-photos-container';

  const resource = db.getResource(resourceId);
  if (!resource) {
    container.innerHTML = '<p>Resource not found</p>';
    return container;
  }

  container.innerHTML = `
    <h3>Edit Photos for: ${resource.name}</h3>
  `;

  // Load existing photos
  const existingPhotoMetadata = [];
  if (resource.photos) {
    for (const photoId of resource.photos) {
      const photo = await photoStorage.getPhoto(photoId);
      if (photo) {
        existingPhotoMetadata.push(photo.metadata);
      }
    }
  }

  // Create photo upload UI with existing photos
  const photoUploadUI = createPhotoUploadUI({
    resourceId,
    maxPhotos: 5,
    existingPhotos: existingPhotoMetadata,
    onPhotosChanged: async (photoIds) => {
      // Update resource with new photo IDs
      await db.updateResource(resourceId, {
        photos: photoIds.length > 0 ? photoIds : undefined
      });
      console.log('Photos updated for resource:', resourceId);
    }
  });

  container.appendChild(photoUploadUI);

  // Add save button
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.textContent = 'Done';
  saveBtn.onclick = () => {
    alert('Photos saved! 🌻');
  };

  container.appendChild(saveBtn);

  return container;
}

/**
 * Example 4: Browse resources with photo thumbnails
 */
export async function browseResourcesWithPhotos(): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.className = 'resource-browser';

  container.innerHTML = `<h2>Available Items</h2>`;

  const grid = document.createElement('div');
  grid.className = 'resource-grid';

  // Load all resources
  const resources = db.listResources().filter(r => r.available);

  for (const resource of resources) {
    const card = await createResourceCard(resource);
    grid.appendChild(card);
  }

  container.appendChild(grid);

  return container;
}

/**
 * Helper: Create resource card with photo thumbnail
 */
async function createResourceCard(resource: Resource): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.className = 'resource-card';
  card.onclick = () => {
    // Navigate to resource detail
    console.log('View resource:', resource.id);
  };

  // Add photo thumbnail if available
  if (resource.photos && resource.photos.length > 0) {
    const photo = await photoStorage.getPhoto(resource.photos[0]);
    if (photo && photo.metadata.thumbnail) {
      const img = document.createElement('img');
      img.src = photo.metadata.thumbnail;
      img.alt = resource.name;
      img.className = 'card-thumbnail';
      card.appendChild(img);
    }
  } else {
    // Placeholder if no photo
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    placeholder.textContent = '📦';
    card.appendChild(placeholder);
  }

  // Card content
  const content = document.createElement('div');
  content.className = 'card-content';
  content.innerHTML = `
    <h3>${resource.name}</h3>
    <p class="card-description">${resource.description.substring(0, 80)}${resource.description.length > 80 ? '...' : ''}</p>
    <div class="card-meta">
      <span class="badge">${resource.resourceType}</span>
      <span class="badge">${resource.shareMode}</span>
    </div>
  `;

  card.appendChild(content);

  return card;
}

/**
 * Example 5: Cleanup photos when deleting a resource
 */
export async function deleteResourceWithPhotos(resourceId: string): Promise<void> {
  const resource = db.getResource(resourceId);

  if (!resource) {
    throw new Error('Resource not found');
  }

  // Delete associated photos first
  if (resource.photos && resource.photos.length > 0) {
    for (const photoId of resource.photos) {
      await photoStorage.deletePhoto(photoId);
    }
    console.log(`Deleted ${resource.photos.length} photos for resource ${resourceId}`);
  }

  // Delete resource
  await db.deleteResource(resourceId);

  console.log(`Resource ${resourceId} and its photos deleted successfully`);
}

/**
 * Example 6: Check storage usage and cleanup if needed
 */
export async function managePhotoStorage(): Promise<void> {
  const storageInfo = await photoStorage.getStorageInfo();

  console.log(`Photo Storage Stats:
    - Total Photos: ${storageInfo.photoCount}
    - Total Size: ${(storageInfo.totalSize / 1024 / 1024).toFixed(2)} MB
  `);

  // If storage is getting full (>50MB), suggest cleanup
  if (storageInfo.totalSize > 50 * 1024 * 1024) {
    console.warn('Photo storage is getting full. Consider removing old photos.');

    // Find resources with photos that have been unavailable for a long time
    const allResources = db.listResources();
    const oldUnavailableResources = allResources.filter(r =>
      !r.available &&
      r.photos &&
      r.photos.length > 0 &&
      Date.now() - r.updatedAt > 30 * 24 * 60 * 60 * 1000 // 30 days
    );

    console.log(`Found ${oldUnavailableResources.length} old unavailable resources with photos`);

    // Could offer to delete these photos
    for (const resource of oldUnavailableResources) {
      console.log(`- ${resource.name} (${resource.photos?.length} photos)`);
    }
  }
}
