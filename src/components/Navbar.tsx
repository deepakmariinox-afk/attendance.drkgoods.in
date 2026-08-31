import React, { useState } from 'react';
import {
  Shield,
  Clock,
  Briefcase,
  Users,
  MapPin,
  DollarSign,
  ChevronDown,
  LogOut,
  Radio,
  Building,
  Smartphone,
  KeyRound,
  FileSpreadsheet,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { exportAllRecordsToExcel } from '../utils/excelExport';
import { DownloadCenterModal } from './DownloadCenterModal';
import { AppDownloadModal } from './AppDownloadModal';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    setCurrentUser,
    employees,
    attendance,
    payrollRecords,
    leaves,
    locations,
    currentOffice,
    selectedPayrollMonth,
    setIsLoginModalOpen,
    logout,
    showNotification,
    syncWithServer,
    lastSyncTime,
  } = useApp();
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloadCenterOpen, setIsDownloadCenterOpen] = useState<boolean>(false);
  const [isAppDownloadOpen, setIsAppDownloadOpen] = useState<boolean>(false);

  const handleExportAllExcel = async () => {
    try {
      setIsExporting(true);
      await exportAllRecordsToExcel({
        employees,
        attendance,
        payrollRecords,
        leaves,
        locations,
        selectedMonth: selectedPayrollMonth,
        exportedBy: currentUser?.name || 'Deepak Yadav',
      });
      showNotification('success', 'Master Excel Workbook downloaded successfully (All Records).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to generate Excel file.');
    } finally {
      setIsExporting(false);
    }
  };

  const isAdmin = Boolean(
    currentUser &&
    ((currentUser.phone || '').replace(/\D/g, '') === '9971336707' ||
      currentUser.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com') &&
    currentUser.role === 'admin'
  );

  const getRoleBadge = (role: UserRole, email?: string, phone?: string) => {
    const isUserAdmin =
      ((phone || '').replace(/\D/g, '') === '9971336707' ||
        email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com') &&
      role === 'admin';
    if (isUserAdmin) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">Admin</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">Candidate / Staff</span>;
  };

  // Nav items: strictly only 'punch' (Attendance) for staff, and all tabs for Admin Deepak Yadav
  const navItems = [
    { id: 'punch', label: 'Attendance Punch', icon: Clock, adminOnly: false },
    { id: 'manager', label: 'Manager Portal', icon: Briefcase, adminOnly: true },
    { id: 'admin', label: 'Admin Center', icon: Shield, adminOnly: true },
    { id: 'payroll', label: 'Payroll & PDF', icon: DollarSign, adminOnly: true },
    { id: 'geofences', label: 'Geofences', icon: MapPin, adminOnly: true },
    { id: 'staff', label: 'Staff Directory', icon: Users, adminOnly: true },
  ];

  // If not admin, strictly only show the Attendance punch tab
  const visibleNav = navItems.filter((item) => {
    if (!isAdmin) {
      return item.id === 'punch';
    }
    return true;
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/20">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base tracking-tight">DRK Goods</h1>
                <span className="text-[10px] font-semibold font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                  GPS + OTP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Workforce Geofence Attendance & Payroll
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`nav-tab-${item.id}`}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action buttons: Auto Sync, Install App, Download Center, Excel Export & User Dropdown */}
          <div className="flex items-center gap-2">
            {/* 10-Second Auto Sync Indicator / Trigger Button */}
            <button
              onClick={async () => {
                setIsSyncingNow(true);
                await syncWithServer();
                showNotification('success', 'Enterprise data synced with server.');
                setTimeout(() => setIsSyncingNow(false), 600);
              }}
              id="btn-nav-auto-sync"
              title={`Auto-syncs every 10s. Last synced: ${lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. Click to force sync now.`}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline text-slate-600 font-mono text-[11px]">Sync: 10s</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </button>

            {/* Direct App Download / Install Button */}
            <button
              onClick={() => setIsAppDownloadOpen(true)}
              id="btn-nav-install-app"
              title="Download & Install DRK Goods App on Android, iPhone, or Desktop (PWA)"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">App</span>
            </button>

            {/* Global Download Center Button */}
            <button
              onClick={() => setIsDownloadCenterOpen(true)}
              id="btn-nav-download-center"
              title="Open Download Center (Attendance, Payroll, Payslips, Excel & PDF)"
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer border border-slate-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Reports</span>
              <span className="sm:hidden">Reports</span>
            </button>

            {/* Global Excel Download Button */}
            <button
              onClick={handleExportAllExcel}
              disabled={isExporting}
              id="btn-nav-download-excel"
              title="Quick Download Master Excel (.xlsx) - Full Enterprise Database"
              className="hidden md:inline-flex px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{isExporting ? 'Generating Excel...' : 'Excel Master'}</span>
              <span className="lg:hidden">Excel</span>
            </button>

            {currentUser ? (
              <>
                {/* Admin Mode Badge or Staff Status */}
                {isAdmin ? (
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <span>Admin Mode</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    id="btn-nav-switch-account"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    title="Switch Account / Admin Login"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Switch / Admin</span>
                  </button>
                )}

                {/* Direct High-Visibility Log Out Button */}
                <button
                  onClick={logout}
                  id="btn-nav-direct-logout"
                  title="Log out of current session"
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span className="hidden sm:inline">Log Out</span>
                  <span className="sm:hidden">Exit</span>
                </button>

                {/* User Profile & Role Switcher */}
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    id="btn-user-menu"
                    className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition text-left"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                        isAdmin ? 'bg-purple-700' : 'bg-blue-600'
                      }`}
                    >
                      {currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div className="hidden sm:block text-xs">
                      <div className="font-semibold text-slate-900 leading-tight">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>{isAdmin ? 'ADMINISTRATOR' : 'STAFF'}</span>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  </button>

                  {/* Dropdown Menu for Role & User Switch */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Current Active Account
                        </span>
                        <div className="font-semibold text-slate-900 text-sm mt-0.5">{currentUser.name}</div>
                        <div className="text-xs text-slate-500">{currentUser.email || currentUser.designation}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {getRoleBadge(currentUser.role, currentUser.email)}
                          {currentUser.phone && (
                            <span className="text-[11px] font-mono text-slate-500">{currentUser.phone}</span>
                          )}
                        </div>
                      </div>

                      {/* Direct Mobile Sign In Button */}
                      <div className="p-2 border-b border-slate-100">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsLoginModalOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-xs"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>{isAdmin ? 'Switch Account (OTP)' : 'Staff OTP Verification'}</span>
                        </button>
                      </div>

                      {/* Export All Excel & Download Center inside Dropdown */}
                      <div className="p-2 border-b border-slate-100 space-y-1.5">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsAppDownloadOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Download Mobile App (PWA)</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setIsDownloadCenterOpen(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enterprise Download Center</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleExportAllExcel();
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Quick Master Excel (.xlsx)</span>
                        </button>
                      </div>

                      {isAdmin ? (
                        <>
                          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Administrator Profile Switcher
                          </div>

                          <div className="max-h-60 overflow-y-auto px-1 space-y-1">
                            {employees.map((emp) => {
                              const isEmpAdmin =
                                (emp.phone || '').replace(/\D/g, '') === '9971336707' ||
                                emp.email?.toLowerCase().trim() === 'deepak.mariinox@gmail.com';
                              return (
                                <button
                                  key={emp.id}
                                  onClick={() => {
                                    setCurrentUser(emp);
                                    setIsUserMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                                    emp.id === currentUser.id
                                      ? 'bg-blue-50 text-blue-900 font-semibold'
                                      : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-slate-900 flex items-center gap-1.5">
                                      <span>{emp.name}</span>
                                      {isEmpAdmin && <Shield className="w-3 h-3 text-purple-600 shrink-0" />}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {emp.phone || emp.designation}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {getRoleBadge(emp.role, emp.email, emp.phone)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Candidate Profile Status
                          </div>
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-[11px]">Registered Mobile:</span>
                              <span className="font-mono font-bold text-slate-800">+91 {currentUser.phone || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-[11px]">Department:</span>
                              <span className="font-medium text-slate-800">{currentUser.department}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 text-[11px]">Access Tier:</span>
                              <span className="font-bold text-blue-700 text-[11px]">Candidate Access</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Prominent Red Logout button */}
                      <div className="pt-2 mt-1 border-t border-slate-100 px-2">
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            logout();
                          }}
                          id="btn-dropdown-logout"
                          className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-red-600 hover:bg-red-50 transition flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>Log Out / Exit Session</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* When Logged Out: Show Primary Sign In Button */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  id="btn-nav-signin"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-2 transition shadow-sm cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Sign In (Staff / Admin)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 scrollbar-none">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Enterprise Download Center Modal */}
      <DownloadCenterModal
        isOpen={isDownloadCenterOpen}
        onClose={() => setIsDownloadCenterOpen(false)}
      />

      {/* DRK Goods Mobile & Desktop App Download Modal */}
      <AppDownloadModal
        isOpen={isAppDownloadOpen}
        onClose={() => setIsAppDownloadOpen(false)}
      />
    </header>
  );
};
