const API_BASE_URL = 'http://localhost:5001/api';

// Types for API responses
export interface LoginResponse {
  message: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  user: {
    username: string;
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
}

export interface Attendance {
  _id?: string;
  studentId: string;
  regno: string;
  studentname: string;
  date: Date | string;
  status: 'Present' | 'Absent' | 'Late';
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
  late: number;
  attendancePercentage: number;
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
  createAdmin: async (username: string, password: string): Promise<{ message: string; admin: Admin }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
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

  updateAdmin: async (id: string, username: string, password: string): Promise<{ message: string; admin: Admin }> => {
    const response = await fetch(`${API_BASE_URL}/superadmin/admin/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
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

  getStudents: async (): Promise<Student[]> => {
    const response = await fetch(`${API_BASE_URL}/students`);

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

// Attendance API
export const attendanceAPI = {
  markAttendance: async (attendanceData: Omit<Attendance, '_id' | 'markedAt'>[], markedBy: string): Promise<{ message: string; results: any[] }> => {
    const response = await fetch(`${API_BASE_URL}/attendance/mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attendanceData, markedBy }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to mark attendance');
    }

    return response.json();
  },

  getAttendanceByDate: async (date: string): Promise<Attendance[]> => {
    const response = await fetch(`${API_BASE_URL}/attendance/date?date=${date}`);

    if (!response.ok) {
      throw new Error('Failed to fetch attendance');
    }

    return response.json();
  },

  getAttendanceByDateRange: async (startDate: string, endDate: string): Promise<Attendance[]> => {
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

  getAttendanceStats: async (startDate?: string, endDate?: string): Promise<AttendanceStats[]> => {
    let url = `${API_BASE_URL}/attendance/stats`;
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    }

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