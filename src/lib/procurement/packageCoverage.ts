/**
 * Phase 4A.3 — Package Coverage / Missing Attachment Recovery.
 *
 * A quote package may upload N attachments but only some reach `invoice_parts`
 * (OCR can fail silently). This helper records, per package, how many inputs
 * were received vs successfully parsed, and which attachments failed — so the
 * reviewer is told when the package total only covers part of the upload.
 *
 * Pure visibility: it NEVER changes total_amount, de-dupes, or retries OCR.
 */

export type PackageCoverageStatus =
  | 'complete'
  | 'partial'
  | 'duplicate_detected'
  | 'failed'
  | 'unknown';

export type FailedAttachment = {
  url: string;
  name?: string | null;
  error?: string | null;
};

export type DuplicateAttachment = {
  key: string;
  source_file_name?: string | null;
  document_number?: string | null;
  total_amount?: number | null;
  kept_index: number;
  dropped_index: number;
};

export type PackageCoverageSnapshot = {
  package_input_count: number;
  package_parsed_count: number;
  package_unique_count: number;
  package_failed_count: number;
  package_duplicate_count: number;
  coverage_status: PackageCoverageStatus;
  failed_attachments: FailedAttachment[];
  duplicate_attachments: DuplicateAttachment[];
};

/**
 * Classify package coverage. Order matters: an all-fail package is `failed`,
 * any failure is `partial`, duplicates surface only when nothing failed, and a
 * fully parsed, unique, failure-free package is `complete`.
 */
export function computeCoverageStatus(input: {
  inputCount: number;
  parsedCount: number;
  uniqueCount: number;
  failedCount: number;
  duplicateCount: number;
}): PackageCoverageStatus {
  const { inputCount, parsedCount, uniqueCount, failedCount, duplicateCount } = input;
  if (inputCount <= 0) return 'unknown';
  if (parsedCount === 0) return 'failed';
  if (failedCount > 0) return 'partial';
  if (duplicateCount > 0) return 'duplicate_detected';
  if (
    parsedCount === inputCount &&
    uniqueCount === parsedCount &&
    failedCount === 0 &&
    duplicateCount === 0
  ) {
    return 'complete';
  }
  return 'partial';
}

/**
 * Build a coverage snapshot from raw package counts. Phase 4A.3 keeps duplicate
 * detection minimal (uniqueCount defaults to parsedCount, no drops), reserving
 * the duplicate fields for a later phase.
 */
export function buildPackageCoverageSnapshot(input: {
  inputCount: number;
  parsedCount: number;
  failedAttachments?: FailedAttachment[];
  uniqueCount?: number;
  duplicateAttachments?: DuplicateAttachment[];
}): PackageCoverageSnapshot {
  const failed = input.failedAttachments ?? [];
  const duplicates = input.duplicateAttachments ?? [];
  const parsedCount = input.parsedCount;
  const uniqueCount = input.uniqueCount ?? parsedCount;
  const failedCount = failed.length;
  const duplicateCount = duplicates.length;

  return {
    package_input_count: input.inputCount,
    package_parsed_count: parsedCount,
    package_unique_count: uniqueCount,
    package_failed_count: failedCount,
    package_duplicate_count: duplicateCount,
    coverage_status: computeCoverageStatus({
      inputCount: input.inputCount,
      parsedCount,
      uniqueCount,
      failedCount,
      duplicateCount,
    }),
    failed_attachments: failed,
    duplicate_attachments: duplicates,
  };
}
