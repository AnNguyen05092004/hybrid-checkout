/** Data rules of an import batch (BR-11, BR-16 in docs/02-use-case-user-stories.md). */
export const MIN_CUTOUTS = 8; // accepted cutouts per new SKU: top, bottom, 4 sides, 2 tilted
export const MIN_VAL_BOXES = 20; // boxes per new SKU in the real-image validation set
export const MIN_VAL_IMAGES = 50; // real tray images in the validation set of the batch
/** Cutouts below this mask quality are flagged for a closer look. */
export const CUTOUT_REVIEW_BELOW = 0.75;
