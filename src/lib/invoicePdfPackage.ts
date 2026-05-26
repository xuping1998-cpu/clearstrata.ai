/**
 * Legacy PDF package helpers — upload is now single-file archive only (see invoiceDirectUpload).
 */
export {
  uploadInvoiceDocumentDirect,
  isAllowedInvoiceUploadFile,
  isInvoiceFileOnlyArchive,
  invoiceListDisplayFileName,
  invoiceListDisplayAmount,
  invoiceListDisplayInvoiceNumber,
} from './invoiceDirectUpload';

/** @deprecated Package split removed; one PDF = one archived row. */
export type PayablePackageResult = {
  totalPages: number;
  recognizedInvoices: number;
  skippedPages: number;
  createdInvoiceIds: string[];
  skipped: [];
};

/** @deprecated Use uploadInvoiceDocumentDirect — no page counting. */
export async function getPdfPageCountFromFile(_file: File): Promise<number> {
  return 1;
}

/** @deprecated Use uploadInvoiceDocumentDirect — whole file, one record. */
export async function processPayablePdfPackage(opts: {
  file: File;
  propertyId: string;
  profileId: string;
  accountingYear: number;
  accountingMonth: number;
  langEn: boolean;
}): Promise<PayablePackageResult> {
  const { uploadInvoiceDocumentDirect } = await import('./invoiceDirectUpload');
  const { invoiceId } = await uploadInvoiceDocumentDirect({
    file: opts.file,
    profileId: opts.profileId,
    propertyId: opts.propertyId,
    accountingYear: opts.accountingYear,
    accountingMonth: opts.accountingMonth,
    langEn: opts.langEn,
  });
  return {
    totalPages: 1,
    recognizedInvoices: 1,
    skippedPages: 0,
    createdInvoiceIds: [invoiceId],
    skipped: [],
  };
}
