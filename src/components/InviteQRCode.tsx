import { useCallback, useState } from 'react';
import QRCode from 'react-qr-code';
import QRCodeNode from 'qrcode';
import { Download } from 'lucide-react';

type InviteQRCodeProps = {
  /** Full URL or text to encode (e.g. `/join?code=` or `/join?invite=`). */
  value: string;
  /** Pixel size of the QR square. */
  size?: number;
  /** Short heading above the QR. */
  title?: string;
  /** Human-readable purpose (e.g. “Public code — property only”). */
  purpose?: string;
  /** Optional label line under title. */
  label?: string;
  /** Downloaded PNG filename (default: clearstrata-invite-qr.png). */
  downloadFileName?: string;
};

export function InviteQRCode({
  value,
  size = 220,
  title,
  purpose,
  label,
  downloadFileName = 'clearstrata-invite-qr.png',
}: InviteQRCodeProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadPng = useCallback(async () => {
    setDownloading(true);
    try {
      const dataUrl = await QRCodeNode.toDataURL(value, {
        width: 512,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = downloadFileName;
      a.rel = 'noopener';
      a.click();
    } finally {
      setDownloading(false);
    }
  }, [value, downloadFileName]);

  return (
    <div className="flex flex-col items-center gap-3">
      {(title || purpose || label) && (
        <div className="w-full text-center">
          {title ? <h3 className="text-base font-semibold text-gray-900">{title}</h3> : null}
          {label ? <p className="text-sm text-gray-700 mt-0.5">{label}</p> : null}
          {purpose ? <p className="text-xs text-gray-500 mt-1">{purpose}</p> : null}
        </div>
      )}
      <div className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
        <QRCode value={value} size={size} />
      </div>
      <p className="max-w-xs break-all text-center text-xs text-gray-600">{value}</p>
      <button
        type="button"
        disabled={downloading}
        onClick={() => void downloadPng()}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        <Download size={16} />
        {downloading ? '…' : 'PNG'}
      </button>
    </div>
  );
}
