//import React from 'react';
import { FaEye, FaEyeSlash, FaSignOutAlt } from 'react-icons/fa';

type Props = {
  profileLoading: boolean;
  profileData: { username: string; password?: string | null; batches: Array<{ batchId?: string; batchName?: string; dept?: string; studentCount?: number }>; } | null;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  onLogout: () => void;
};

export default function AdminProfile({ profileLoading, profileData, showPassword, setShowPassword, onLogout }: Props) {
  return (
    <div>
      {profileLoading ? (
        <div className="py-8 text-center">Loading…</div>
      ) : (
        <div id="profile-data" className="space-y-4">
          <div>
            <div className="text-sm text-gray-600">Username</div>
            <div className="text-violet-900 font-medium">{profileData?.username || 'Admin'}</div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Password</div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={profileData?.password ?? ''}
                readOnly
                className="px-3 py-2 border border-violet-200 rounded-lg w-full bg-gray-50"
              />
              <button
                onClick={() => setShowPassword(s => !s)}
                className="px-2 py-2 rounded-md bg-violet-50 text-violet-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Assigned Batches (Dept) — Students</div>
            <div className="mt-3 space-y-2">
              {(!profileData || profileData.batches.length === 0) && <div className="text-sm text-gray-600">No batches assigned</div>}
              {profileData?.batches.map(b => (
                <div key={b.batchId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-violet-900">{b.batchId} {b.batchName ? `- ${b.batchName}` : ''}</div>
                    <div className="text-xs text-gray-600">Dept: {b.dept || '-'}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{b.studentCount ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <button onClick={onLogout} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"><FaSignOutAlt /> Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
