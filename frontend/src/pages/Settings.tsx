import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, channelApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import {
  User, Shield, Bell, Database, Plus, Edit, X, Save, Eye, EyeOff,
  Key, Trash2, CheckCircle, AlertTriangle, Activity,
} from 'lucide-react';
import { cn, formatDateTime, roleLabel } from '@/lib/utils';

// ─── Modal ────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string;
  children: React.ReactNode; size?: 'sm' | 'md';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative bg-[#0D1421] border border-[#1E2D45] rounded-lg shadow-2xl w-full max-h-[90vh] overflow-y-auto fade-in-up',
        widths[size]
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E2D45]">
          <h2 className="font-display font-bold text-base text-white tracking-wide">{title}</h2>
          <button onClick={onClose} className="p-1 rounded text-[#6B84A3] hover:text-white hover:bg-[#1E2D45] transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Form field helpers ───────────────────────────────────────
function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
const inputCls = "w-full bg-[#131C2E] border border-[#1E2D45] rounded text-xs text-[#E2EAF4] placeholder-[#3D5275] px-3 py-2 outline-none focus:border-amber-500/50 transition-colors";

// ─── Password field ───────────────────────────────────────────
function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={inputCls + ' pr-9'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#3D5275] hover:text-[#6B84A3] transition-colors"
      >
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
    </div>
  );
}

// ─── Role color ───────────────────────────────────────────────
const roleColor: Record<string, string> = {
  Admin: 'text-red-400 bg-red-400/10 border-red-400/20',
  Manager: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Technician: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Viewer: 'text-[#6B84A3] bg-[#6B84A3]/10 border-[#6B84A3]/20',
};

// ─── User Form Modal (Create / Edit) ─────────────────────────
interface UserFormData {
  username: string;
  email: string;
  fullName: string;
  role: string;
  channelId: string;
  phone: string;
  department: string;
  password: string;
  isActive: boolean;
}

const EMPTY_USER: UserFormData = {
  username: '', email: '', fullName: '', role: 'Technician',
  channelId: '', phone: '', department: '', password: '', isActive: true,
};

function UserFormModal({
  editUser, onClose, channels,
}: { editUser: any | null; onClose: () => void; channels: any[] }) {
  const qc = useQueryClient();
  const isEdit = !!editUser;

  const [form, setForm] = useState<UserFormData>(
    editUser ? {
      username: editUser.username ?? '',
      email: editUser.email ?? '',
      fullName: editUser.fullName ?? '',
      role: editUser.role ?? 'Technician',
      channelId: editUser.channelId ? String(editUser.channelId) : '',
      phone: editUser.phone ?? '',
      department: editUser.department ?? '',
      password: '',
      isActive: editUser.isActive ?? true,
    } : EMPTY_USER
  );
  const [error, setError] = useState('');

  const setField = (key: keyof UserFormData, val: any) => setForm(f => ({ ...f, [key]: val }));

  const createMut = useMutation({
    mutationFn: (body: object) => userApi.create(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Kullanıcı oluşturulamadı.'),
  });

  const updateMut = useMutation({
    mutationFn: (body: object) => userApi.update(editUser.userId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Güncelleme başarısız.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isEdit && !form.password) { setError('Şifre zorunludur.'); return; }
    if (form.password && form.password.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return; }

    const body: any = {
      email: form.email,
      fullName: form.fullName,
      role: form.role,
      channelId: form.channelId ? parseInt(form.channelId) : null,
      phone: form.phone || undefined,
      department: form.department || undefined,
      isActive: form.isActive ? 1 : 0,
    };

    if (!isEdit) {
      body.username = form.username;
      body.password = form.password;
    }

    if (isEdit) {
      updateMut.mutate(body);
    } else {
      createMut.mutate(body);
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Modal open onClose={onClose} title={isEdit ? `Kullanıcıyı Düzenle: ${editUser.fullName}` : 'Yeni Kullanıcı'}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && (
          <FormField label="Kullanıcı Adı" required>
            <input className={inputCls} value={form.username} onChange={e => setField('username', e.target.value)} required placeholder="kullanici123" />
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Ad Soyad" required>
            <input className={inputCls} value={form.fullName} onChange={e => setField('fullName', e.target.value)} required placeholder="Ad Soyad" />
          </FormField>
          <FormField label="E-posta" required>
            <input type="email" className={inputCls} value={form.email} onChange={e => setField('email', e.target.value)} required placeholder="email@domain.com" />
          </FormField>
          <FormField label="Rol" required>
            <select className={inputCls} value={form.role} onChange={e => setField('role', e.target.value)} required>
              <option value="Admin">Admin</option>
              <option value="Manager">Yönetici</option>
              <option value="Technician">Teknisyen</option>
              <option value="Viewer">Görüntüleyici</option>
            </select>
          </FormField>
          <FormField label="Kanal">
            <select className={inputCls} value={form.channelId} onChange={e => setField('channelId', e.target.value)}>
              <option value="">Tüm Kanallar</option>
              {channels.map((c: any) => <option key={c.channelId} value={String(c.channelId)}>{c.channelName}</option>)}
            </select>
          </FormField>
          <FormField label="Telefon">
            <input type="tel" className={inputCls} value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="+90 555 000 00 00" />
          </FormField>
          <FormField label="Departman">
            <input className={inputCls} value={form.department} onChange={e => setField('department', e.target.value)} placeholder="IT, Teknik, ..." />
          </FormField>
        </div>

        <FormField label={isEdit ? 'Yeni Şifre (değiştirmek için girin)' : 'Şifre'} required={!isEdit}>
          <PasswordInput value={form.password} onChange={v => setField('password', v)} />
        </FormField>

        {isEdit && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setField('isActive', !form.isActive)}
                className={cn(
                  'w-9 h-5 rounded-full transition-all cursor-pointer relative',
                  form.isActive ? 'bg-green-500' : 'bg-[#1E2D45]'
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  form.isActive ? 'left-[18px]' : 'left-0.5'
                )} />
              </div>
              <span className="text-xs text-[#E2EAF4] font-mono-val">{form.isActive ? 'Aktif' : 'Pasif'}</span>
            </label>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D45]">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] transition-colors font-mono-val">
            İPTAL
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 font-mono-val transition-all"
          >
            {isPending && <span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
            <Save size={11} /> {isEdit ? 'GÜNCELLE' : 'OLUŞTUR'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Change Password Modal ────────────────────────────────────
function ChangePasswordModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const pwMut = useMutation({
    mutationFn: (body: object) => userApi.changePassword(userId, body),
    onSuccess: () => setSuccess(true),
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Şifre değiştirilemedi.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 8) { setError('Yeni şifre en az 8 karakter olmalı.'); return; }
    if (newPw !== confirmPw) { setError('Şifreler eşleşmiyor.'); return; }
    pwMut.mutate({ currentPassword: currentPw, newPassword: newPw });
  };

  return (
    <Modal open onClose={onClose} title="Şifremi Değiştir" size="sm">
      {success ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle size={22} className="text-green-400" />
          </div>
          <p className="text-sm text-green-400 font-mono-val">Şifre başarıyla değiştirildi!</p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-[#E2EAF4] font-mono-val transition-colors"
          >
            KAPAT
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormField label="Mevcut Şifre" required>
            <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Mevcut şifreniz" />
          </FormField>
          <FormField label="Yeni Şifre" required>
            <PasswordInput value={newPw} onChange={setNewPw} placeholder="Min. 8 karakter" />
          </FormField>
          <FormField label="Yeni Şifre (Tekrar)" required>
            <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Şifreyi tekrar girin" />
          </FormField>

          {/* Strength indicator */}
          {newPw && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[8, 10, 12, 15].map((t, i) => (
                  <div
                    key={t}
                    className={cn(
                      'flex-1 h-1 rounded-full transition-all',
                      newPw.length >= t
                        ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : i === 2 ? 'bg-yellow-400' : 'bg-green-400'
                        : 'bg-[#1E2D45]'
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#3D5275] font-mono-val">
                {newPw.length < 8 ? 'Çok kısa' : newPw.length < 10 ? 'Zayıf' : newPw.length < 12 ? 'Orta' : newPw.length < 15 ? 'Güçlü' : 'Çok Güçlü'}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded px-3 py-2 text-xs text-red-400 font-mono-val">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1E2D45]">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] transition-colors font-mono-val">
              İPTAL
            </button>
            <button
              type="submit"
              disabled={pwMut.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded text-xs bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 disabled:opacity-50 font-mono-val transition-all"
            >
              {pwMut.isPending && <span className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />}
              <Key size={11} /> DEĞİŞTİR
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ─── Settings Page ────────────────────────────────────────────
export function Settings() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [showUserForm, setShowUserForm] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(),
    enabled: user?.role === 'Admin' || user?.role === 'Manager',
  });

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: () => channelApi.getAll(),
  });

  const users: any[] = data?.data?.data ?? [];
  const channels: any[] = channelsData?.data?.data ?? [];

  const deleteMut = useMutation({
    mutationFn: (id: number) => userApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setDeleteTarget(null); },
  });

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  return (
    <div className="space-y-4 fade-in-up max-w-4xl">

      {/* Profile card */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User size={14} className="text-amber-400" />
            <p className="text-[11px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Profil Bilgileri</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChangePw(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] bg-[#131C2E] border border-[#1E2D45] text-[#6B84A3] hover:text-amber-400 hover:border-amber-500/30 transition-all font-mono-val"
            >
              <Key size={10} /> ŞİFRE DEĞİŞTİR
            </button>
          </div>
        </div>

        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="font-display font-bold text-xl text-amber-400">
              {user?.fullName?.charAt(0) ?? 'U'}
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1">
            {[
              { label: 'Ad Soyad', value: user?.fullName },
              { label: 'Kullanıcı', value: user?.username },
              { label: 'E-posta', value: user?.email },
              { label: 'Rol', value: user?.role ? roleLabel(user.role) : undefined },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2 border-b border-[#131C2E]">
                <span className="text-[10px] text-[#6B84A3] uppercase font-mono-val w-24">{label}</span>
                <span className="text-xs text-[#E2EAF4]">{value ?? '-'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management (Admin/Manager only) */}
      {isAdminOrManager && (
        <div className="card overflow-hidden">
          <div className="p-3 border-b border-[#1E2D45] bg-[#131C2E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={13} className="text-amber-400" />
              <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">
                Kullanıcı Yönetimi — {users.length} kullanıcı
              </p>
            </div>
            <button
              onClick={() => { setEditUser(null); setShowUserForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/20 font-mono-val transition-all"
            >
              <Plus size={11} /> YENİ KULLANICI
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="border-b border-[#1E2D45]">
                <tr>
                  {['Ad Soyad', 'Kullanıcı Adı', 'E-posta', 'Rol', 'Kanal', 'Son Giriş', 'Durum', ''].map(h => (
                    <th key={h} className="py-2 px-3 text-left text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId} className="border-b border-[#1E2D45] hover:bg-[#131C2E] transition-colors group">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#1E2D45] flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-[#6B84A3]">{u.fullName?.charAt(0)}</span>
                        </div>
                        <span className="text-xs text-[#E2EAF4]">{u.fullName}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3] font-mono-val">{u.username}</td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{u.email}</td>
                    <td className="py-2.5 px-3">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded border font-mono-val', roleColor[u.role] ?? 'text-[#6B84A3]')}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-[#6B84A3]">{u.channelName ?? 'Tümü'}</td>
                    <td className="py-2.5 px-3 text-[10px] text-[#3D5275] font-mono-val">
                      {u.lastLogin ? formatDateTime(u.lastLogin) : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-mono-val flex items-center gap-1 w-fit',
                        u.isActive ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.isActive ? 'bg-green-400 pulse-dot' : 'bg-red-400')} />
                        {u.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditUser(u); setShowUserForm(true); }}
                          className="p-1.5 rounded text-[#6B84A3] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Düzenle"
                        >
                          <Edit size={12} />
                        </button>
                        {u.userId !== (user as any)?.userId && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 rounded text-[#6B84A3] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Devre Dışı Bırak"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System info */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Database size={13} className="text-cyan-400" />
          <p className="text-[10px] text-[#6B84A3] uppercase tracking-widest font-mono-val">Sistem Bilgisi</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1">
          {[
            { label: 'Versiyon', value: 'v1.0.0' },
            { label: 'API', value: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1' },
            { label: 'Veritabanı', value: 'SQL Server 2019+' },
            { label: 'Real-time', value: `WebSocket (${import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://localhost:5000'})` },
            { label: 'Frontend', value: 'Vite + React 18 + TypeScript' },
            { label: 'Backend', value: 'Node.js + Express.js' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-[#131C2E]">
              <span className="text-[10px] text-[#6B84A3] uppercase font-mono-val w-24">{label}</span>
              <span className="text-[10px] text-cyan-400 font-mono-val truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showUserForm && (
        <UserFormModal
          editUser={editUser}
          onClose={() => { setShowUserForm(false); setEditUser(null); }}
          channels={channels}
        />
      )}

      {showChangePw && user && (
        <ChangePasswordModal
          userId={(user as any).userId}
          onClose={() => setShowChangePw(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Kullanıcıyı Devre Dışı Bırak" size="sm">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <AlertTriangle size={22} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm text-[#E2EAF4] font-medium">{deleteTarget.fullName}</p>
              <p className="text-[11px] text-[#6B84A3] mt-1 font-mono-val">
                Bu kullanıcıyı devre dışı bırakmak istediğinize emin misiniz?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded text-xs text-[#6B84A3] hover:text-[#E2EAF4] border border-[#1E2D45] transition-colors font-mono-val">
                VAZGEÇ
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.userId)}
                disabled={deleteMut.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded text-xs bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 disabled:opacity-50 font-mono-val transition-all"
              >
                {deleteMut.isPending && <span className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />}
                DEVRE DIŞI BIRAK
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
