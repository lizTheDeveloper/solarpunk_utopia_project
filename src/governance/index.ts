/**
 * Governance module exports
 *
 * REQ-GOV-019: Community Bulletin Board
 */

// Bulletin Board
export { BulletinBoard } from './bulletin-board';
export type { BulletinPostInput, BulletinBoardOptions } from './bulletin-board';

export {
  renderBulletinPost,
  renderComment,
  renderCommentThread,
  renderBulletinBoard,
  renderNewPostForm,
  renderRsvpForm,
  renderUpcomingEventsWidget,
  bulletinBoardStyles,
} from './bulletin-board-ui';

// Community Events
export { CommunityEventsManager } from './community-events';
export type { EventInput, EventCreateOptions } from './community-events';

export {
  renderEventCard,
  renderEventListItem,
  renderUpcomingEvents,
  renderTodaysEvents,
  renderWeekView,
  renderEventDetails,
  renderRsvpOptions,
  renderEventCreationForm,
  renderMyOrganizedEvents,
  renderMyAttendingEvents,
  renderEventsByType,
  renderSearchResults,
  renderGroupEvents,
} from './community-events-ui';
