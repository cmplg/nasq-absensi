import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, TaskLocation, AttendanceRecord } from '../types';

export interface AdminConfig {
  username: string;
  password: string;
  name: string;
  companyLogoUrl?: string;
  companyName?: string;
  inactivityTimeoutMinutes?: number; // Inactivity timeout in minutes (e.g. 5, 10, 15, 30, 60)
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  username: 'admin',
  password: 'testadmin',
  name: 'Administrator NASQ',
  companyLogoUrl: 'https://ik.imagekit.io/5iflbbg7x/NASQ_ICON.png',
  companyName: 'NASQ ABSENSI',
  inactivityTimeoutMinutes: 15,
};

export const SUPERUSER_EMPLOYEE: Employee = {
  id: 'emp-superuser',
  name: 'Super User (Developer)',
  email: 'developer@nasq.co.id',
  username: 'superuser',
  password: 'ultra',
  position: 'Developer / Full Privilege',
  department: 'System Developer',
  shiftStart: '00:00',
  shiftEnd: '23:59',
  masterPhotos: [
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="100%" height="100%" fill="%230f172a"/><circle cx="150" cy="110" r="55" fill="%231e293b"/><text x="50%" y="82%" font-family="sans-serif" font-weight="bold" font-size="28" fill="%2310b981" text-anchor="middle">SU</text></svg>',
  ],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  isDeveloper: true,
};

const rawUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.SUPABASE_URL ||
  '';
const rawKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim().replace(/^["']|["']$/g, '') : '';
export const supabaseAnonKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      console.log('⚡ [NASQ] Supabase Client Connected ke:', supabaseUrl);
    } catch (err) {
      console.warn('⚠️ [NASQ] Supabase init error:', err);
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getDatabaseConnectionStatus() {
  if (isSupabaseConfigured()) {
    return {
      type: 'supabase' as const,
      connected: true,
      url: supabaseUrl,
    };
  }
  return {
    type: 'local' as const,
    connected: false,
    url: 'Local Cache Mode',
  };
}

// ---------------- Admin Config ----------------
export async function fetchAdminConfigFromSupabase(): Promise<AdminConfig | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('admin_config')
      .select('username, password, name, company_logo_url, company_name')
      .eq('id', 'main')
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return {
        username: data.username,
        password: data.password,
        name: data.name,
        companyLogoUrl: data.company_logo_url || '',
        companyName: data.company_name || 'NASQ ABSENSI',
      };
    }
  } catch (err) {
    console.error('Error fetching admin_config from Supabase:', err);
  }
  return null;
}

export async function saveAdminConfigToSupabase(config: AdminConfig): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('admin_config').upsert({
      id: 'main',
      username: config.username,
      password: config.password,
      name: config.name,
      company_logo_url: config.companyLogoUrl || '',
      company_name: config.companyName || 'NASQ ABSENSI',
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error saving admin_config to Supabase:', err);
    return false;
  }
}

// ---------------- Employees ----------------
export async function fetchEmployeesFromSupabase(): Promise<Employee[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      const list: Employee[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email || '',
        username: r.username,
        password: r.password || '',
        position: r.position,
        department: r.department,
        shiftStart: r.shift_start || '08:00',
        shiftEnd: r.shift_end || '17:00',
        masterPhotos: Array.isArray(r.master_photos) ? r.master_photos : [],
        isActive: r.is_active ?? true,
        createdAt: r.created_at || new Date().toISOString(),
        isDeveloper: r.is_developer ?? false,
      }));

      const hasSuperuser = list.some(
        (e) => e.username?.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper
      );
      const fullList = hasSuperuser ? list : [SUPERUSER_EMPLOYEE, ...list];
      return fullList.map((e) => {
        if (e.username?.toLowerCase() === 'superuser' || e.id === 'emp-superuser' || e.isDeveloper) {
          return {
            ...e,
            username: 'superuser',
            password: 'ultra',
            isActive: true,
            isDeveloper: true,
          };
        }
        return e;
      });
    }
  } catch (err) {
    console.error('Error fetching employees from Supabase:', err);
  }
  return null;
}

export async function saveEmployeeToSupabase(emp: Employee): Promise<boolean> {
  const client = getSupabase();
  if (!client) {
    console.warn('⚠️ [NASQ] Supabase client belum siap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY');
    return false;
  }
  try {
    const { error } = await client.from('employees').upsert({
      id: emp.id,
      name: emp.name,
      email: emp.email || '',
      username: emp.username,
      password: emp.password || '',
      position: emp.position,
      department: emp.department,
      shift_start: emp.shiftStart,
      shift_end: emp.shiftEnd,
      master_photos: emp.masterPhotos || [],
      is_active: emp.isActive ?? true,
      created_at: emp.createdAt || new Date().toISOString(),
      is_developer: emp.isDeveloper ?? false,
    });
    if (error) {
      console.error('❌ [Supabase Error] Gagal menyimpan karyawan:', error.message, error.details || '', error.hint || '');
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.error('👉 Solusi: Tabel "employees" belum ada di Supabase. Buka Supabase SQL Editor dan jalankan query di file supabase_schema.sql!');
      }
      throw error;
    }
    console.log('✅ Karyawan tersimpan ke Supabase:', emp.name);
    return true;
  } catch (err: any) {
    console.error('Error saving employee to Supabase:', err?.message || err);
    return false;
  }
}

export async function deleteEmployeeFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('employees').delete().eq('id', id);
    if (error) throw error;
    console.log('✅ Karyawan dihapus dari Supabase:', id);
    return true;
  } catch (err) {
    console.error('Error deleting employee from Supabase:', err);
    return false;
  }
}

// ---------------- Tasks ----------------
export async function fetchTasksFromSupabase(): Promise<TaskLocation[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data) {
      return data.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        address: r.address || '',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        radiusMeters: Number(r.radius_meter || 150),
        assignedEmployeeIds: Array.isArray(r.assigned_employee_ids) ? r.assigned_employee_ids : [],
        startDate: r.start_date || new Date().toISOString().split('T')[0],
        endDate: r.end_date || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        status: r.status || 'aktif',
        locationPhoto: r.location_photo || '',
        shiftStart: r.shift_start || '08:00',
        shiftEnd: r.shift_end || '17:00',
        isActive: r.is_active ?? true,
        createdAt: r.created_at || new Date().toISOString(),
      }));
    }
  } catch (err) {
    console.error('Error fetching tasks from Supabase:', err);
  }
  return null;
}

export async function saveTaskToSupabase(task: TaskLocation): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('tasks').upsert({
      id: task.id,
      title: task.title,
      description: task.description || '',
      address: task.address || '',
      latitude: task.latitude,
      longitude: task.longitude,
      radius_meter: task.radiusMeters || 150,
      assigned_employee_ids: task.assignedEmployeeIds || [],
      start_date: task.startDate || new Date().toISOString().split('T')[0],
      end_date: task.endDate || new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
      status: task.status || 'aktif',
      location_photo: task.locationPhoto || '',
      shift_start: task.shiftStart || '08:00',
      shift_end: task.shiftEnd || '17:00',
      is_active: task.status === 'aktif',
      created_at: task.createdAt || new Date().toISOString(),
    });
    if (error) throw error;
    console.log('✅ Task tersimpan ke Supabase:', task.title);
    return true;
  } catch (err) {
    console.error('Error saving task to Supabase:', err);
    return false;
  }
}

export async function deleteTaskFromSupabase(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('tasks').delete().eq('id', id);
    if (error) throw error;
    console.log('✅ Task dihapus dari Supabase:', id);
    return true;
  } catch (err) {
    console.error('Error deleting task from Supabase:', err);
    return false;
  }
}

// ---------------- Attendance ----------------
export async function fetchAttendanceFromSupabase(): Promise<AttendanceRecord[] | null> {
  const client = getSupabase();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('attendance')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    if (data) {
      return data.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id,
        employeeName: r.employee_name,
        employeePosition: r.employee_position || '',
        type: r.type,
        timestamp: r.timestamp,
        dateString: r.date_string,
        timeString: r.time_string,
        status: r.status,
        verifiedPhoto: r.verified_photo || '',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        address: r.address || '',
        taskId: r.task_id || '',
        taskTitle: r.task_title || '',
        distanceFromTaskMeters: r.distance_from_task_meters ? Number(r.distance_from_task_meters) : undefined,
        earlyReasonCategory: r.early_reason_category || '',
        earlyReasonNotes: r.early_reason_notes || '',
        notes: r.notes || '',
      }));
    }
  } catch (err) {
    console.error('Error fetching attendance from Supabase:', err);
  }
  return null;
}

export async function saveAttendanceToSupabase(a: AttendanceRecord): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('attendance').upsert({
      id: a.id,
      employee_id: a.employeeId,
      employee_name: a.employeeName,
      employee_position: a.employeePosition || '',
      type: a.type,
      timestamp: a.timestamp,
      date_string: a.dateString,
      time_string: a.timeString,
      status: a.status,
      latitude: a.latitude,
      longitude: a.longitude,
      address: a.address || '',
      verified_photo: a.verifiedPhoto || '',
      notes: a.notes || '',
      early_reason_category: a.earlyReasonCategory || '',
      early_reason_notes: a.earlyReasonNotes || '',
      task_id: a.taskId || '',
      task_title: a.taskTitle || '',
      distance_from_task_meters: a.distanceFromTaskMeters || 0,
    });
    if (error) throw error;
    console.log('✅ Presensi tersimpan ke Supabase:', a.employeeName);
    return true;
  } catch (err) {
    console.error('Error saving attendance to Supabase:', err);
    return false;
  }
}

// ---------------- Realtime Listeners ----------------
export function subscribeToSupabaseRealtime(onUpdate: () => void): () => void {
  const client = getSupabase();
  if (!client) return () => {};

  const channel = client
    .channel('nasq_realtime_db')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
      console.log('⚡ Realtime Attendance update received from Supabase');
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      console.log('⚡ Realtime Tasks update received from Supabase');
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
      console.log('⚡ Realtime Employees update received from Supabase');
      onUpdate();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_config' }, () => {
      console.log('⚡ Realtime AdminConfig update received from Supabase');
      onUpdate();
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
