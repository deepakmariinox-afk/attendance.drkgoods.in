import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Share2,
  Check,
  Copy,
  QrCode,
  Laptop,
  CheckCircle2,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
  Send,
  MessageSquare,
  FileCode,
  Globe,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadStandaloneHtmlLauncher } from '../utils/fileDownloader';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const { showNotification } = useApp();
  const [copied, setCopied] = useState<boolean>(false);
  const [platformTab, setPlatformTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalling, setIsInstalling] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running in standalone PWA mode
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const appUrl = window.location.href.split('?')[0];

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showNotification('success', 'DRK Goods App installed successfully on your device!');
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
      setIsInstalling(false);
    } else {
      // In iframes or browsers without deferredPrompt, open the standalone URL directly
      window.open(appUrl, '_blank');
      showNotification(
        'info',
        'Opened DRK Goods in a full browser tab. Tap the browser menu (⋮ or Share) and select "Install app" / "Add to Home screen"!'
      );
    }
  };

  const handleOpenInNewTab = () => {
    window.open(appUrl, '_blank');
    showNotification('success', 'Opening DRK Goods Portal in a dedicated browser window...');
  };

  const handleDownloadOfflineLauncher = () => {
    downloadStandaloneHtmlLauncher(appUrl, 'DRK Goods Enterprise');
    showNotification(
      'success',
      'Downloaded standalone "DRK_Goods_Enterprise_App.html". Open or save it to your phone/PC for instant access!'
    );
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl).then(() => {
      setCopied(true);
      showNotification('success', 'Mobile App link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const shareText = `🚀 Access DRK Goods Mobile Workforce & Attendance Portal: ${appUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;

  // Quick dynamic QR SVG using public QR API image with reliable fallback
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    appUrl
  )}&bgcolor=ffffff&color=0f172a&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Download & Install DRK Goods App
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PWA & Mobile Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Install as a native standalone app on Android, iPhone/iPad, or PC for fast 1-tap attendance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-app-download"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Admin Pre-Registration Authorization Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Enterprise Access Policy:</span> Only candidates & staff whose details are pre-registered in the system by <strong>Administrator Deepak Yadav (9971336707)</strong> are authorized to access the system upon mobile OTP/PIN verification.
            </div>
          </div>

          {/* Status or Direct Install Banner */}
          {isStandalone ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">App is Installed & Active</h4>
                <p className="text-xs text-emerald-700">
                  You are currently running the DRK Goods Standalone App with full GPS & offline features.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col gap-4 shadow-xl border border-blue-800/60">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-500/30 text-blue-300">
                      <Zap className="w-4 h-4" />
                    </span>
                    <h4 className="font-bold text-sm tracking-tight text-white">
                      Install on Mobile Device or PC
                    </h4>
                  </div>
                  <p className="text-xs text-blue-200/90 max-w-md">
                    Open in a full browser tab to trigger 1-tap installation or download the offline launcher file directly.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    id="btn-open-app-new-tab"
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Full Tab</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    id="btn-trigger-pwa-install"
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
                  </button>
                </div>
              </div>

              {/* Direct Offline Launcher Download & Share Actions */}
              <div className="pt-3 border-t border-blue-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-blue-300 text-[11px]">Instant Download & Share options:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadOfflineLauncher}
                    id="btn-download-offline-launcher"
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    title="Download offline HTML launcher package"
                  >
                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download App File (.html)</span>
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition"
                    title="Send link to staff or mobile via WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={smsUrl}
                    className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition"
                    title="Send link to mobile via SMS"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>SMS</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Quick QR Code & Link Sharing Box */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center gap-5">
            {/* QR Code Container */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs shrink-0 flex flex-col items-center">
              <img
                src={qrApiUrl}
                alt="DRK Goods App QR Code"
                className="w-32 h-32 object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <QrCode className="w-3 h-3 text-blue-600" />
                <span>Scan with Phone Camera</span>
              </div>
            </div>

            {/* Link & Details */}
            <div className="space-y-3 flex-1 text-center md:text-left">
              <div>
                <h5 className="font-bold text-slate-900 text-sm">Direct Mobile Access Link</h5>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan the QR code with your phone camera or copy the secure link below to open directly in Chrome or Safari.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={appUrl}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 outline-none select-all"
                  id="input-app-install-url"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  id="btn-copy-app-url"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Platform Step-by-Step Instructions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Installation Instructions by Device
              </h5>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 gap-2">
              <button
                type="button"
                onClick={() => setPlatformTab('android')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                  platformTab === 'android'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android (Chrome/Edge)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatformTab('ios')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                  platformTab === 'ios'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad (iOS Safari)</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatformTab('desktop')}
                className={`pb-2.5 px-3 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                  platformTab === 'desktop'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>PC / Mac / Chrome</span>
              </button>
            </div>

            {/* Tab 1: Android */}
            {platformTab === 'android' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                <ol className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span>
                      Open this URL in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> on your Android device (or click <strong>"Open in Full Tab"</strong> above).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span>
                      Tap the <strong>three dots (⋮) menu</strong> in the top-right corner of Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <span>
                      Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      ✓
                    </span>
                    <span>
                      The <strong>DRK Goods</strong> app icon will appear on your phone home screen just like a regular Google Play Store app!
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 2: iOS */}
            {platformTab === 'ios' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                <ol className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span>
                      Open this URL in <strong>Safari</strong> on your iPhone or iPad.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span>
                      Tap the <strong>Share button</strong> <Share2 className="w-3.5 h-3.5 inline text-blue-600" /> (the square with an arrow pointing up at the bottom).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <span>
                      Scroll down and tap <strong>"Add to Home Screen"</strong> (with the <strong>[+]</strong> icon).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      ✓
                    </span>
                    <span>
                      Tap <strong>Add</strong> in the top right. The app will launch in full-screen standalone mode without Safari browser bars!
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Tab 3: Desktop */}
            {platformTab === 'desktop' && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
                <ol className="space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <span>
                      In <strong>Google Chrome</strong> or <strong>Edge</strong> on your computer, click <strong>"Open in Full Tab"</strong> or open this URL.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <span>
                      Click the <strong>Install App icon</strong> (small computer screen with down arrow <Download className="w-3.5 h-3.5 inline text-blue-600" />) in the address bar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                      ✓
                    </span>
                    <span>
                      Click <strong>Install</strong> to add DRK Goods to your Windows Start Menu, Taskbar, or Mac Dock.
                    </span>
                  </li>
                </ol>
              </div>
            )}
          </div>

          {/* App Key Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-[11px] text-slate-700">
                <strong className="block text-slate-900">GPS Geofenced</strong>
                Real-time radar perimeter check
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-[11px] text-slate-700">
                <strong className="block text-slate-900">Instant OTP Punch</strong>
                3-second punch-in clock
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="text-[11px] text-slate-700">
                <strong className="block text-slate-900">Offline Cached</strong>
                Works seamlessly in low connectivity
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            DRK Goods Enterprise Progressive Web Application (PWA) v1.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
