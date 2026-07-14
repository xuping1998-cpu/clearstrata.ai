/**
 * RC-008 — canonical motion class strings for Project One governance surfaces.
 * Use these instead of arbitrary duration-* values on pilot components.
 */

const REDUCE_TRANSITION = 'motion-reduce:transition-none';
const REDUCE_ANIMATE = 'motion-reduce:animate-none';

/** Spinner for inline loading actions */
export const MOTION_SPINNER = `animate-spin ${REDUCE_ANIMATE}`;

/** Buttons, links, chips, tabs — hover/press color transitions */
export const MOTION_INTERACTIVE = [
  'transition-[color,background-color,border-color,opacity,box-shadow]',
  'duration-motion-fast',
  'ease-motion-enter',
  REDUCE_TRANSITION,
].join(' ');

/** Selectable pipeline cards and filter chips */
export const MOTION_SELECTABLE = `${MOTION_INTERACTIVE} active:opacity-95`;

/** Tab list triggers */
export const MOTION_TAB = MOTION_INTERACTIVE;

/** Tab panel content — subtle opacity only */
export const MOTION_TAB_PANEL = [
  'transition-opacity',
  'duration-motion-standard',
  'ease-motion-enter',
  REDUCE_TRANSITION,
].join(' ');

/** Accordion / expand chevron — pair with `group` on `<details>` */
export const MOTION_ACCORDION_ICON = [
  'transition-transform',
  'duration-motion-fast',
  'ease-motion-move',
  'group-open:rotate-180',
  REDUCE_TRANSITION,
].join(' ');

/** Toast enter/exit */
export const MOTION_FEEDBACK = [
  'transition-opacity',
  'duration-motion-feedback',
  'ease-motion-enter',
  REDUCE_TRANSITION,
].join(' ');

/** Panels, dialogs, expandable regions */
export const MOTION_PANEL = [
  'transition-opacity',
  'duration-motion-panel',
  'ease-motion-enter',
  REDUCE_TRANSITION,
].join(' ');

/** Lifecycle stage pills and progress segments */
export const MOTION_PROGRESS = [
  'transition-colors',
  'duration-motion-progress',
  'ease-motion-move',
  REDUCE_TRANSITION,
].join(' ');

/** Skeleton pulse — quiet, reduced-motion static */
export const MOTION_SKELETON_PULSE = `animate-pulse ${REDUCE_ANIMATE}`;

/** Native dialog + backdrop */
export const MOTION_DIALOG = [
  'transition-opacity',
  'duration-motion-panel',
  'ease-motion-enter',
  'backdrop:transition-opacity',
  'backdrop:duration-motion-fast',
  'backdrop:ease-motion-enter',
  REDUCE_TRANSITION,
  'motion-reduce:backdrop:transition-none',
].join(' ');
