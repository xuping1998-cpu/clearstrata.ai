/** RC-006 — shared interaction surfaces (hover / focus / press timing). */

export const INTERACTION_TRANSITION =
  'transition-[color,background-color,border-color,box-shadow,opacity] duration-150 motion-reduce:transition-none';

export const INTERACTION_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/40 focus-visible:ring-offset-2';

export const INTERACTION_LINK =
  `${INTERACTION_TRANSITION} ${INTERACTION_FOCUS_RING} hover:underline underline-offset-2`;

export const INTERACTION_CARD =
  `${INTERACTION_TRANSITION} hover:border-clearstrata-brand-200 hover:shadow-sm`;

export const INTERACTION_SELECTABLE =
  `${INTERACTION_TRANSITION} ${INTERACTION_FOCUS_RING} active:opacity-95`;

export const INTERACTION_TAB =
  `${INTERACTION_TRANSITION} ${INTERACTION_FOCUS_RING}`;
