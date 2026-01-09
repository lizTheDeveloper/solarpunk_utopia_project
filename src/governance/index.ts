/**
 * Governance module exports
 *
 * REQ-GOV-019: Community Bulletin Board
 */

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
