/**
 * Equipment Booking UI Components
 * REQ-SHARE-002: Tools and Equipment Access
 * REQ-SHARE-012: Resource Availability Calendars
 *
 * User interface for viewing and managing equipment bookings
 */

import { db } from '../core/database';
import type { Resource } from '../types';
import {
  getResourceAvailability,
  getBookingsByUser,
  getBookingsForMyResources,
  getUpcomingBookings,
  getActiveBookings,
  getPastBookings,
  getOverdueBookings,
  type EquipmentBooking,
  type TimeSlotAvailability,
} from './equipment-booking';
import { sanitizeUserContent, sanitizeAttribute, sanitizeUrl } from '../utils/sanitize';

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time for display
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Calculate duration in human-readable format
 */
function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const days = Math.floor(durationMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((durationMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0 && hours > 0) {
    return `${days}d ${hours}h`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return 'Less than 1 hour';
  }
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status: string): string {
  const badges = {
    pending: '<span class="badge badge-pending">⏳ Pending</span>',
    confirmed: '<span class="badge badge-confirmed">✓ Confirmed</span>',
    active: '<span class="badge badge-active">🔄 In Use</span>',
    completed: '<span class="badge badge-completed">✓ Completed</span>',
    cancelled: '<span class="badge badge-cancelled">✗ Cancelled</span>',
  };
  return badges[status as keyof typeof badges] || status;
}

/**
 * Render booking card
 */
export function renderBookingCard(booking: EquipmentBooking, currentUserId: string): string {
  const resource = db.getResource(booking.resourceId);
  if (!resource) {
    return '<div class="booking-card-error">Resource not found</div>';
  }

  const isMyBooking = booking.userId === currentUserId;
  const isOwner = resource.ownerId === currentUserId;
  const duration = formatDuration(booking.startTime, booking.endTime);
  const isOverdue = booking.status === 'active' && booking.endTime < Date.now();

  const overdueWarning = isOverdue
    ? '<div class="booking-overdue-warning">⚠️ This item is overdue for return</div>'
    : '';

  const actions = isMyBooking && booking.status === 'confirmed'
    ? `<div class="booking-actions">
        <button class="btn-edit-booking" data-booking-id="${sanitizeAttribute(booking.id)}">Edit</button>
        <button class="btn-cancel-booking" data-booking-id="${sanitizeAttribute(booking.id)}">Cancel</button>
      </div>`
    : isOwner && booking.status === 'confirmed'
    ? `<div class="booking-actions">
        <button class="btn-mark-active" data-booking-id="${sanitizeAttribute(booking.id)}">Mark Picked Up</button>
        <button class="btn-cancel-booking" data-booking-id="${sanitizeAttribute(booking.id)}">Cancel</button>
      </div>`
    : isOwner && booking.status === 'active'
    ? `<div class="booking-actions">
        <button class="btn-complete-booking" data-booking-id="${sanitizeAttribute(booking.id)}">Mark Returned</button>
      </div>`
    : '';

  const userInfo = isOwner
    ? `<p class="booking-user">Booked by: ${sanitizeUserContent(db.getUserProfile(booking.userId)?.displayName || 'Community Member')}</p>`
    : '';

  return `
    <div class="booking-card booking-status-${booking.status}${isOverdue ? ' booking-overdue' : ''}">
      <div class="booking-header">
        <h4 class="booking-resource-name">${sanitizeUserContent(resource.name)}</h4>
        ${getStatusBadge(booking.status)}
      </div>

      <div class="booking-details">
        <p class="booking-dates">
          📅 ${formatDate(booking.startTime)} - ${formatDate(booking.endTime)}
          <span class="booking-duration">(${duration})</span>
        </p>

        ${userInfo}

        ${booking.purpose ? `<p class="booking-purpose"><strong>Purpose:</strong> ${sanitizeUserContent(booking.purpose)}</p>` : ''}

        ${booking.pickupLocation ? `<p class="booking-pickup">📍 ${sanitizeUserContent(booking.pickupLocation)}</p>` : ''}

        ${booking.notes ? `<p class="booking-notes">${sanitizeUserContent(booking.notes)}</p>` : ''}
      </div>

      ${overdueWarning}
      ${actions}
    </div>
  `;
}

/**
 * Render resource availability calendar
 * REQ-SHARE-012: Resource Availability Calendars
 */
export function renderAvailabilityCalendar(resourceId: string, startDate?: number, days: number = 14): string {
  const start = startDate || Date.now();
  const end = start + (days * 24 * 60 * 60 * 1000);

  const resource = db.getResource(resourceId);
  if (!resource) {
    return '<div class="calendar-error">Resource not found</div>';
  }

  const availability = getResourceAvailability(resourceId, start, end, 24 * 60 * 60 * 1000); // 1-day slots

  const calendarDays = availability.map(slot => {
    const date = new Date(slot.startTime);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });

    const availabilityClass = slot.available ? 'available' : 'booked';
    const bookingInfo = slot.bookings.length > 0
      ? `<div class="day-bookings">${slot.bookings.length} booking${slot.bookings.length > 1 ? 's' : ''}</div>`
      : '';

    return `
      <div class="calendar-day ${availabilityClass}" data-timestamp="${slot.startTime}">
        <div class="day-header">
          <div class="day-name">${dayName}</div>
          <div class="day-number">${dayNum}</div>
          <div class="day-month">${month}</div>
        </div>
        <div class="day-status">
          ${slot.available ? '✓ Available' : '○ Booked'}
        </div>
        ${bookingInfo}
      </div>
    `;
  }).join('');

  return `
    <div class="availability-calendar">
      <div class="calendar-header">
        <h3>📅 Availability Calendar</h3>
        <p class="calendar-subtitle">${sanitizeUserContent(resource.name)}</p>
      </div>

      <div class="calendar-legend">
        <span class="legend-item">
          <span class="legend-indicator available"></span>
          Available
        </span>
        <span class="legend-item">
          <span class="legend-indicator booked"></span>
          Booked
        </span>
      </div>

      <div class="calendar-grid">
        ${calendarDays}
      </div>

      <div class="calendar-actions">
        <button class="btn-book-equipment" data-resource-id="${sanitizeAttribute(resourceId)}">
          Book This Equipment
        </button>
      </div>
    </div>
  `;
}

/**
 * Render booking form
 */
export function renderBookingForm(resourceId: string): string {
  const resource = db.getResource(resourceId);
  if (!resource) {
    return '<div class="form-error">Resource not found</div>';
  }

  const tomorrow = new Date(Date.now() + (24 * 60 * 60 * 1000));
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dayAfter = new Date(tomorrow.getTime() + (24 * 60 * 60 * 1000));
  const dayAfterStr = dayAfter.toISOString().split('T')[0];

  const maxBorrowInfo = (resource as any).toolMetadata?.maxBorrowDays
    ? `<p class="form-info">Maximum borrow period: ${(resource as any).toolMetadata.maxBorrowDays} days</p>`
    : '';

  return `
    <div class="booking-form">
      <h3>📅 Book: ${sanitizeUserContent(resource.name)}</h3>

      ${maxBorrowInfo}

      <form id="booking-form" data-resource-id="${sanitizeAttribute(resourceId)}">
        <div class="form-group">
          <label for="booking-start-date">Start Date</label>
          <input
            type="date"
            id="booking-start-date"
            name="startDate"
            min="${tomorrowStr}"
            value="${tomorrowStr}"
            required
          />
        </div>

        <div class="form-group">
          <label for="booking-end-date">End Date</label>
          <input
            type="date"
            id="booking-end-date"
            name="endDate"
            min="${tomorrowStr}"
            value="${dayAfterStr}"
            required
          />
        </div>

        <div class="form-group">
          <label for="booking-purpose">Purpose (Optional)</label>
          <input
            type="text"
            id="booking-purpose"
            name="purpose"
            placeholder="What will you use this for?"
            maxlength="200"
          />
        </div>

        <div class="form-group">
          <label for="booking-pickup">Pickup Location (Optional)</label>
          <input
            type="text"
            id="booking-pickup"
            name="pickupLocation"
            placeholder="Where will you pick this up?"
            maxlength="200"
          />
        </div>

        <div class="form-group">
          <label for="booking-notes">Additional Notes (Optional)</label>
          <textarea
            id="booking-notes"
            name="notes"
            rows="3"
            placeholder="Any other details..."
            maxlength="500"
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">Book Equipment</button>
          <button type="button" class="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Render user's bookings dashboard
 */
export function renderMyBookingsDashboard(userId: string): string {
  const upcoming = getUpcomingBookings(userId);
  const active = getActiveBookings(userId);
  const overdue = getOverdueBookings(userId);
  const past = getPastBookings(userId).slice(0, 5); // Last 5

  const overdueSection = overdue.length > 0
    ? `
      <div class="bookings-section overdue-section">
        <h3>⚠️ Overdue Returns (${overdue.length})</h3>
        <div class="bookings-list">
          ${overdue.map(b => renderBookingCard(b, userId)).join('')}
        </div>
      </div>
    `
    : '';

  const activeSection = active.length > 0
    ? `
      <div class="bookings-section active-section">
        <h3>🔄 Currently Borrowed (${active.length})</h3>
        <div class="bookings-list">
          ${active.map(b => renderBookingCard(b, userId)).join('')}
        </div>
      </div>
    `
    : '';

  const upcomingSection = upcoming.length > 0
    ? `
      <div class="bookings-section upcoming-section">
        <h3>📅 Upcoming Bookings (${upcoming.length})</h3>
        <div class="bookings-list">
          ${upcoming.map(b => renderBookingCard(b, userId)).join('')}
        </div>
      </div>
    `
    : '<div class="bookings-empty"><p>No upcoming bookings</p></div>';

  const pastSection = past.length > 0
    ? `
      <div class="bookings-section past-section">
        <h3>📜 Recent History</h3>
        <div class="bookings-list">
          ${past.map(b => renderBookingCard(b, userId)).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <div class="bookings-dashboard">
      <div class="dashboard-header">
        <h2>📅 My Equipment Bookings</h2>
      </div>

      <div class="dashboard-stats">
        <div class="stat">
          <span class="stat-value">${active.length}</span>
          <span class="stat-label">Active</span>
        </div>
        <div class="stat">
          <span class="stat-value">${upcoming.length}</span>
          <span class="stat-label">Upcoming</span>
        </div>
        <div class="stat ${overdue.length > 0 ? 'stat-warning' : ''}">
          <span class="stat-value">${overdue.length}</span>
          <span class="stat-label">Overdue</span>
        </div>
      </div>

      ${overdueSection}
      ${activeSection}
      ${upcomingSection}
      ${pastSection}
    </div>
  `;
}

/**
 * Render resource owner's booking management dashboard
 */
export function renderOwnerBookingsDashboard(ownerId: string): string {
  const bookings = getBookingsForMyResources(ownerId);

  const now = Date.now();
  const pending = bookings.filter(b => b.booking.status === 'confirmed' && b.booking.startTime > now);
  const activeBookings = bookings.filter(b => b.booking.status === 'active');
  const upcomingPickups = bookings.filter(b =>
    b.booking.status === 'confirmed' &&
    b.booking.startTime <= now + (24 * 60 * 60 * 1000) &&
    b.booking.startTime > now
  );

  if (bookings.length === 0) {
    return `
      <div class="owner-bookings-dashboard">
        <h2>📅 Booking Requests</h2>
        <div class="bookings-empty">
          <p>No bookings for your equipment yet</p>
        </div>
      </div>
    `;
  }

  const upcomingSection = upcomingPickups.length > 0
    ? `
      <div class="bookings-section urgent-section">
        <h3>🔔 Pickups Soon (${upcomingPickups.length})</h3>
        <p class="section-description">These items need pickup within 24 hours</p>
        <div class="bookings-list">
          ${upcomingPickups.map(b => renderBookingCard(b.booking, ownerId)).join('')}
        </div>
      </div>
    `
    : '';

  const activeSection = activeBookings.length > 0
    ? `
      <div class="bookings-section active-section">
        <h3>🔄 Currently Borrowed (${activeBookings.length})</h3>
        <div class="bookings-list">
          ${activeBookings.map(b => renderBookingCard(b.booking, ownerId)).join('')}
        </div>
      </div>
    `
    : '';

  const pendingSection = pending.length > 0
    ? `
      <div class="bookings-section pending-section">
        <h3>📋 Future Bookings (${pending.length})</h3>
        <div class="bookings-list">
          ${pending.map(b => renderBookingCard(b.booking, ownerId)).join('')}
        </div>
      </div>
    `
    : '';

  return `
    <div class="owner-bookings-dashboard">
      <div class="dashboard-header">
        <h2>📅 Equipment Booking Requests</h2>
      </div>

      <div class="dashboard-stats">
        <div class="stat">
          <span class="stat-value">${upcomingPickups.length}</span>
          <span class="stat-label">Pickups Soon</span>
        </div>
        <div class="stat">
          <span class="stat-value">${activeBookings.length}</span>
          <span class="stat-label">Out on Loan</span>
        </div>
        <div class="stat">
          <span class="stat-value">${pending.length}</span>
          <span class="stat-label">Future Bookings</span>
        </div>
      </div>

      ${upcomingSection}
      ${activeSection}
      ${pendingSection}
    </div>
  `;
}

/**
 * Render booking summary for tool card
 */
export function renderBookingSummary(resourceId: string): string {
  const availability = getResourceAvailability(resourceId, Date.now(), Date.now() + (7 * 24 * 60 * 60 * 1000));
  const availableDays = availability.filter(slot => slot.available).length;
  const totalDays = availability.length;

  if (availableDays === totalDays) {
    return '<p class="booking-summary">✓ Available now - no upcoming bookings</p>';
  } else if (availableDays === 0) {
    return '<p class="booking-summary">○ Fully booked for next 7 days</p>';
  } else {
    return `<p class="booking-summary">📅 ${availableDays}/${totalDays} days available this week</p>`;
  }
}
