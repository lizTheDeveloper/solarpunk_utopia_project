/**
 * Resource Browser - Browse available items in the community
 *
 * REQ-SHARE-001: Physical Items (Buy-Nothing)
 * Implements browsing and discovery of shared resources
 *
 * Following solarpunk values:
 * - No tracking or surveillance
 * - Offline-first
 * - Privacy-preserving (location shown at user-controlled precision)
 * - Accessibility-first design
 */

import type { Resource, ResourceType, ShareMode } from '../types';
import { LocalDatabase } from '../core/database';

export interface ResourceFilter {
  resourceType?: ResourceType;
  shareMode?: ShareMode;
  searchQuery?: string;
  availableOnly?: boolean;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
    maxDistance?: number; // in meters
  };
}

export interface ResourceSearchResult {
  resource: Resource;
  distance?: number; // in meters, if location provided
}

/**
 * Browse and search resources in the community
 */
export class ResourceBrowser {
  constructor(private db: LocalDatabase) {}

  /**
   * Browse available resources with filtering
   * REQ-SHARE-001: User searches for needed item
   */
  async browseResources(filter: ResourceFilter = {}): Promise<ResourceSearchResult[]> {
    const allResources = this.db.listResources();

    // Apply filters
    let filtered = allResources.filter(resource => {
      // Filter by availability if requested
      if (filter.availableOnly && !resource.available) {
        return false;
      }

      // Filter by resource type
      if (filter.resourceType && resource.resourceType !== filter.resourceType) {
        return false;
      }

      // Filter by share mode
      if (filter.shareMode && resource.shareMode !== filter.shareMode) {
        return false;
      }

      // Filter by search query (case-insensitive search in name, description, tags)
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesName = resource.name.toLowerCase().includes(query);
        const matchesDescription = resource.description.toLowerCase().includes(query);
        const matchesTags = resource.tags?.some(tag =>
          tag.toLowerCase().includes(query)
        ) || false;

        if (!matchesName && !matchesDescription && !matchesTags) {
          return false;
        }
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(filterTag =>
          resource.tags?.some(resourceTag =>
            resourceTag.toLowerCase() === filterTag.toLowerCase()
          )
        );
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });

    // Calculate distances if location provided
    const results: ResourceSearchResult[] = filtered.map(resource => {
      const result: ResourceSearchResult = { resource };

      // REQ-SHARE-011: Geographic Proximity
      // Calculate distance if both user location and resource location are available
      if (filter.location && resource.location) {
        const distance = this.calculateDistance(
          filter.location.latitude,
          filter.location.longitude,
          resource.location
        );

        result.distance = distance;
      }

      return result;
    });

    // Filter by maximum distance if specified
    const distanceFiltered = filter.location?.maxDistance
      ? results.filter(result =>
          result.distance === undefined || result.distance <= (filter.location!.maxDistance || Infinity)
        )
      : results;

    // REQ-SHARE-011: Prioritize resources based on geographic proximity
    // Sort by distance (closest first), then by most recently updated
    return distanceFiltered.sort((a, b) => {
      // If distances are available, sort by distance first
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }

      // If only one has distance, prioritize it
      if (a.distance !== undefined) return -1;
      if (b.distance !== undefined) return 1;

      // Otherwise sort by most recently updated
      return b.resource.updatedAt - a.resource.updatedAt;
    });
  }

  /**
   * Get a single resource by ID
   */
  async getResource(resourceId: string): Promise<Resource | undefined> {
    return this.db.getResource(resourceId);
  }

  /**
   * Search resources by text query
   * Convenience method for text-based search
   */
  async searchResources(query: string): Promise<ResourceSearchResult[]> {
    return this.browseResources({
      searchQuery: query,
      availableOnly: true
    });
  }

  /**
   * Get resources by type
   */
  async getResourcesByType(resourceType: ResourceType): Promise<Resource[]> {
    const results = await this.browseResources({
      resourceType,
      availableOnly: true
    });
    return results.map(r => r.resource);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * REQ-SHARE-011: Geographic Proximity
   *
   * @param lat1 Latitude of first point
   * @param lon1 Longitude of first point
   * @param location2 Location string or coordinates (format: "lat,lng" or object)
   * @returns Distance in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    location2: string
  ): number {
    // Parse location2 - expecting format "lat,lng"
    const parts = location2.split(',').map(s => s.trim());
    if (parts.length !== 2) {
      // If location format is invalid, treat as infinite distance
      return Infinity;
    }

    const lat2 = parseFloat(parts[0]);
    const lon2 = parseFloat(parts[1]);

    if (isNaN(lat2) || isNaN(lon2)) {
      return Infinity;
    }

    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Format distance for display
   * @param meters Distance in meters
   * @returns Human-readable distance string
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    } else if (meters < 10000) {
      return `${(meters / 1000).toFixed(1)}km`;
    } else {
      return `${Math.round(meters / 1000)}km`;
    }
  }

  /**
   * Get resources within walking distance (configurable, default 2km)
   * REQ-SHARE-011: Consider walkability
   */
  async getWalkableResources(
    latitude: number,
    longitude: number,
    maxWalkingDistance: number = 2000 // 2km default
  ): Promise<ResourceSearchResult[]> {
    return this.browseResources({
      location: {
        latitude,
        longitude,
        maxDistance: maxWalkingDistance
      },
      availableOnly: true
    });
  }
}
