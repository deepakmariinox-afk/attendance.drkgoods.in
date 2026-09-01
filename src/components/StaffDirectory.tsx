import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Smartphone,
  Building,
  DollarSign,
  Shield,
  Search,
  CheckCircle2,
  FolderEdit,
  Layers,
  Plus,
  ArrowRight,
  Check,
  X,
  FileSpreadsheet,
  Clock,
  Lock,
  Unlock,
  RotateCcw,
  RefreshCw,
  Calendar,
  CalendarDays,
  UploadCloud,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Employee, UserRole, WorkShift } from '../types';
import { exportStaffDirectoryExcel } from '../utils/excelExport';
import { DayWiseWeekOffModal } from './DayWiseWeekOffModal';
import { RosterUploadModal } from './RosterUploadModal';

export const StaffDirectory: React.FC = () => {
  const {
    employees,
    locations,
    shifts,
    attendance,
    todayStr,
    adminPunchOutStaff,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    renameDepartment,
    unbindEmployeeDevice,
    addShift,
    updateShift,
    deleteShift,
    assignShiftToEmployee,
    companyWeekOffDays,
    getEmployeeWeekOffDays,
    currentUser,
    showNotification,
    syncWithServer,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isDayWiseWeekOffModalOpen, setIsDayWiseWeekOffModalOpen] = useState<boolean>(false);
  const [isRosterUploadModalOpen, setIsRosterUploadModalOpen] = useState<boolean>(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Department management state
  const [editingDeptName, setEditingDeptName] = useState<string | null>(null);
  const [newDeptRenameValue, setNewDeptRenameValue] = useState<string>('');

  // Shift form state (Shifts strictly define time and working hours)
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [newShiftName, setNewShiftName] = useState<string>('');
  const [newShiftStart, setNewShiftStart] = useState<string>('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState<string>('17:30');
  const [newShiftGrace, setNewShiftGrace] = useState<number>(15);

  // Form fields for Staff Add/Edit
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [role, setRole] = useState<UserRole>('staff');
  const [vendor, setVendor] = useState<string>('Direct');
  const [department, setDepartment] = useState<string>('Engineering & Product');
  const [designation, setDesignation] = useState<string>('Software Engineer');
  const [assignedLocationId, setAssignedLocationId] = useState<string>(locations[0]?.id || 'loc_hq');
  const [assignedShiftId, setAssignedShiftId] = useState<string>(shifts[0]?.id || 'shift_standard');
  const [empWeekOffDays, setEmpWeekOffDays] = useState<string[] | undefined>(undefined);
  const [bankAccount, setBankAccount] = useState<string>('HDFC0001234 - 501002938491');

  // Quick inline department edit
  const [quickEditEmpId, setQuickEditEmpId] = useState<string | null>(null);
  const [quickDeptValue, setQuickDeptValue] = useState<string>('');

  // Extract all distinct departments and vendors from current employees
  const allDepartments = Array.from(
    new Set([
      'Executive / Operations & HR',
      'Production & Assembly',
      'Quality Assurance & Inspection',
      'Operations & Site Management',
      'Packaging & Warehouse',
      'Logistics & Dispatch',
      'Warehouse & Inventory',
      'General Operations',
      ...employees.map((e) => e.department).filter(Boolean),
    ])
  );

  const allVendors = Array.from(
    new Set([
      'Direct',
      'RK KHAN',
      'Saurav Solnki',
      ...employees.map((e) => e.vendor).filter(Boolean) as string[],
    ])
  );

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      (e.name || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.designation || '').toLowerCase().includes(q) ||
      ((e.vendor || 'Direct').toLowerCase().includes(q)) ||
      (e.phone || '').includes(q);

    const matchDept = selectedDeptFilter === 'all' || e.department === selectedDeptFilter;
    const matchVendor = selectedVendorFilter === 'all' || (e.vendor || 'Direct') === selectedVendorFilter;

    return matchSearch && matchDept && matchVendor;
  });

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('staff');
    setVendor('Direct');
    setDepartment('Packaging & Warehouse');
    setDesignation('Packer');
    setAssignedLocationId(locations[0]?.id || 'loc_hq');
    setAssignedShiftId(shifts[0]?.id || 'shift_morning');
    setEmpWeekOffDays(undefined);
    setBankAccount('HDFC0001234 - 501002938491');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setEmail(emp.email || '');
    setPhone(emp.phone || '');
    setRole(emp.role);
    setVendor(emp.vendor || 'Direct');
    setDepartment(emp.department || 'General Operations');
    setDesignation(emp.designation || 'Field Staff Associate');
    setAssignedLocationId(emp.assignedLocationId);
    setAssignedShiftId(emp.assignedShiftId || shifts[0]?.id || 'shift_morning');
    setEmpWeekOffDays(emp.weekOffDays);
    setBankAccount(emp.bankAccount || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      showNotification('error', 'Please enter candidate full name.');
      return;
    }

    const trimmedDept = department.trim() || 'General Operations';
    const cleanEmail = email.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@drkgoods.in`;
    const cleanDesignation = designation.trim() || 'Field Staff Associate';
    const cleanVendor = vendor.trim() || 'Direct';
    const computedMonthly = 15000;
    const computedHourly = Math.max(1, Math.round(computedMonthly / 160));

    if (editingEmp) {
      const ok = updateEmployee(editingEmp.id, {
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        role,
        vendor: cleanVendor,
        department: trimmedDept,
        designation: cleanDesignation,
        assignedLocationId,
        assignedShiftId,
        weekOffDays: empWeekOffDays,
        hourlyRate: computedHourly,
        monthlyBaseSalary: computedMonthly,
        bankAccount,
      });
      if (ok) {
        setEditingEmp(null);
      }
    } else {
      const ok = addEmployee({
        name: cleanName,
        email: cleanEmail,
        phone: phone.trim(),
        role,
        vendor: cleanVendor,
        department: trimmedDept,
        designation: cleanDesignation,
        assignedLocationId,
        assignedShiftId,
        weekOffDays: empWeekOffDays,
        hourlyRate: computedHourly,
        monthlyBaseSalary: computedMonthly,
        overtimeRateMultiplier: 1.5,
        bankAccount,
        joinDate: new Date().toISOString().slice(0, 10),
      });
      if (ok) {
        setIsAddModalOpen(false);
        setSelectedDeptFilter('all');
        setSelectedVendorFilter('all');
        setSearchQuery('');
      }
    }
  };

  const handleStartEditShift = (s: WorkShift) => {
    setEditingShiftId(s.id);
    setNewShiftName(s.name);
    setNewShiftStart(s.startTime);
    setNewShiftEnd(s.endTime);
    setNewShiftGrace(s.graceMinutes || s.gracePeriodMinutes || 15);
  };

  const handleCancelEditShift = () => {
    setEditingShiftId(null);
    setNewShiftName('');
    setNewShiftStart('09:00');
    setNewShiftEnd('17:30');
    setNewShiftGrace(15);
  };

  const handleAddOrUpdateShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftName.trim()) return;

    if (editingShiftId) {
      updateShift(editingShiftId, {
        name: newShiftName.trim(),
        startTime: newShiftStart,
        endTime: newShiftEnd,
        graceMinutes: newShiftGrace,
        gracePeriodMinutes: newShiftGrace,
      });
      handleCancelEditShift();
    } else {
      addShift({
        name: newShiftName.trim(),
        startTime: newShiftStart,
        endTime: newShiftEnd,
        graceMinutes: newShiftGrace,
        gracePeriodMinutes: newShiftGrace,
        workingHours: 9,
      });
      handleCancelEditShift();
    }
  };

  const handleStartRenameDept = (dept: string) => {
    setEditingDeptName(dept);
    setNewDeptRenameValue(dept);
  };

  const handleSaveRenameDept = (oldDept: string) => {
    if (newDeptRenameValue.trim() && newDeptRenameValue.trim() !== oldDept) {
      renameDepartment(oldDept, newDeptRenameValue.trim());
    }
    setEditingDeptName(null);
    setNewDeptRenameValue('');
  };

  const handleSaveQuickDept = (empId: string) => {
    if (quickDeptValue.trim()) {
      updateEmployee(empId, { department: quickDeptValue.trim() });
      showNotification('success', 'Department updated successfully.');
    }
    setQuickEditEmpId(null);
    setQuickDeptValue('');
  };

  const handleExportStaffExcel = async () => {
    try {
      setIsExporting(true);
      await exportStaffDirectoryExcel(employees, locations);
      showNotification('success', 'Staff Directory roster downloaded in Excel (.xlsx).');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to export Staff Directory.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncMasterRoster = async () => {
    try {
      setIsSyncing(true);
      await syncWithServer();
      showNotification('success', `Master Roster synced (${employees.length} active staff members loaded).`);
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to sync staff roster.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">
              Workforce Roster
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {employees.length} Members
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Staff Directory & Shift Assignments</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage organization departments, work shifts, single-device mobile logins & security PIN access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSyncMasterRoster}
            disabled={isSyncing}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            id="btn-sync-staff"
            title="Refresh & Synchronize Staff Roster with Server"
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Master Roster'}</span>
          </button>

          <button
            onClick={handleExportStaffExcel}
            disabled={isExporting}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            id="btn-export-staff-excel"
            title="Download Full Staff Roster in Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Roster (Excel)</span>
          </button>

          <button
            onClick={() => setIsRosterUploadModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
            id="btn-upload-roster"
            title="Upload Weekly or Monthly Workforce Roster (.xlsx / .csv)"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Roster (Weekly / Monthly)</span>
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setIsDayWiseWeekOffModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
                id="btn-day-wise-week-off"
                title="Configure Day-wise Weekly Off Schedule"
              >
                <CalendarDays className="w-4 h-4 text-purple-600" />
                <span>Day-wise Week Off ({companyWeekOffDays.length ? companyWeekOffDays.join(', ') : 'None'})</span>
              </button>

              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
                id="btn-manage-shifts"
              >
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Manage Shifts ({shifts.length})</span>
              </button>

              <button
                onClick={() => setIsDeptModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition cursor-pointer"
                id="btn-manage-departments"
              >
                <FolderEdit className="w-4 h-4 text-blue-600" />
                <span>Manage Departments</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 inline-flex items-center gap-2 transition cursor-pointer"
                id="btn-add-staff"
              >
                <UserPlus className="w-4 h-4" />
                <span>Enroll New Staff</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Department Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, role, department, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{filteredEmployees.length}</strong> of {employees.length} employees
          </div>
        </div>

        {/* Dynamic Department Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedDeptFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedDeptFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Departments</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedDeptFilter === 'all' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {employees.length}
            </span>
          </button>

          {allDepartments.map((dept) => {
            const count = employees.filter((e) => e.department === dept).length;
            if (count === 0 && selectedDeptFilter !== dept) return null;
            const isSelected = selectedDeptFilter === dept;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDeptFilter(dept)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Vendor / Source Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <span>🏢 Vendor:</span>
          </span>
          <button
            onClick={() => setSelectedVendorFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedVendorFilter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Sources ({employees.length})</span>
          </button>

          {allVendors.map((v) => {
            const count = employees.filter((e) => (e.vendor || 'Direct') === v).length;
            const isSelected = selectedVendorFilter === v;

            return (
              <button
                key={v}
                onClick={() => setSelectedVendorFilter(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{v}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-purple-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Staff Member</th>
                <th className="py-3 px-3">Vendor / Source</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Assigned Shift</th>
                <th className="py-3 px-3">Mobile & Phone Lock</th>
                <th className="py-3 px-3">Assigned Site</th>
                {currentUser.role === 'admin' && <th className="py-3 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role === 'admin' ? 8 : 7} className="py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-semibold text-slate-800 text-sm">No staff members match the current search / filter</p>
                      <p className="text-xs text-slate-500">
                        {employees.length} total staff members are registered. Try resetting your search or filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedDeptFilter('all');
                          setSelectedVendorFilter('all');
                        }}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        Reset All Filters ({employees.length} Staff)
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const loc = locations.find((l) => l.id === emp.assignedLocationId);
                  const shift = shifts.find((s) => s.id === emp.assignedShiftId) || shifts[0];
                  const isQuickEditing = quickEditEmpId === emp.id;
                  const vendorLabel = emp.vendor || 'Direct';

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {(emp.name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs sm:text-sm">{emp.name || 'Staff Member'}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-slate-700">{emp.designation || 'Staff Associate'}</span>
                              {emp.joinDate && (
                                <span className="text-[10px] text-slate-400">
                                  • Joined {emp.joinDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                    {/* Vendor Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
                          vendorLabel === 'Direct'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : vendorLabel === 'RK KHAN'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : vendorLabel === 'Saurav Solnki'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {vendorLabel}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          emp.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : emp.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {emp.role}
                      </span>
                    </td>

                    {/* Department (Editable by Admin) */}
                    <td className="py-3 px-3">
                      {isQuickEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            list="departments-list"
                            value={quickDeptValue}
                            onChange={(e) => setQuickDeptValue(e.target.value)}
                            className="px-2 py-1 text-xs border border-blue-500 rounded-lg outline-none bg-white font-medium text-slate-900 w-44"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveQuickDept(emp.id);
                              if (e.key === 'Escape') setQuickEditEmpId(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveQuickDept(emp.id)}
                            className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Save Department"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuickEditEmpId(null)}
                            className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                            title="Cancel"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 group">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200/60 inline-flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-500" />
                            <span>{emp.department}</span>
                          </span>
                          {currentUser.role === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickEditEmpId(emp.id);
                                setQuickDeptValue(emp.department);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Department"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Assigned Work Shift & Day-wise Week Off */}
                    <td className="py-3 px-3">
                      {currentUser.role === 'admin' ? (
                        <div className="space-y-1.5">
                          <select
                            value={emp.assignedShiftId || shifts[0]?.id}
                            onChange={(e) => assignShiftToEmployee(emp.id, e.target.value)}
                            className="w-full px-2 py-1 text-[11px] font-semibold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg outline-none cursor-pointer"
                          >
                            {shifts.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.startTime} - {s.endTime})
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center justify-between gap-1 text-[10px] text-purple-700 font-medium pl-0.5">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="w-3 h-3 text-purple-600" />
                              <span>Day Off:</span>
                              <strong className="font-bold">
                                {getEmployeeWeekOffDays(emp).length > 0 ? getEmployeeWeekOffDays(emp).join(', ') : 'None'}
                              </strong>
                            </span>
                            {emp.weekOffDays && emp.weekOffDays.length > 0 && (
                              <span className="text-[9px] bg-purple-100 text-purple-800 px-1 py-0.2 rounded font-semibold">
                                Custom
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 font-medium text-[11px] inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>{shift?.name || 'Standard'} ({shift?.startTime} - {shift?.endTime})</span>
                          </span>
                          <div className="text-[10px] text-purple-700 font-medium pl-1 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-purple-600" />
                            <span>Day Off: {getEmployeeWeekOffDays(emp).length > 0 ? getEmployeeWeekOffDays(emp).join(', ') : 'None'}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Mobile & Single-Device Lock Status */}
                    <td className="py-3 px-3 font-mono text-slate-800 font-medium">
                      {emp.phone && emp.phone.trim().length >= 4 ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                          
                          {/* Device Binding Status */}
                          {emp.boundDeviceId ? (
                            <div className="flex items-center gap-1.5 font-sans">
                              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200" title={`Bound to: ${emp.boundDeviceId}`}>
                                <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Phone Locked: {emp.boundDeviceName || 'Handset'}</span>
                              </span>
                              {currentUser.role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => unbindEmployeeDevice(emp.id)}
                                  className="text-[9px] text-red-600 hover:text-red-800 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                                  title="Unbind/reset device lock if employee changed phone"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Unbind</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-sans font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                              <Unlock className="w-2.5 h-2.5 text-slate-500" />
                              <span>Single Phone (Unbound)</span>
                            </span>
                          )}
                        </div>
                      ) : currentUser.role === 'admin' ? (
                        <div className="space-y-1">
                          <span className="inline-block text-[9px] font-sans font-medium text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Punch Inactive (No Mobile)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 block"
                          >
                            <Smartphone className="w-3 h-3 text-purple-600" />
                            <span>+ Add Mobile Number</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No Mobile</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {loc?.name || 'Main Worksite'}
                    </td>

                    {currentUser.role === 'admin' && (
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Admin Remote Punch Out (Anywhere Out) */}
                          {(() => {
                            const todayAtt = attendance.find((a) => a.employeeId === emp.id && a.date === todayStr);
                            const isCheckedIn = Boolean(todayAtt?.checkInTime && !todayAtt?.checkOutTime);
                            return (
                              <button
                                type="button"
                                onClick={() => adminPunchOutStaff(emp.id)}
                                className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                                  isCheckedIn
                                    ? 'border-red-300 bg-red-600 hover:bg-red-700 text-white shadow-xs animate-pulse'
                                    : 'border-slate-200 bg-slate-50 hover:bg-red-50 text-slate-700 hover:text-red-700'
                                }`}
                                title={`Remote Punch Out for ${emp.name} (Admin Authority - Kahin se bhi out maar sakte hain)`}
                                id={`btn-admin-remote-out-${emp.id}`}
                              >
                                <LogOut className="w-3 h-3" />
                                <span>{isCheckedIn ? 'Punch Out' : 'Mark Out'}</span>
                              </button>
                            );
                          })()}

                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                            title="Edit full profile"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {employees.length > 2 && (
                            <button
                              onClick={() => deleteEmployee(emp.id)}
                              className="p-1.5 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition cursor-pointer"
                              title="Delete employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Datalist for autocomplete suggestions */}
      <datalist id="departments-list">
        {allDepartments.map((dept) => (
          <option key={dept} value={dept} />
        ))}
      </datalist>

      {/* Work Shifts Management Modal (Admin Only) */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Work Shift & Week Off Manager</h3>
                  <p className="text-xs text-slate-500">Configure corporate work shifts, timing & weekly off schedules</p>
                </div>
              </div>
              <button
                onClick={() => {
                  handleCancelEditShift();
                  setIsShiftModalOpen(false);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Shifts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Configured Shifts ({shifts.length})
                </span>
                <span className="text-[11px] text-purple-700 font-medium">
                  Click Edit to modify timing or week off
                </span>
              </div>

              <div className="space-y-2">
                {shifts.map((s) => {
                  const assignedCount = employees.filter((e) => e.assignedShiftId === s.id).length;
                  const isBeingEdited = editingShiftId === s.id;
                  const weekOffList = s.weekOffDays && s.weekOffDays.length > 0 ? s.weekOffDays : ['Sunday'];

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isBeingEdited
                          ? 'border-purple-500 bg-purple-50/80 ring-2 ring-purple-500/20'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                            {s.startTime} - {s.endTime}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                            <span>🏖️ Week Off:</span>
                            <strong className="font-semibold">{weekOffList.join(', ')}</strong>
                          </span>
                          <span className="text-slate-500">
                            Grace: {s.graceMinutes || s.gracePeriodMinutes || 15}m • {assignedCount} staff assigned
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditShift(s)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                            isBeingEdited
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'border-slate-200 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700'
                          }`}
                          title="Edit Shift & Week Off"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>{isBeingEdited ? 'Editing...' : 'Edit'}</span>
                        </button>

                        {shifts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => deleteShift(s.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Shift"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Create / Edit Shift Form */}
            <form onSubmit={handleAddOrUpdateShiftSubmit} className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  {editingShiftId ? (
                    <>
                      <Edit className="w-3.5 h-3.5 text-purple-600" />
                      <span>Edit Shift Timing Schedule</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-purple-600" />
                      <span>Create New Work Shift Schedule</span>
                    </>
                  )}
                </h4>
                {editingShiftId && (
                  <button
                    type="button"
                    onClick={handleCancelEditShift}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Shift Name</label>
                  <input
                    type="text"
                    value={newShiftName}
                    onChange={(e) => setNewShiftName(e.target.value)}
                    placeholder="e.g. Morning Shift (07:00 AM - 04:00 PM)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-xs font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={newShiftGrace}
                    onChange={(e) => setNewShiftGrace(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Total Daily Work Hours</label>
                  <input
                    type="text"
                    readOnly
                    value="9 Hours Standard"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {editingShiftId && (
                  <button
                    type="button"
                    onClick={handleCancelEditShift}
                    className="py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold text-xs transition shadow-md shadow-purple-600/20 cursor-pointer"
                >
                  {editingShiftId ? 'Save & Update Shift Schedule' : '+ Add Work Shift Schedule'}
                </button>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  handleCancelEditShift();
                  setIsShiftModalOpen(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Department Management Modal (Admin Only) */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Department Management</h3>
                  <p className="text-xs text-slate-500">Edit, rename, or structure organization departments</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDeptModalOpen(false);
                  setEditingDeptName(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Department Roster Table */}
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active Organization Departments ({allDepartments.length})
              </div>

              <div className="space-y-2">
                {allDepartments.map((dept) => {
                  const assignedStaff = employees.filter((e) => e.department === dept);
                  const isRenaming = editingDeptName === dept;

                  return (
                    <div
                      key={dept}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newDeptRenameValue}
                              onChange={(e) => setNewDeptRenameValue(e.target.value)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-blue-500 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 flex-1"
                              placeholder="Enter new department name..."
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameDept(dept);
                                if (e.key === 'Escape') setEditingDeptName(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameDept(dept)}
                              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Apply</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDeptName(null)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{dept}</span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                              {assignedStaff.length} {assignedStaff.length === 1 ? 'staff' : 'staff members'}
                            </span>
                          </div>
                        )}

                        {!isRenaming && assignedStaff.length > 0 && (
                          <div className="text-[11px] text-slate-500 mt-1 truncate">
                            Staff: {assignedStaff.map((s) => s.name).join(', ')}
                          </div>
                        )}
                      </div>

                      {!isRenaming && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartRenameDept(dept)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 text-blue-600" />
                            <span>Rename</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsDeptModalOpen(false);
                  setEditingDeptName(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {(isAddModalOpen || editingEmp) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingEmp ? `Edit Staff Profile: ${editingEmp.name}` : 'Enroll New Staff Member'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEmp(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Candidate Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>Mobile Phone (Mobile Login Access)</span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded">Instant Access</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9811234567"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                  />
                  <p className="text-[10px] text-emerald-700 font-medium mt-1">
                    {phone.replace(/\D/g, '').length >= 4 ? (
                      <>
                        ✅ Candidate can log in using PIN: <strong className="font-mono bg-emerald-100 px-1 py-0.5 rounded">{phone.replace(/\D/g, '').slice(-4)}</strong> or <span className="font-mono">1234</span>
                      </>
                    ) : (
                      'Candidate will receive instant login access on app once 10-digit number is saved.'
                    )}
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Access Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="staff">Staff / Employee</option>
                    <option value="manager">Authorized Manager</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>
              </div>

              {/* Vendor / Source & Designation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-700">Vendor / Sourcing Agency</label>
                    <span className="text-[10px] text-purple-600 font-medium">Direct or Contractor</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="vendors-list"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      placeholder="e.g. Direct, RK KHAN, Saurav Solnki"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-900"
                    />
                    <datalist id="vendors-list">
                      <option value="Direct" />
                      <option value="RK KHAN" />
                      <option value="Saurav Solnki" />
                    </datalist>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Direct', 'RK KHAN', 'Saurav Solnki'].map((vOption) => (
                      <button
                        key={vOption}
                        type="button"
                        onClick={() => setVendor(vOption)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                          vendor === vOption
                            ? 'bg-purple-100 border-purple-300 text-purple-800 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {vOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Designation Title</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Packer, QA Associate"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Department (Editable Text / Datalist) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-medium text-slate-700">Department</label>
                  <span className="text-[10px] text-blue-600 font-medium">Editable</span>
                </div>
                <input
                  type="text"
                  list="departments-list"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Type or select department..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  required
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {allDepartments.slice(0, 4).map((deptOption) => (
                    <button
                      key={deptOption}
                      type="button"
                      onClick={() => setDepartment(deptOption)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                        department === deptOption
                          ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {deptOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Shift & Assigned Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assign Work Shift</label>
                  <select
                    value={assignedShiftId}
                    onChange={(e) => setAssignedShiftId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.startTime} - {s.endTime})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Assigned Worksite</label>
                  <select
                    value={assignedLocationId}
                    onChange={(e) => setAssignedLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.radiusMeters}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day-wise Week Off Selection for Staff Member */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-purple-600" />
                    <span>Day-wise Weekly Off Schedule</span>
                  </label>
                  <span className="text-[11px] text-purple-700 font-semibold">
                    {empWeekOffDays === undefined
                      ? `Company Default (${companyWeekOffDays.join(', ')})`
                      : empWeekOffDays.length === 0
                      ? 'No Week Off'
                      : empWeekOffDays.join(', ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmpWeekOffDays(undefined)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      empWeekOffDays === undefined
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50'
                    }`}
                  >
                    Use Company Default ({companyWeekOffDays.join(', ')})
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmpWeekOffDays(empWeekOffDays || ['Sunday'])}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      empWeekOffDays !== undefined
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50'
                    }`}
                  >
                    Custom Day-wise
                  </button>
                </div>

                {empWeekOffDays !== undefined && (
                  <div className="grid grid-cols-7 gap-1 pt-1">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                      const isSelected = empWeekOffDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setEmpWeekOffDays((prev) => {
                              const curr = prev || [];
                              return curr.includes(day) ? curr.filter((d) => d !== day) : [...curr, day];
                            });
                          }}
                          className={`py-1.5 px-1 rounded-xl text-center text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold">{day.slice(0, 3)}</div>
                          <div className="text-[9px] mt-0.5">{isSelected ? '✓ OFF' : 'WORK'}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bank Account / Direct Deposit */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">Direct Deposit Account</label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  placeholder="e.g. HDFC0001234 - 501002938491"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEmp(null);
                  }}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  {editingEmp ? 'Save Changes' : 'Enroll Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day-wise Week Off Configuration Modal */}
      <DayWiseWeekOffModal
        isOpen={isDayWiseWeekOffModalOpen}
        onClose={() => setIsDayWiseWeekOffModalOpen(false)}
      />

      {/* Roster Upload Modal (Weekly & Monthly) */}
      <RosterUploadModal
        isOpen={isRosterUploadModalOpen}
        onClose={() => setIsRosterUploadModalOpen(false)}
      />
    </div>
  );
};
