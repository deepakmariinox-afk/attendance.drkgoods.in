// Gmail Workspace Integration & Email Notification Service for DRK Goods

export interface EmailNotificationConfig {
  adminEmail: string;
  enableAutoPunchEmails: boolean;
  enableDailySummaryEmails: boolean;
  lastSentSummaryDate?: string;
  autoSendViaClientOAuth?: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailNotificationConfig = {
  adminEmail: 'deepak.mariinox@gmail.com',
  enableAutoPunchEmails: true,
  enableDailySummaryEmails: true,
};

declare global {
  interface Window {
    google?: any;
  }
}

let tokenClient: any = null;
let googleAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Initializes and requests Google OAuth Access Token with gmail.send scope using Google Identity Services (GIS)
 */
export async function getGmailAccessToken(interactive = false): Promise<string | null> {
  // Check in-memory valid token
  if (googleAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return googleAccessToken;
  }

  // Check stored token in session/local storage
  const storedToken = sessionStorage.getItem('drk_gmail_oauth_token');
  const storedExpires = sessionStorage.getItem('drk_gmail_oauth_expires');
  if (storedToken && storedExpires && Date.now() < parseInt(storedExpires, 10) - 60000) {
    googleAccessToken = storedToken;
    tokenExpiresAt = parseInt(storedExpires, 10);
    return googleAccessToken;
  }

  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    console.warn('Google Identity Services (GSI) script not loaded yet.');
    return null;
  }

  // Fetch client configuration from backend
  let clientId = '';
  try {
    const res = await fetch('/api/auth/client-config');
    if (res.ok) {
      const data = await res.json();
      clientId = data.clientId || '';
    }
  } catch (err) {
    console.warn('Failed to fetch client config:', err);
  }

  if (!clientId) {
    // If no client ID configured in server, return null
    return null;
  }

  return new Promise((resolve) => {
    try {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/gmail.send',
        callback: (response: any) => {
          if (response.error !== undefined) {
            console.error('GIS token error:', response);
            resolve(null);
            return;
          }
          googleAccessToken = response.access_token;
          const expiresInMs = (parseInt(response.expires_in, 10) || 3600) * 1000;
          tokenExpiresAt = Date.now() + expiresInMs;
          sessionStorage.setItem('drk_gmail_oauth_token', response.access_token);
          sessionStorage.setItem('drk_gmail_oauth_expires', String(tokenExpiresAt));
          resolve(response.access_token);
        },
      });

      if (interactive) {
        tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        tokenClient.requestAccessToken({ prompt: '' });
      }
    } catch (e) {
      console.error('Failed to initTokenClient:', e);
      resolve(null);
    }
  });
}

/**
 * Creates RFC 2822 encoded MIME email string and base64url encodes it for Gmail API
 */
function createRawEmail(to: string, subject: string, htmlBody: string, fromName = 'DRK Goods Attendance System'): string {
  const boundary = `====_Boundary_${Date.now()}_====`;
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const emailLines = [
    `From: "${fromName}" <me>`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ];

  const rawMessage = emailLines.join('\r\n');
  // Base64URL encode
  const base64 = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return base64;
}

/**
 * Send email via Gmail API or Server Proxy
 */
export async function sendEmailNotification(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; message: string; method?: string }> {
  // First try direct client Gmail API if access token is available
  let token = googleAccessToken;
  if (!token) {
    token = await getGmailAccessToken(false);
  }

  if (token) {
    try {
      const raw = createRawEmail(to, subject, htmlBody);
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });

      if (res.ok) {
        return { success: true, message: 'Email sent directly via authorized Gmail API', method: 'gmail_api' };
      }
    } catch (err) {
      console.warn('Direct Gmail API attempt failed, trying backend notification channel:', err);
    }
  }

  // Fallback / Server-side mail proxy endpoint
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        to,
        subject,
        html: htmlBody,
        token,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, message: data.message || 'Notification dispatched to Admin email', method: data.method || 'server' };
    }
    return { success: false, message: data.message || 'Could not deliver email' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error while dispatching email notification' };
  }
}

/**
 * Formats a punch in/out event into an HTML email template
 */
export function buildPunchEmailHtml(params: {
  employeeName: string;
  phone: string;
  department: string;
  punchType: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  timestamp: string;
  locationName: string;
  address?: string;
  distanceMeters?: number;
  isWithinGeofence?: boolean;
  notes?: string;
  shiftName?: string;
  isLate?: boolean;
}): { subject: string; html: string } {
  const {
    employeeName,
    phone,
    department,
    punchType,
    timestamp,
    locationName,
    address,
    distanceMeters = 0,
    isWithinGeofence = true,
    notes,
    shiftName = 'General Shift',
    isLate = false,
  } = params;

  const dateObj = new Date(timestamp);
  const timeFormatted = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
  const dateFormatted = dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isPunchIn = punchType === 'check_in';
  const isPunchOut = punchType === 'check_out';

  const actionTitle = isPunchIn
    ? 'Staff PUNCH IN Alert'
    : isPunchOut
    ? 'Staff PUNCH OUT Alert'
    : punchType === 'break_start'
    ? 'Staff Break Started'
    : 'Staff Break Ended';

  const statusBadgeColor = isPunchIn
    ? isLate
      ? '#ea580c'
      : '#16a34a'
    : isPunchOut
    ? '#2563eb'
    : '#ca8a04';

  const statusText = isPunchIn
    ? isLate
      ? 'CHECKED IN (LATE)'
      : 'CHECKED IN (ON TIME)'
    : isPunchOut
    ? 'CHECKED OUT (COMPLETED)'
    : punchType === 'break_start'
    ? 'ON BREAK'
    : 'BACK FROM BREAK';

  const subject = `[DRK Attendance] ${actionTitle}: ${employeeName} - ${timeFormatted} (${dateFormatted})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 24px; text-align: left; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: #ffffff; background: ${statusBadgeColor}; margin-bottom: 20px; }
    .card { background: #f1f5f9; border-radius: 12px; padding: 18px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .val { color: #0f172a; font-weight: 700; text-align: right; }
    .geo-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #065f46; margin-bottom: 20px; }
    .footer { background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>DRK Goods Enterprise</h1>
      <p>Automated Workforce Attendance & Audit System</p>
    </div>
    <div class="content">
      <span class="badge">${statusText}</span>
      <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #0f172a;">${actionTitle}</h2>

      <div class="card">
        <div class="row">
          <span class="label">Staff Member</span>
          <span class="val">${employeeName}</span>
        </div>
        <div class="row">
          <span class="label">Contact Phone</span>
          <span class="val">${phone}</span>
        </div>
        <div class="row">
          <span class="label">Department</span>
          <span class="val">${department}</span>
        </div>
        <div class="row">
          <span class="label">Assigned Shift</span>
          <span class="val">${shiftName}</span>
        </div>
        <div class="row">
          <span class="label">Punch Time</span>
          <span class="val" style="color: ${statusBadgeColor};">${timeFormatted}</span>
        </div>
        <div class="row">
          <span class="label">Punch Date</span>
          <span class="val">${dateFormatted}</span>
        </div>
      </div>

      <div class="geo-box">
        <strong>📍 Location & GPS Verification:</strong><br/>
        <span>Worksite: <strong>${locationName}</strong></span><br/>
        ${address ? `<span>Address: ${address}</span><br/>` : ''}
        <span>Geofence Status: ${isWithinGeofence ? '✅ Verified Inside Authorized Office Perimeter' : '⚠️ Remote / Field Location'} (${Math.round(distanceMeters)}m)</span>
        ${notes ? `<br/><span>Notes: ${notes}</span>` : ''}
      </div>

      <p style="font-size: 12px; color: #64748b; margin: 0;">
        This is an automatic notification generated directly upon staff punch registration in DRK Goods Workforce System.
      </p>
    </div>
    <div class="footer">
      DRK Goods • Automated GPS Attendance & Payroll Gateway • Admin: deepak.mariinox@gmail.com
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Builds daily attendance summary report email
 */
export function buildDailySummaryEmailHtml(params: {
  dateStr: string;
  totalStaff: number;
  presentStaff: number;
  lateStaff: number;
  absentStaff: number;
  records: Array<{
    name: string;
    phone: string;
    dept: string;
    checkIn?: string;
    checkOut?: string;
    hoursWorked?: string;
    status: string;
  }>;
}): { subject: string; html: string } {
  const { dateStr, totalStaff, presentStaff, lateStaff, absentStaff, records } = params;

  const subject = `[DRK Attendance] Daily Staff Attendance Summary Report - ${dateStr}`;

  const rowsHtml = records
    .map(
      (r, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0; font-size: 12px;">
      <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${r.name}</td>
      <td style="padding: 10px 12px; color: #64748b;">${r.dept}</td>
      <td style="padding: 10px 12px; color: #16a34a; font-weight: 600;">${r.checkIn || '-'}</td>
      <td style="padding: 10px 12px; color: #2563eb; font-weight: 600;">${r.checkOut || '-'}</td>
      <td style="padding: 10px 12px; color: #0f172a; font-weight: 700;">${r.hoursWorked || '0h'}</td>
      <td style="padding: 10px 12px;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; color: #ffffff; background-color: ${
          r.status === 'present' ? '#16a34a' : r.status === 'late' ? '#ea580c' : '#dc2626'
        };">
          ${r.status.toUpperCase()}
        </span>
      </td>
    </tr>
  `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
    .header { background: #0f172a; color: #ffffff; padding: 24px; }
    .metrics { display: flex; gap: 12px; padding: 20px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
    .metric-box { flex: 1; background: #ffffff; border-radius: 10px; padding: 12px; text-align: center; border: 1px solid #e2e8f0; }
    .metric-val { font-size: 20px; font-weight: 800; }
    .metric-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f8fafc; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
    .footer { background: #f8fafc; padding: 16px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">DRK Goods - Daily Staff Attendance Report</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Report Date: <strong>${dateStr}</strong></p>
    </div>

    <div class="metrics">
      <div class="metric-box">
        <div class="metric-val" style="color: #0f172a;">${totalStaff}</div>
        <div class="metric-lbl">Total Staff</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #16a34a;">${presentStaff}</div>
        <div class="metric-lbl">Present</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #ea580c;">${lateStaff}</div>
        <div class="metric-lbl">Late</div>
      </div>
      <div class="metric-box">
        <div class="metric-val" style="color: #dc2626;">${absentStaff}</div>
        <div class="metric-lbl">Absent</div>
      </div>
    </div>

    <div style="padding: 20px; overflow-x: auto;">
      <table>
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Dept</th>
            <th>Check In</th>
            <th>Check Out</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>

    <div class="footer">
      Delivered automatically to Admin (deepak.mariinox@gmail.com) • DRK Goods Workforce System
    </div>
  </div>
</body>
</html>
  `;

  return { subject, html };
}
