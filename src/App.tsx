import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { StaffPunchClock } from './components/StaffPunchClock';
import { ManagerDashboard } from './components/ManagerDashboard';
import { AdminOverview } from './components/AdminOverview';
import { PayrollSection } from './components/PayrollSection';
import { GeofenceManager } from './components/GeofenceManager';
import { StaffDirectory } from './components/StaffDirectory';
import { MobileLoginModal } from './components/MobileLoginModal';
import { MobileAuthGate } from './components/MobileAuthGate';
import { DownloadCenterModal } from './components/DownloadCenterModal';
import { AppDownloadModal } from './components/AppDownloadModal';
import { CheckCircle2, AlertCircle, Info, X, Download, FileSpreadsheet, Smartphone } from 'lucide-react';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('punch');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState<boolean>(false);
  const { notification, currentUser, isLoginModalOpen, setIsLoginModalOpen } = useApp();

  const isAdmin = Boolean(
    currentUser &&
    ((currentUser.phone || '').replace(/\D/g, '') === '9971336707' ||
      currentUser.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com') &&
    currentUser.role === 'admin'
  );

  // Force activeTab to 'punch' if non-admin is logged in
  React.useEffect(() => {
    if (!isAdmin && activeTab !== 'punch') {
      setActiveTab('punch');
    }
  }, [isAdmin, activeTab]);

  // When user is not authenticated, show the Mobile Number & OTP Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900">
        <MobileAuthGate onOpenAppDownloadModal={() => setIsAppDownloadOpen(true)} />

        {/* DRK Goods Mobile App Download & Install Modal */}
        <AppDownloadModal
          isOpen={isAppDownloadOpen}
          onClose={() => setIsAppDownloadOpen(false)}
        />

        {/* Toast Notification Banner */}
        {notification && (
          <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
            <div
              className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-medium max-w-md ${
                notification.type === 'success'
                  ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                  : notification.type === 'error'
                  ? 'bg-red-950 text-red-200 border-red-800'
                  : 'bg-slate-900 text-slate-200 border-slate-800'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-400 shrink-0" />
              )}
              <span className="flex-1">{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased">
      {/* Navbar with role switcher & tabs */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* If non-admin, always show Punch Clock Attendance */}
        {(!isAdmin || activeTab === 'punch') && <StaffPunchClock />}
        {isAdmin && activeTab === 'manager' && <ManagerDashboard />}
        {isAdmin && activeTab === 'admin' && <AdminOverview />}
        {isAdmin && activeTab === 'payroll' && <PayrollSection />}
        {isAdmin && activeTab === 'geofences' && <GeofenceManager />}
        {isAdmin && activeTab === 'staff' && <StaffDirectory />}
      </main>

      {/* Mobile Login Modal */}
      <MobileLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Floating Action Buttons: Download Reports & Install Mobile App */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Direct Mobile App Download/Install Button */}
        <button
          type="button"
          onClick={() => setIsAppDownloadOpen(true)}
          id="btn-floating-install-app"
          className="group flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl hover:shadow-2xl border border-blue-400/40 transition-all duration-200 cursor-pointer"
          title="Download & Install DRK Goods App on Android, iPhone, or Desktop (PWA)"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Install App</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/20 text-white rounded">
                APK/PWA
              </span>
            </div>
            <div className="text-[10px] text-blue-100">Android & iPhone</div>
          </div>
        </button>

        {/* Global Download Center Button */}
        <button
          type="button"
          onClick={() => setIsDownloadModalOpen(true)}
          id="btn-floating-download-center"
          className="group flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl shadow-xl hover:shadow-2xl border border-slate-700 transition-all duration-200 cursor-pointer"
          title="Download Attendance, Payroll, Payslips, Excel & PDF"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Download className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Download Center</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Excel/PDF
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Reports & Payslips</div>
          </div>
        </button>
      </div>

      {/* Download Center Modal */}
      <DownloadCenterModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
      />

      {/* DRK Goods Mobile App Download & Install Modal */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-xs font-medium max-w-md ${
              notification.type === 'success'
                ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
                : notification.type === 'error'
                ? 'bg-red-950 text-red-200 border-red-800'
                : 'bg-slate-900 text-slate-200 border-slate-800'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
