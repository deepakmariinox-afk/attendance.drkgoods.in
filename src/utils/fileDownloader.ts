/**
 * Universal Robust File Downloader Utility
 * Supports cross-browser file downloads in iframes, standalone tabs, and mobile browsers.
 */

export function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    // 1. Check for msSaveOrOpenBlob (legacy Edge / IE)
    if ((window.navigator as any).msSaveOrOpenBlob) {
      (window.navigator as any).msSaveOrOpenBlob(blob, filename);
      return true;
    }

    // 2. Standard Blob Object URL with delay before revocation
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';

    // Must be in DOM for Firefox and some Chrome versions
    document.body.appendChild(anchor);

    // Trigger click event
    if (typeof anchor.click === 'function') {
      anchor.click();
    } else {
      const evt = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      anchor.dispatchEvent(evt);
    }

    // Delay cleanup to ensure browser process captures the stream
    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
        window.URL.revokeObjectURL(url);
      } catch {
        // cleanup error ignored
      }
    }, 60000);

    return true;
  } catch (err) {
    console.warn('Standard blob download failed, trying FileReader data URI fallback:', err);
    try {
      // 3. Fallback to Data URI via FileReader
      const reader = new FileReader();
      reader.onload = function () {
        const dataUrl = reader.result as string;
        const fallbackAnchor = document.createElement('a');
        fallbackAnchor.href = dataUrl;
        fallbackAnchor.download = filename;
        fallbackAnchor.style.display = 'none';
        document.body.appendChild(fallbackAnchor);
        fallbackAnchor.click();
        setTimeout(() => {
          if (fallbackAnchor.parentNode) {
            fallbackAnchor.parentNode.removeChild(fallbackAnchor);
          }
        }, 10000);
      };
      reader.readAsDataURL(blob);
      return true;
    } catch (fallbackErr) {
      console.error('All download mechanisms failed:', fallbackErr);
      return false;
    }
  }
}

/**
 * Downloads a binary ArrayBuffer or Uint8Array as a file
 */
export function downloadArrayBuffer(
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
  mimeType: string
): boolean {
  const blob = new Blob([buffer], { type: mimeType });
  return downloadBlob(blob, filename);
}

/**
 * Generates and downloads a standalone offline HTML Launcher file
 */
export function downloadStandaloneHtmlLauncher(appUrl: string, appName: string = 'DRK Goods Enterprise') {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${appName} - Attendance & Payroll</title>
  <meta name="theme-color" content="#0f172a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 24px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .logo-badge { width: 64px; height: 64px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.4); border-radius: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 14px; border-radius: 16px; border: none; cursor: pointer; transition: all 0.2s; }
    .btn:hover { background: #1d4ed8; }
    .footer-note { font-size: 11px; color: #64748b; margin-top: 16px; }
  </style>
  <script>
    // Automatic direct redirect on launch
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "${appUrl}";
      }, 1000);
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="logo-badge">🏢</div>
    <h1>${appName}</h1>
    <p>GPS-Verified Workforce Attendance, Biometric Security & Payroll Disbursement Portal</p>
    <a href="${appUrl}" class="btn" target="_self">
      🚀 Launch DRK Goods Portal
    </a>
    <div class="footer-note">
      Opening enterprise application... If not redirected automatically, tap the launch button above.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  return downloadBlob(blob, 'DRK_Goods_Enterprise_App.html');
}
