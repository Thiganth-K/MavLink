//import React from 'react';
import { FaEye, FaEyeSlash, FaSignOutAlt, FaComments } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { batchAPI, studentAPI } from '../../services/api';
import AdminChatModal from './AdminChat';

type BatchSummary = {
  batchId?: string;
  batchName?: string;
  dept?: string;
  studentCount?: number;
  adminId?: string;
};
type ProfileType = {
  username: string;
  password?: string | null;
  batches: BatchSummary[];
  adminId?: string;
  assignedBatchIds?: string[];
  role?: string;
};
type Props = {
  profileLoading: boolean;
  profileData: ProfileType | null;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((prev: boolean) => boolean)) => void;
  onLogout: () => void;
  open?: boolean;
  onClose?: () => void;
};

export default function AdminProfile(props: Props) {
  const { profileLoading, profileData, showPassword, setShowPassword, onLogout, open = true, onClose } = props;
  const [openChat, setOpenChat] = useState(false);
  const [localBatches, setLocalBatches] = useState<BatchSummary[]>(profileData?.batches || []);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileType | null>(profileData);


  // Auto-refresh profile from backend on mount, every 10s, and whenever panel is opened
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    let timer: number | null = null;

    // Fetch all batches and filter like Mark/View Attendance

    const fetchAndFilterBatches = async () => {
      setLoading(true);
      try {
        // Always refresh admin profile and update localStorage
        const res = await adminAPI.getProfile();
        if (res && res.profile) {
          const adminId = res.profile.adminId;
          const assignedBatchIds = res.profile.assignedBatchIds || [];
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...user, assignedBatchIds, adminId, username: res.profile.username }));

          // Now fetch all batches and filter
          const allBatches = await batchAPI.getBatches();
          let filteredBatches = allBatches.filter(
            (b: any) => assignedBatchIds.includes(b.batchId || '') && b.adminId === adminId
          );

          // For each batch, ensure studentCount is present
          filteredBatches = await Promise.all(filteredBatches.map(async (b: any) => {
            if (typeof b.studentCount === 'number') return b;
            try {
              const students = await studentAPI.getStudents(b.batchId);
              return { ...b, studentCount: Array.isArray(students) ? students.length : 0 };
            } catch {
              return { ...b, studentCount: 0 };
            }
          }));

          setProfile({ ...res.profile, batches: filteredBatches });
          setLocalBatches(filteredBatches);
        }
      } catch {}
      setLoading(false);
    };

    // Fetch immediately when panel is opened
    fetchAndFilterBatches();

    // Start auto-refresh loop
    const refreshLoop = async () => {
      await fetchAndFilterBatches();
      if (!mounted) return;
      timer = window.setTimeout(refreshLoop, 10000) as unknown as number;
    };
    timer = window.setTimeout(refreshLoop, 10000) as unknown as number;

    return () => {
      mounted = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [open]);

  // If parent updates profileData prop, sync it
  useEffect(() => {
    setProfile(profileData);
    if (profileData) {
      const adminId = profileData.adminId;
      const assignedBatchIds = profileData.assignedBatchIds || [];
      const batches: BatchSummary[] = Array.isArray(profileData.batches) ? profileData.batches : [];
      const filteredBatches = batches.filter(
        (b) => assignedBatchIds.includes(b.batchId || '') && b.adminId === adminId
      );
      setLocalBatches(filteredBatches);
    } else {
      setLocalBatches([]);
    }
  }, [profileData]);

  if (!open) return null;

  // The inner content of the profile panel (used both inline and overlay)
  const profileContent = (
    <>
      {profileLoading || loading ? (
        <div className="py-8 text-center">Loading…</div>
      ) : (
        <div id="profile-data" className="space-y-4">
          <div>
            <div className="text-sm text-gray-600">Username</div>
            <div className="text-purple-900 font-medium">{profile?.username || 'Admin'}</div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Password</div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type={showPassword ? 'text' : 'password'}
                value={profile?.password ?? ''}
                readOnly
                className="px-3 py-2 border border-purple-200 rounded-lg w-full bg-white"
              />
              <button
                onClick={() => setShowPassword((s: any) => !s)}
                className="px-2 py-2 rounded-md bg-purple-50 text-purple-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600">Assigned Batches (Dept) — Students</div>
            <div className="mt-3 space-y-2">
              {(localBatches.length === 0) && <div className="text-sm text-gray-600">No batches assigned</div>}
              {localBatches.map((b: any) => (
                <div key={b.batchId} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-purple-900">{b.batchId} {b.batchName ? `- ${b.batchName}` : ''}</div>
                    <div className="text-xs text-gray-600">Dept: {b.dept || '-'}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">{b.studentCount ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3">
            <div className="space-y-2">
              <button onClick={() => setOpenChat(true)} className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-lg hover:from-purple-700 hover:to-fuchsia-700 flex items-center justify-center gap-2" aria-label="Open chat">
                <FaComments className="w-4 h-4" />
                <span>Chat</span>
              </button>
              <button onClick={onLogout} className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white rounded-lg flex items-center justify-center gap-2"><FaSignOutAlt /> Logout</button>
            </div>
          </div>
          {openChat && <AdminChatModal onClose={() => setOpenChat(false)} />}
        </div>
      )}
    </>
  );

  // If an onClose handler is provided, render as a fullscreen drawer overlay.
  if (onClose) {
    return (
      <div className="fixed inset-0 z-[1000000] flex justify-end">
        <div className="absolute inset-0 bg-black/40 z-[999999]" onClick={() => onClose?.()} aria-hidden />
        <aside className="relative z-[1000001] w-full sm:w-96 md:w-80 lg:w-96 h-full bg-white p-6 overflow-auto shadow-2xl">
          {profileContent}
        </aside>
      </div>
    );
  }

  // Otherwise render only the inner content (for embedding inside an existing panel)
  return (
    <div>
      {profileContent}
    </div>
  );
}
