import { AttendanceRecord, Employee } from '../types';
import { formatIndonesianDate } from './geo';

export interface RekapExportData {
  title?: string;
  subtitle?: string;
  filterLabel?: string;
  employeeName?: string;
  uniqueDays: number;
  totalHoursWorked: number;
  remainingMinsWorked: number;
  totalMasuk: number;
  totalTepat: number;
  totalTelat: number;
  totalPulangCepat: number;
  totalIzin: number;
  records: AttendanceRecord[];
}

/**
 * Generates a clean formatted text string optimized for WhatsApp sharing
 */
export function generateWhatsAppRekapText(data: RekapExportData): string {
  const {
    title = 'REKAP PRESENSI & JAM KERJA',
    filterLabel = 'Semua Periode',
    employeeName,
    uniqueDays,
    totalHoursWorked,
    remainingMinsWorked,
    totalTepat,
    totalTelat,
    totalPulangCepat,
    totalIzin,
    records,
  } = data;

  let text = `📊 *${title.toUpperCase()}*\n`;
  text += `🏢 *Sistem Presensi Karyawan GPS*\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🗓️ *Periode/Filter*: ${filterLabel}\n`;
  if (employeeName) {
    text += `👤 *Karyawan*: ${employeeName}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  text += `📈 *RINGKASAN STATISTIK*:\n`;
  text += `• Total Hari Hadir: *${uniqueDays} Hari*\n`;
  text += `• Total Jam Kerja: *${totalHoursWorked}j ${remainingMinsWorked}m*\n`;
  text += `• Tepat Waktu: *${totalTepat} kali*\n`;
  text += `• Terlambat: *${totalTelat} kali*\n`;
  text += `• Pulang Cepat: *${totalPulangCepat} kali*\n`;
  text += `• Izin / Tidak Hadir: *${totalIzin} kali*\n\n`;

  text += `📋 *DETAIL RIWAYAT PRESENSI (${Math.min(records.length, 25)} Entri)*:\n`;

  const recentRecords = records.slice(0, 25);
  recentRecords.forEach((r, idx) => {
    const statusText =
      r.status === 'tepat_waktu'
        ? '✅ Tepat Waktu'
        : r.status === 'terlambat'
        ? '⏰ Terlambat'
        : r.status === 'pulang_cepat'
        ? '⚠️ Pulang Cepat'
        : r.type === 'izin'
        ? '📄 Izin / Tidak Hadir'
        : 'Selesai';

    const typeText =
      r.type === 'masuk' ? 'Absen Datang' : r.type === 'pulang' ? 'Absen Pulang' : 'Pengajuan Izin';

    text += `\n${idx + 1}. *${r.employeeName}* (${r.dateString})\n`;
    text += `   • Jenis: ${typeText} (${r.timeString.substring(0, 5)} WIB)\n`;
    text += `   • Status: ${statusText}\n`;
    if (r.taskTitle) {
      text += `   • Tugas: ${r.taskTitle}\n`;
    }
    if (r.earlyReasonCategory) {
      text += `   • Alasan: ${r.earlyReasonCategory}${r.earlyReasonNotes ? ` - ${r.earlyReasonNotes}` : ''}\n`;
    }
  });

  if (records.length > 25) {
    text += `\n_... dan ${records.length - 25} entri lainnya._\n`;
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `_Dihasilkan otomatis oleh Sistem Presensi GPS pada ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}_`;

  return text;
}

/**
 * Triggers clean PDF print view using browser print window formatted as formal report
 */
export function printRekapPDF(data: RekapExportData) {
  const {
    title = 'LAPORAN REKAPITULASI PRESENSI & JAM KERJA KARYAWAN',
    filterLabel = 'Semua Periode',
    employeeName,
    uniqueDays,
    totalHoursWorked,
    remainingMinsWorked,
    totalMasuk,
    totalTepat,
    totalTelat,
    totalPulangCepat,
    totalIzin,
    records,
  } = data;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    alert('Browser memblokir popup cetak. Harap izinkan popup pada browser Anda.');
    return;
  }

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rowsHtml = records
    .map(
      (r, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
      <td style="padding: 8px; text-align: center; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px; font-weight: bold; color: #0f172a;">${r.employeeName}</td>
      <td style="padding: 8px; color: #334155;">${r.dateString}</td>
      <td style="padding: 8px; font-weight: bold;">
        ${
          r.type === 'masuk'
            ? '<span style="color: #059669;">Datang</span>'
            : r.type === 'pulang'
            ? '<span style="color: #4f46e5;">Pulang</span>'
            : '<span style="color: #2563eb;">Izin</span>'
        }
      </td>
      <td style="padding: 8px;">${r.timeString.substring(0, 5)} WIB</td>
      <td style="padding: 8px;">
        ${
          r.status === 'tepat_waktu'
            ? '<span style="color: #059669; font-weight: bold;">Tepat Waktu</span>'
            : r.status === 'terlambat'
            ? '<span style="color: #d97706; font-weight: bold;">Terlambat</span>'
            : r.status === 'pulang_cepat'
            ? '<span style="color: #e11d48; font-weight: bold;">Pulang Cepat</span>'
            : r.type === 'izin'
            ? '<span style="color: #2563eb; font-weight: bold;">Izin Dikonfirmasi</span>'
            : 'Selesai'
        }
      </td>
      <td style="padding: 8px; color: #475569; max-width: 180px;">
        ${r.taskTitle ? `<b>[Tugas: ${r.taskTitle}]</b> ` : ''}
        ${r.earlyReasonCategory ? `Alasan: ${r.earlyReasonCategory}` : r.address || '-'}
      </td>
    </tr>
  `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          color: #1e293b;
          background: #ffffff;
        }
        .header {
          border-bottom: 3px double #0f172a;
          padding-bottom: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .header-title h1 {
          font-size: 18px;
          margin: 0;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-title p {
          font-size: 11px;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .header-meta {
          text-align: right;
          font-size: 11px;
          color: #475569;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        .summary-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 10px;
          border-radius: 8px;
          text-align: center;
        }
        .summary-card .label {
          font-size: 9px;
          font-weight: bold;
          text-transform: uppercase;
          color: #64748b;
        }
        .summary-card .value {
          font-size: 16px;
          font-weight: bold;
          color: #0f172a;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          text-align: left;
          padding: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #94a3b8;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 16px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
          🖨️ Cetak / Simpan PDF
        </button>
      </div>

      <div class="header">
        <div class="header-title">
          <h1>${title}</h1>
          <p>Sistem Manajemen Presensi &amp; Penugasan GPS Karyawan</p>
        </div>
        <div class="header-meta">
          <p><b>Tanggal Cetak:</b> ${todayFormatted}</p>
          <p><b>Periode/Filter:</b> ${filterLabel}</p>
          ${employeeName ? `<p><b>Karyawan:</b> ${employeeName}</p>` : ''}
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Total Hadir</div>
          <div class="value">${uniqueDays} Hari</div>
        </div>
        <div class="summary-card">
          <div class="label">Jam Kerja</div>
          <div class="value" style="color: #059669;">${totalHoursWorked}j ${remainingMinsWorked}m</div>
        </div>
        <div class="summary-card">
          <div class="label">Tepat Waktu</div>
          <div class="value" style="color: #2563eb;">${totalTepat}</div>
        </div>
        <div class="summary-card">
          <div class="label">Terlambat</div>
          <div class="value" style="color: #d97706;">${totalTelat}</div>
        </div>
        <div class="summary-card">
          <div class="label">Pulang Cepat / Izin</div>
          <div class="value" style="color: #e11d48;">${totalPulangCepat + totalIzin}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th>Nama Karyawan</th>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Waktu</th>
            <th>Status</th>
            <th>Lokasi / Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding: 20px; color:#94a3b8;">Tidak ada data presensi.</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div>Laporan ini dihasilkan secara otomatis oleh Sistem Presensi Karyawan berbasis GPS.</div>
        <div>Dokumen Resmi Perusahaan</div>
      </div>

      <script>
        // Auto trigger print window after load
        window.onload = function() {
          setTimeout(() => {
            window.print();
          }, 400);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
