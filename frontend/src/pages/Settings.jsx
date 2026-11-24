import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Shield,
  Server,
  Database,
  CheckCircle2,
  RefreshCw,
  Lock,
  Smartphone,
  Laptop,
  Trash2,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useHealthCheck } from '../hooks/useHealthCheck.js';
import { authService } from '../services/api.js';

export function Settings() {
  const { toggleTheme, isDark } = useTheme();
  const { backendStatus, databaseStatus, refresh } = useHealthCheck();
  const { changePassword, logout } = useAuth();
  const toast = useToast();

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    interviewReports: true,
    streakReminders: true,
    weeklyDigest: false
  });

  // Security: Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Security: Sessions State
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const fetchSessions = async () => {
    try {
      setSessionsLoading(true);
      const res = await authService.getSessions();
      setSessions(res.data?.sessions || []);
    } catch (err) {
      console.warn('Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      await changePassword(passwordData);
      toast.success('Password changed successfully! Other sessions have been revoked.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      fetchSessions();
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await authService.revokeSession(sessionId);
      toast.success('Session revoked.');
      fetchSessions();
    } catch (err) {
      toast.error(err.message || 'Could not revoke session.');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await authService.revokeAllSessions();
      toast.success('All other sessions terminated.');
      fetchSessions();
    } catch (err) {
      toast.error(err.message || 'Error revoking sessions.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Application Settings"
        subtitle="Manage appearance, notifications, security credentials, and active device sessions."
      />

      {/* Security & Password Management */}
      <Card className="p-6 space-y-5">
        <div className="border-b border-slate-100 dark:border-[#27324A]/60 pb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-violet-500" />
            Security & Password
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Ensure your account is protected with a strong, distinct password.
          </p>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="sm" isLoading={passwordLoading}>
            {passwordLoading ? 'Updating Password...' : 'Update Password'}
          </Button>
        </form>
      </Card>

      {/* Active Device Sessions */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27324A]/60 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Laptop className="h-4 w-4 text-violet-500" />
              Active Sessions & Devices
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Devices currently signed in with your refresh authorization token.
            </p>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevokeAllSessions}
              className="text-red-500 hover:text-red-600 border-red-500/30 hover:bg-red-500/10"
            >
              Sign Out Other Devices
            </Button>
          )}
        </div>

        {sessionsLoading ? (
          <p className="text-xs text-slate-400 py-3">Loading active sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-slate-500 py-3">No active sessions found.</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                    {s.userAgent.toLowerCase().includes('mobile') ? (
                      <Smartphone className="h-4 w-4" />
                    ) : (
                      <Laptop className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        {s.userAgent}
                      </p>
                      {s.isCurrent && (
                        <Badge variant="success" size="sm">
                          Current Device
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      IP: {s.ipAddress} • Last active: {new Date(s.lastActive).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {!s.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(s.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-1.5"
                    title="Revoke session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Theme Preferences */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#27324A]/60 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interface Theme</h3>
            <p className="text-xs text-slate-500">
              Toggle between deep dark navy SaaS mode and clean high-contrast light mode.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
            iconLeft={isDark ? Sun : Moon}
          >
            {isDark ? 'Switch to Light' : 'Switch to Dark'}
          </Button>
        </div>

        {/* Notifications */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notification Preferences</h3>
          <div className="space-y-2.5 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] cursor-pointer">
              <span>Send notification when AI evaluation report is generated</span>
              <input
                type="checkbox"
                checked={notifications.interviewReports}
                onChange={() => setNotifications({ ...notifications, interviewReports: !notifications.interviewReports })}
                className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0B1020] border border-slate-200 dark:border-[#27324A] cursor-pointer">
              <span>Daily interview practice streak reminders</span>
              <input
                type="checkbox"
                checked={notifications.streakReminders}
                onChange={() => setNotifications({ ...notifications, streakReminders: !notifications.streakReminders })}
                className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
              />
            </label>
          </div>
        </div>

        {/* System & Infrastructure Status */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#27324A]/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-violet-500" />
              API & Infrastructure Status
            </h3>
            <button
              onClick={refresh}
              className="text-xs text-violet-500 hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="h-3 w-3" /> Recheck
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Express Backend Service</p>
                <p className="text-[11px] text-slate-500">GET /api/health</p>
              </div>
              <Badge variant={backendStatus.connected ? 'success' : 'danger'} size="sm">
                {backendStatus.connected ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#27324A] bg-slate-50 dark:bg-[#0B1020] flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">PostgreSQL via Prisma</p>
                <p className="text-[11px] text-slate-500">GET /api/health/database</p>
              </div>
              <Badge variant={databaseStatus.connected ? 'success' : 'danger'} size="sm">
                {databaseStatus.connected ? 'Connected' : 'Offline'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Settings;
