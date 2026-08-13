export type UserRole = 'karyawan' | 'admin';

export interface Employee {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  position: string;
  department: string;
  shiftStart: string; // e.g. "08:00"
  shiftEnd: string;   // e.g. "17:00"
  masterPhotos: string[]; // Base64 or image URLs for face verification
  isActive: boolean;
  createdAt: string;
  isDeveloper?: boolean;
}

export interface TaskLocation {
  id: string;
  title: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number; // radius for attendance e.g. 100
  assignedEmployeeIds: string[];
  startDate: string;
  endDate: string;
  status: 'aktif' | 'selesai';
  locationPhoto?: string; // Base64 or image URL of the task location
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  type: 'masuk' | 'pulang' | 'izin';
  timestamp: string; // ISO string
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm:ss
  status: 'tepat_waktu' | 'terlambat' | 'pulang_cepat' | 'izin';
  verifiedPhoto: string; // captured photo base64 with GPS & timestamp watermark
  latitude: number;
  longitude: number;
  address: string;
  taskId?: string;
  taskTitle?: string;
  distanceFromTaskMeters?: number;
  earlyReasonCategory?: string; // 'Pekerjaan selesai' | 'Ada urusan keluarga' | 'Kecelakaan kerja' | 'Anggota keluarga sakit' | 'Lainnya'
  earlyReasonNotes?: string;    // Custom typed text if 'Lainnya'
  notes?: string;
}

export interface UserSession {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  employeeId?: string;
  isDeveloper?: boolean;
}
