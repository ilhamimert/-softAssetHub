import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi, channelApi } from '@/api/client';
import type { Channel } from '@/types';
import {
  FileText, Plus, Trash2, Download, Eye, BarChart3,
  Calendar, User, Filter, FileBarChart, Activity, Wrench, Bell,
} from 'lucide-react';
import { cn, inputCls, formatDate, formatDateTime } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { FormField } from '@/components/ui/FormField';

// ─── Types ────────────────────────────────────────────────────
interface Report {
  reportId: number;
  reportName: string;
  reportType: string;
  channelId: number | null;
  channelName: string | null;
  dateRangeFrom: string | null;
  dateRangeTo: string | null;
  generatedDate: string;
  generatedByName: string | null;
  reportData: string | null;
  fileUrl: string | null;
  expiryDate: string | null;
}

interface ReportForm {
  reportName: string;
  reportType: string;
  channelId: string;
  dateRangeFrom: string;
  dateRangeTo: string;
  notes: string;
}

const EMPTY_FORM: ReportForm = {
  reportName: '', reportType: 'AssetInventory', channelId: '',
  dateRangeFrom: '', dateRangeTo: '', notes: '',
};

const REPORT_TYPES = [
  { value: 'AssetInventory',   label: 'Varlık Envanteri',    icon: FileBarChart, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
  { value: 'MaintenanceLog',   label: 'Bakım Günlüğü',       icon: Wrench,       color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20'  },
  { value: 'MonitoringReport', label: 'Monitoring Raporu',   icon: Activity,     color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20'  },
  { value: 'AlertSummary',     label: 'Uyarı Özeti',         icon: Bell,         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20'    },
  { value: 'LicenseReport',    label: 'Lisans Raporu',        icon: FileText,     color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { value: 'CostAnalysis',     label: 'Maliyet Analizi',     icon: BarChart3,    color: 'text-cyan-400',   bg: 'bg-cyan-500/10',   border: 'border-cyan-500/20'   },
  { value: 'Custom',           label: 'Özel Rapor',          icon: FileText,     color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/20'   },
];

function getTypeConfig(type: string) {
  return REPORT_TYPES.find(t => t.value === type) ?? REPORT_TYPES[REPORT_TYPES.length - 1];
}

// ─── Report card ──────────────────────────────────────────────
function ReportCard({
  report, onDelete, onView,
}: { report: Report; onDelete: (r: Report) => void; onView: (r: Report) => void }) {
  const cfg = getTypeConfig(report.reportType);
  const Icon = cfg.icon;
  const isExpired = report.expiryDate && new Date(report.expiryDate) < new Date();

  return (
    <div className={cn(
      'bg-[#1a1d23] border rounded-lg p-4 hover:border-[#383e4a] transition-colors group',
      isExpired ? 'border-red-500/20 opacity-60' : 'border-[#2e333d]',
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('w-9 h-9 rounded flex items-center justify-center flex-shrink-0 border', cfg.bg, cfg.border)}>
          <Icon size={15} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-display font-semibold text-[#e4e7ec] truncate">{report.reportName}</p>
          <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', cfg.bg, cfg.color, cfg.border)}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {report.channelName && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#8b919e]">
            <Filter size={9} /> {report.channelName}
          </div>
        )}
        {(report.dateRangeFrom || report.dateRangeTo) && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#8b919e]">
            <Calendar size={9} />
            {formatDate(report.dateRangeFrom ?? undefined)} — {formatDate(report.dateRangeTo ?? undefined)}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-[10px] text-[#8b919e]">
          <User size={9} /> {report.generatedByName ?? '-'}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#8b919e]">
          <Calendar size={9} /> Oluşturulma: {formatDateTime(report.generatedDate)}
        </div>
        {isExpired && (
          <p className="text-[10px] text-red-400 font-mono-val">Son kullanma tarihi geçti</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-[#2e333d]">
        {report.reportData && (
          <button
            onClick={() => onView(report)}
            className="flex items-center gap-1 text-[10px] text-[#8b919e] hover:text-cyan-400 transition-colors"
          >
            <Eye size={11} /> Görüntüle
          </button>
        )}
        {report.fileUrl && (
          <a
            href={report.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-[#8b919e] hover:text-green-400 transition-colors"
          >
            <Download size={11} /> İndir
          </a>
        )}
        <div className="flex-1" />
        <button
          onClick={() => onDelete(report)}
          className="opacity-0 group-hover:opacity-100 p-1 text-[#8b919e] hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── View modal ───────────────────────────────────────────────
function ReportViewModal({ report, onClose }: { report: Report | null; onClose: () => void }) {
  if (!report) return null;
  return (
    <Modal open={!!report} onClose={onClose} title={report.reportName}>
      <div className="space-y-3">
        <div className="bg-[#111318] border border-[#2e333d] rounded p-3 max-h-64 overflow-y-auto">
          <pre className="text-[11px] text-[#e4e7ec] font-mono-val whitespace-pre-wrap break-words">
            {report.reportData ?? 'İçerik yok'}
          </pre>
        </div>
        <button onClick={onClose}
          className="w-full py-2 text-xs font-mono-val rounded border border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec] hover:bg-[#22262e] transition-all">
          Kapat
        </button>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function Reports() {
  const qc = useQueryClient();

  const [channelFilter, setChannelFilter] = useState('');
  const [typeFilter, setTypeFilter]       = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [viewReport, setViewReport]       = useState<Report | null>(null);
  const [form, setForm]                   = useState<ReportForm>(EMPTY_FORM);
  const [formError, setFormError]         = useState('');

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });
  const channels: Channel[] = channelsData?.data?.data ?? [];

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['reports', channelFilter, typeFilter],
    queryFn: () => reportApi.getAll({
      channelId:  channelFilter || undefined,
      reportType: typeFilter || undefined,
    }),
  });
  const reports: Report[] = reportsData?.data?.data ?? [];

  const createReport = useMutation({
    mutationFn: (data: object) => reportApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => setFormError(e?.response?.data?.message ?? 'Hata'),
  });

  const deleteReport = useMutation({
    mutationFn: (id: number) => reportApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  function submit() {
    if (!form.reportName.trim()) { setFormError('Rapor adı zorunludur'); return; }
    createReport.mutate({
      reportName:    form.reportName.trim(),
      reportType:    form.reportType,
      channelId:     form.channelId ? parseInt(form.channelId) : undefined,
      dateRangeFrom: form.dateRangeFrom || undefined,
      dateRangeTo:   form.dateRangeTo || undefined,
      reportData:    form.notes || undefined,
    });
  }

  // Type stats
  const typeCounts = REPORT_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t.value] = reports.filter(r => r.reportType === t.value).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-display font-bold text-[#e4e7ec] flex items-center gap-2">
            <FileText size={18} className="text-amber-400" />
            Raporlar
          </h1>
          <p className="text-[11px] text-[#8b919e] mt-0.5">Sistem raporları ve analiz kayıtları</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono-val rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-[#5b8fd5]/20 transition-all"
        >
          <Plus size={13} /> Rapor Oluştur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-[#1a1d23] border border-[#2e333d] rounded-lg px-4 py-3">
          <p className="text-xl font-display font-bold text-[#e4e7ec]">{reports.length}</p>
          <p className="text-[10px] text-[#8b919e] uppercase tracking-wider">Toplam Rapor</p>
        </div>
        {REPORT_TYPES.slice(0, 3).map(t => (
          <div key={t.value} className="bg-[#1a1d23] border border-[#2e333d] rounded-lg px-4 py-3">
            <p className={cn('text-xl font-display font-bold', t.color)}>{typeCounts[t.value] ?? 0}</p>
            <p className="text-[10px] text-[#8b919e] uppercase tracking-wider truncate">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('')}
          className={cn('px-3 py-1 text-[10px] rounded border font-mono-val transition-colors',
            !typeFilter ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-[#1a1d23] text-[#8b919e] border-[#2e333d] hover:border-[#383e4a]')}
        >
          Tümü ({reports.length})
        </button>
        {REPORT_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => setTypeFilter(t.value === typeFilter ? '' : t.value)}
            className={cn('px-3 py-1 text-[10px] rounded border font-mono-val transition-colors',
              typeFilter === t.value ? cn(t.bg, t.color, t.border) : 'bg-[#1a1d23] text-[#8b919e] border-[#2e333d] hover:border-[#383e4a]')}
          >
            {t.label} ({typeCounts[t.value] ?? 0})
          </button>
        ))}
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-3">
        <select
          value={channelFilter}
          onChange={e => setChannelFilter(e.target.value)}
          className="text-xs bg-[#1a1d23] border border-[#2e333d] rounded px-3 py-1.5 text-[#e4e7ec] focus:outline-none focus:border-[#5b8fd5]/40"
        >
          <option value="">Tüm Kanallar</option>
          {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <p className="text-xs text-[#8b919e]">Yükleniyor...</p>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText size={32} className="text-[#2e333d] mb-3" />
          <p className="text-sm text-[#8b919e]">Henüz rapor yok</p>
          <button
            onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm(true); }}
            className="mt-3 text-xs text-amber-400 hover:underline"
          >
            + İlk raporu oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {reports.map(r => (
            <ReportCard
              key={r.reportId}
              report={r}
              onView={setViewReport}
              onDelete={rep => {
                if (confirm(`"${rep.reportName}" silinsin mi?`)) deleteReport.mutate(rep.reportId);
              }}
            />
          ))}
        </div>
      )}

      {/* Create form modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Yeni Rapor Oluştur"
      >
        <div className="space-y-3">
          <FormField label="Rapor Adı *">
            <input className={inputCls} value={form.reportName}
              onChange={e => setForm(f => ({ ...f, reportName: e.target.value }))}
              placeholder="Ocak 2025 Varlık Envanteri" />
          </FormField>
          <FormField label="Rapor Tipi">
            <select className={inputCls} value={form.reportType}
              onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}>
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Kanal (İsteğe bağlı)">
            <select className={inputCls} value={form.channelId}
              onChange={e => setForm(f => ({ ...f, channelId: e.target.value }))}>
              <option value="">Tüm kanallar</option>
              {channels.map(c => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Başlangıç Tarihi">
              <input className={inputCls} type="date" value={form.dateRangeFrom}
                onChange={e => setForm(f => ({ ...f, dateRangeFrom: e.target.value }))} />
            </FormField>
            <FormField label="Bitiş Tarihi">
              <input className={inputCls} type="date" value={form.dateRangeTo}
                onChange={e => setForm(f => ({ ...f, dateRangeTo: e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Notlar / İçerik">
            <textarea className={cn(inputCls, 'resize-none')} rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Rapor notları veya özet..." />
          </FormField>
          {formError && <p className="text-xs text-red-400">{formError}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={submit} disabled={createReport.isPending}
              className="flex-1 py-2 text-xs font-mono-val rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-[#5b8fd5]/20 transition-all disabled:opacity-50">
              {createReport.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-mono-val rounded border border-[#2e333d] text-[#8b919e] hover:text-[#e4e7ec] hover:bg-[#22262e] transition-all">
              İptal
            </button>
          </div>
        </div>
      </Modal>

      {/* View modal */}
      <ReportViewModal report={viewReport} onClose={() => setViewReport(null)} />
    </div>
  );
}
