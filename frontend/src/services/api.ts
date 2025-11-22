// Use environment override if provided, fallback to backend default port 3000
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Types for API responses
export interface LoginResponse {
  message: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  user: {
    username: string;
    adminId?: string;
    assignedBatchIds?: string[];
  };
}

export interface Student {
  _id?: string;
  regno?: string;
  studentname?: string;
  dept?: string;
  email?: string;
  phno?: string;
  [key: string]: any;
}

export interface Admin {
  _id?: string;
  username: string;
  password: string;
  role: string;
  adminId?: string;
  assignedBatchIds?: string[];
}

export interface BatchStudent {
  name: string;
  regno: string;
  dept: string;
  email: string;
  mobile: string;
}

export interface Batch {
  _id?: string;
  batchId?: string;
  batchName: string;
  batchYear: number;
  deptId?: string;
  adminId?: string;
  students: BatchStudent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  _id?: string;
  studentId: string;
  regno: string;
  studentname: string;
  date: Date | string;
  session: 'FN' | 'AN';
  status: 'Present' | 'Absent' | 'On-Duty';
  markedBy: string;
  markedAt?: Date | string;
}

export interface AttendanceStats {
  _id: string;
  regno: string;
  studentname: string;
  totalClasses: number;
  present: number;
  absent: number;
  onDuty: number;
  attendancePercentage: number;
}

export interface AttendanceSummary {
  date: string;
  FN: {
    total: number;
    present: number;
    absent: number;
    onDuty: number;
  };
  AN: {
    total: number;
    present: number;
    absent: number;
    onDuty: number;
  };
}

export interface CombinedAttendanceSummary {
  date: string;
  fn: {
    total: number;
    present: number;
    absent: number;
    onDuty: number;
  };
  an: {
    total: number;
    present: number;
    absent: number;
    onDuty: number;
  };
}

export interface SessionSummary {
  date: string;
  FN: {
    session: 'FN';
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    onDutyCount: number;
  };
  AN: {
    session: 'AN';
    totalRecords: number;
    presentCount: number;
    absentCount: number;
    onDutyCount: number;
  };
  totalRecords: number;
}

// Authentication API
export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }

    return response.json();
  },
};

// Super Admin API
export const superAdminAPI = {
  createAdmin: async (adminId: string, username: string, password: string): Promise<{ message: string; admin: Admin }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminId, username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create admin');
    }

    return response.json();
  },

  getAdmins: async (): Promise<Admin[]> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin`);

    if (!response.ok) {
      throw new Error('Failed to fetch admins');
    }

    return response.json();
  },

  updateAdmin: async (id: string, adminId: string, username: string, password: string): Promise<{ message: string; admin: Admin }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminId, username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update admin');
    }

    return response.json();
  },

  deleteAdmin: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete admin');
    }

    return response.json();
  },
};

// Student API
export const studentAPI = {
  uploadCSV: async (file: File): Promise<{ message: string; inserted: number }> => {
    const formData = new FormData();
    formData.append('csv', file);

    const response = await fetch(`${API_BASE_URL}/students/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload CSV');
    }

    return response.json();
  },

  createStudent: async (studentData: Student): Promise<{ message: string; student: Student }> => {
    const response = await fetch(`${API_BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create student');
    }

    return response.json();
  },

  getStudents: async (batchId?: string): Promise<Student[]> => {
    const url = batchId ? `${API_BASE_URL}/students?batchId=${encodeURIComponent(batchId)}` : `${API_BASE_URL}/students`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch students');
    }

    return response.json();
  },

  getStudentById: async (id: string): Promise<Student> => {
    const response = await fetch(`${API_BASE_URL}/students/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch student');
    }

    return response.json();
  },

  updateStudent: async (id: string, studentData: Student): Promise<{ message: string; student: Student }> => {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(studentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update student');
    }

    return response.json();
  },

  deleteStudent: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete student');
    }

    return response.json();
  },

  deleteAllStudents: async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
    const response = await fetch(`${API_BASE_URL}/students/delete-all`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete all students');
    }

    return response.json();
  },
};

// Backend API Response Interfaces
interface AttendanceAPIResponse {
  success: boolean;
  message: string;
  data?: Attendance[];
  results?: any[];
  errors?: any[];
  summary?: any;
  totalProcessed?: number;
  successCount?: number;
  errorCount?: number;
  date?: string;
  session?: string;
  groupedByDate?: any;
}

interface SessionSummaryAPIResponse {
  success: boolean;
  message: string;
  date: string;
  summary: {
    FN: {
      session: 'FN';
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      onDutyCount: number;
    };
    AN: {
      session: 'AN';
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      onDutyCount: number;
    };
    totalRecords: number;
  };
}

interface DatesSummaryAPIResponse {
  success: boolean;
  message: string;
  data: Array<{
    date: string;
    FN: {
      total: number;
      present: number;
      absent: number;
      onDuty: number;
    };
    AN: {
      total: number;
      present: number;
      absent: number;
      onDuty: number;
    };
  }>;
}

// Attendance API
export const attendanceAPI = {
  markAttendance: async (
    attendanceData: Omit<Attendance, '_id' | 'markedAt'>[],
    markedBy: string,
    batchId?: string
  ): Promise<{ message: string; results: any[] }> => {
    const storedUser = localStorage.getItem('user');
    let adminId: string | undefined;
    try {
      adminId = storedUser ? JSON.parse(storedUser).adminId : undefined;
    } catch {}
  // Mark attendance for a specific session
  markAttendance: async (
    attendanceData: Array<{
      studentId: string;
      regno: string;
      studentname: string;
      date: string;
      session: 'FN' | 'AN';
      status: 'Present' | 'Absent' | 'On-Duty';
    }>,
    markedBy: string
  ): Promise<AttendanceAPIResponse> => {
    const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': localStorage.getItem('role') || '',
        'X-Admin-Id': adminId || ''
      },
      body: JSON.stringify({ attendanceData, markedBy, batchId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark attendance');
    }

    return response.json();
  },

  getAttendanceByDate: async (date: string, batchId?: string): Promise<Attendance[]> => {
    let url = `${API_BASE_URL}/attendance/date?date=${date}`;
    if (batchId) url += `&batchId=${encodeURIComponent(batchId)}`;
    const response = await fetch(url);
  // Get attendance for a date (both FN and AN sessions)
  getAttendanceByDate: async (date: string): Promise<Attendance[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance/date?date=${date}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    const data: AttendanceAPIResponse = await response.json();
    return data.data || [];
  },

  // Get attendance for a specific date and session (FN or AN only)
  getAttendanceByDateAndSession: async (date: string, session: 'FN' | 'AN'): Promise<Attendance[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance/date/session?date=${date}&session=${session}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    const data: AttendanceAPIResponse = await response.json();
    return data.data || [];
  },

  // Get session-wise summary for a specific date (stats for both FN and AN)
  getSessionSummaryByDate: async (date: string): Promise<SessionSummaryAPIResponse> => {
    const response = await fetch(`${API_BASE_URL}/attendance/date/summary?date=${date}`);

    if (!response.ok) {
      throw new Error('Failed to fetch session summary');
    }

    return response.json();
  },

  // Get attendance summary by multiple dates (comma-separated)
  getAttendanceByDateSummary: async (dates: string[]): Promise<DatesSummaryAPIResponse> => {
    const datesString = dates.join(',');
    const response = await fetch(`${API_BASE_URL}/attendance/summary?dates=${datesString}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance summary');
    }

    return response.json();
  },

  // Get attendance by date range (with session grouping)
  getAttendanceByDateRange: async (startDate: string, endDate: string): Promise<AttendanceAPIResponse> => {
    const response = await fetch(`${API_BASE_URL}/attendance/range?startDate=${startDate}&endDate=${endDate}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    return response.json();
  },

  getAttendanceByStudent: async (studentId: string): Promise<Attendance[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance/student/${studentId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch student attendance');
    }

    return response.json();
  },

  getAllAttendance: async (): Promise<Attendance[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    return response.json();
  },

  getAttendanceStats: async (startDate?: string, endDate?: string, batchId?: string): Promise<AttendanceStats[]> => {
    const params: string[] = [];
    if (startDate && endDate) params.push(`startDate=${startDate}`, `endDate=${endDate}`);
    if (batchId) params.push(`batchId=${encodeURIComponent(batchId)}`);
    const query = params.length ? `?${params.join('&')}` : '';
    let url = `${API_BASE_URL}/attendance/stats${query}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance statistics');
    }

    return response.json();
  },

  deleteAttendance: async (id: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete attendance record');
    }

    return response.json();
  },
};

// Batch API
export const batchAPI = {
  getBatches: async (): Promise<Batch[]> => {
    const res = await fetch(`${API_BASE_URL}/batches`);
    if (!res.ok) throw new Error('Failed to fetch batches');
    return res.json();
  },
  getBatch: async (id: string): Promise<Batch> => {
    const res = await fetch(`${API_BASE_URL}/batches/${id}`);
    if (!res.ok) throw new Error('Failed to fetch batch');
    return res.json();
  },
  createBatch: async (data: { batchId: string; batchName: string; batchYear: number; deptId: string; adminId?: string; studentsText: string }): Promise<{ message: string; batch: Batch }> => {
    const res = await fetch(`${API_BASE_URL}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': localStorage.getItem('role') || ''
      },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to create batch');
    return body;
  },
  updateBatch: async (id: string, data: { batchName?: string; batchYear?: number; deptId?: string; adminId?: string; studentsText?: string }): Promise<{ message: string; batch: Batch }> => {
    const res = await fetch(`${API_BASE_URL}/batches/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': localStorage.getItem('role') || ''
      },
      body: JSON.stringify(data)
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to update batch');
    return body;
  },
  deleteBatch: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE_URL}/batches/${id}`, {
      method: 'DELETE',
      headers: {
        'X-Role': localStorage.getItem('role') || ''
      }
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to delete batch');
    return body;
  },
  assignAdmin: async (batchId: string, adminId: string): Promise<{ message: string; batch: Batch }> => {
    const res = await fetch(`${API_BASE_URL}/batches/assign-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': localStorage.getItem('role') || ''
      },
      body: JSON.stringify({ batchId, adminId })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to assign admin');
    return body;
  }
};

// Department API
export const departmentAPI = {
  createDepartment: async (deptId: string, deptName: string) => {
    const res = await fetch(`${API_BASE_URL}/departments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Role': localStorage.getItem('role') || ''
      },
      body: JSON.stringify({ deptId, deptName })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.message || 'Failed to create department');
    return body;
  },
  listDepartments: async () => {
    const res = await fetch(`${API_BASE_URL}/departments`);
    if (!res.ok) throw new Error('Failed to fetch departments');
    return res.json();
  }
};