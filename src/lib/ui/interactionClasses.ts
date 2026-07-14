/** RC-006 interaction surfaces — motion timing from RC-008 motionClasses. */

import {
  MOTION_INTERACTIVE,
  MOTION_SELECTABLE,
  MOTION_TAB,
} from '@/lib/ui/motionClasses';

export const INTERACTION_TRANSITION = MOTION_INTERACTIVE;

export const INTERACTION_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40 focus-visible:ring-offset-2';

export const INTERACTION_LINK =
  `${INTERACTION_TRANSITION} ${INTERACTION_FOCUS_RING} hover:underline underline-offset-2`;

export const INTERACTION_CARD = INTERACTION_TRANSITION;

export const INTERACTION_SELECTABLE =
  `${MOTION_SELECTABLE} ${INTERACTION_FOCUS_RING}`;

export const INTERACTION_TAB =
  `${MOTION_TAB} ${INTERACTION_FOCUS_RING}`;
