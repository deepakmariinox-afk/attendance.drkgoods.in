import React, { useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Calendar,
  Clock,
  Users,
  Shield,
  Sparkles,
  Info,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DayOfWeek, Employee } from '../types';

const ALL_DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface DayWiseWeekOffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DayWiseWeekOffModal: React.FC<DayWiseWeekOffModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    companyWeekOffDays,
    updateCompanyWeekOffDays,
    employees,
    updateEmployee,
    getEmployeeWeekOffDays,
    showNotification,
  } = useApp();

  const [selectedCompanyDays, setSelectedCompanyDays] = useState<string[]>(
    companyWeekOffDays && companyWeekOffDays.length > 0 ? companyWeekOffDays : ['Sunday']
  );

  const [activeTab, setActiveTab] = useState<'company' | 'staff'>('company');
  const [staffSearch, setStaffSearch] = useState<string>('');

  if (!isOpen) return null;

  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const handleToggleCompanyDay = (day: DayOfWeek) => {
    setSelectedCompanyDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleApplyPreset = (preset: 'sun' | 'sat_sun' | 'mon' | 'fri' | 'none') => {
    if (preset === 'sun') setSelectedCompanyDays(['Sunday']);
    else if (preset === 'sat_sun') setSelectedCompanyDays(['Saturday', 'Sunday']);
    else if (preset === 'mon') setSelectedCompanyDays(['Monday']);
    else if (preset === 'fri') setSelectedCompanyDays(['Friday']);
    else if (preset === 'none') setSelectedCompanyDays([]);
  };

  const handleSaveCompanySchedule = () => {
    updateCompanyWeekOffDays(selectedCompanyDays);
    showNotification(
      'success',
      `Organization Day-wise Week Off schedule updated: ${
        selectedCompanyDays.length === 0
          ? 'No Week Off (7 Working Days)'
          : selectedCompanyDays.join(', ')
      }`
    );
  };

  const handleToggleEmployeeDay = (emp: Employee, day: DayOfWeek) => {
    const currentDays = getEmployeeWeekOffDays(emp);
    let newDays: string[];
    if (currentDays.includes(day)) {
      newDays = currentDays.filter((d) => d !== day);
    } else {
      newDays = [...currentDays, day];
    }
    updateEmployee(emp.id, { weekOffDays: newDays });
    showNotification('success', `Updated Day-wise Week Off for ${emp.name}: ${newDays.length ? newDays.join(', ') : 'None'}`);
  };

  const handleResetEmployeeToCompany = (emp: Employee) => {
    updateEmployee(emp.id, { weekOffDays: undefined });
    showNotification('info', `${emp.name} is now following Company Default Day-wise Week Off (${selectedCompanyDays.join(', ')}).`);
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
      e.department.toLowerCase().includes(staffSearch.toLowerCase()) ||
      e.phone.includes(staffSearch)
  );

  const staffOffTodayCount = employees.filter((e) => {
    const days = getEmployeeWeekOffDays(e);
    return days.some((d) => d.toLowerCase() === todayDayName.toLowerCase());
  }).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Day-wise Week Off Schedule</h3>
              <p className="text-[11px] text-slate-400">
                Configure company-wide and employee day-wise rest days & weekly off policies
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-day-wise-week-off-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Header Bar */}
        <div className="bg-purple-50/70 border-b border-purple-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-purple-950">
            <Clock className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="font-medium">
              Today is <strong>{todayDayName}</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                selectedCompanyDays.includes(todayDayName)
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {selectedCompanyDays.includes(todayDayName) ? '🏖️ Official Week Off' : '💼 Working Day'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong>{staffOffTodayCount}</strong> of {employees.length} staff on weekly off today
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('company')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'company'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
            id="tab-company-week-off"
          >
            <CalendarDays className="w-4 h-4" />
            <span>Organization Day-wise Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'border-purple-600 text-purple-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
            id="tab-staff-week-off"
          >
            <Users className="w-4 h-4" />
            <span>Staff-wise Day Off Overrides ({employees.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {activeTab === 'company' ? (
            <>
              {/* Presets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 text-xs">
                    Quick Day-wise Week Off Presets:
                  </label>
                  <span className="text-[11px] text-purple-700 font-semibold">
                    {selectedCompanyDays.length === 0
                      ? 'No Week Off (7 Working Days)'
                      : `${selectedCompanyDays.length} Day${selectedCompanyDays.length === 1 ? '' : 's'} Off: ${selectedCompanyDays.join(', ')}`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('sun')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedCompanyDays.length === 1 && selectedCompanyDays.includes('Sunday')
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Sunday Only (Standard 6-Day)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('sat_sun')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedCompanyDays.length === 2 &&
                      selectedCompanyDays.includes('Saturday') &&
                      selectedCompanyDays.includes('Sunday')
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Sat & Sun (5-Day Weekend Off)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('mon')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedCompanyDays.length === 1 && selectedCompanyDays.includes('Monday')
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Monday Only
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('fri')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedCompanyDays.length === 1 && selectedCompanyDays.includes('Friday')
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    Friday Only
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('none')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedCompanyDays.length === 0
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 hover:bg-purple-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    7-Day Work (No Week Off)
                  </button>
                </div>
              </div>

              {/* 7-Day Visual Interactive Grid */}
              <div className="space-y-2 pt-2">
                <label className="font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Day-wise 7-Day Interactive Schedule:</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Click any day to toggle between Weekly Off and Working Day
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
                  {ALL_DAYS_OF_WEEK.map((day) => {
                    const isOff = selectedCompanyDays.includes(day);
                    const isToday = day === todayDayName;

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleToggleCompanyDay(day)}
                        className={`p-3 rounded-2xl border text-center transition flex flex-col justify-between items-center gap-2 cursor-pointer relative ${
                          isOff
                            ? 'bg-purple-50 border-purple-300 text-purple-950 shadow-xs ring-1 ring-purple-200'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        id={`btn-toggle-day-${day.toLowerCase()}`}
                      >
                        {isToday && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wider">
                            Today
                          </span>
                        )}

                        <div className="text-[11px] font-bold uppercase tracking-wider mt-1">
                          {day.slice(0, 3)}
                        </div>

                        <div className="text-xs font-medium">{day}</div>

                        <div
                          className={`w-full py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                            isOff
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isOff ? '🏖️ WEEK OFF' : '💼 WORK'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Policy Explanation & Impact Note */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-purple-600" />
                  <span>How Day-wise Week Off Works:</span>
                </div>
                <p>
                  • Attendance punches on marked Day-wise Week Off days are considered optional/overtime.
                </p>
                <p>
                  • Shift configurations strictly govern working hours and punch timings without restricting week off schedules.
                </p>
                <p>
                  • Staff members can inherit this organization schedule or have customized individual day-wise off days in the Staff Overrides tab.
                </p>
              </div>
            </>
          ) : (
            /* Staff-wise Day Off Overrides */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Search staff by name, department, phone..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs flex-1 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-[11px] text-slate-500 shrink-0">
                  {filteredEmployees.length} staff
                </span>
              </div>

              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredEmployees.map((emp) => {
                  const empDays = getEmployeeWeekOffDays(emp);
                  const isCustom = emp.weekOffDays !== undefined && emp.weekOffDays.length > 0;

                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-purple-200 transition space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>{emp.name}</span>
                            <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-normal">
                              {emp.department}
                            </span>
                            {isCustom ? (
                              <span className="px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                                Custom Day Off
                              </span>
                            ) : (
                              <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 text-[10px] font-normal">
                                Company Default ({selectedCompanyDays.join(', ')})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Current Off Days: <strong>{empDays.length ? empDays.join(', ') : 'None'}</strong>
                          </div>
                        </div>

                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => handleResetEmployeeToCompany(emp)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-lg inline-flex items-center gap-1 transition cursor-pointer"
                            title="Reset to Company Default"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset to Default</span>
                          </button>
                        )}
                      </div>

                      {/* Day Toggles for Employee */}
                      <div className="grid grid-cols-7 gap-1">
                        {ALL_DAYS_OF_WEEK.map((day) => {
                          const isEmpOff = empDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleEmployeeDay(emp, day)}
                              className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-semibold transition cursor-pointer ${
                                isEmpOff
                                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                                  : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600'
                              }`}
                              title={`Toggle ${day} for ${emp.name}`}
                            >
                              <div className="uppercase">{day.slice(0, 3)}</div>
                              <div className="text-[9px] opacity-90">{isEmpOff ? 'OFF' : 'WORK'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            Active Schedule: <strong>{selectedCompanyDays.length ? selectedCompanyDays.join(', ') : '7 Days Working'}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 hover:bg-white text-slate-700 font-medium text-xs rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                handleSaveCompanySchedule();
                onClose();
              }}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-600/20 transition cursor-pointer"
              id="btn-save-day-wise-week-off"
            >
              Save & Apply Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
