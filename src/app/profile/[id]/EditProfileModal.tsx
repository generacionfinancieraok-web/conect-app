'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, Pencil, Camera } from 'lucide-react';

interface Props {
  initialName: string;
  initialBio: string | null;
  initialImage?: string | null;
}

export default function EditProfileModal({ initialName, initialBio, initialImage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialImage ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('El archivo debe ser una imagen'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar 5 MB'); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    setError('');

    try {
      // Subir avatar si hay uno nuevo
      if (avatarFile) {
        setUploadingAvatar(true);
        const fd = new FormData();
        fd.append('file', avatarFile);
        const avatarRes = await fetch('/api/users/me/avatar', { method: 'POST', body: fd });
        setUploadingAvatar(false);
        if (!avatarRes.ok) {
          const d = await avatarRes.json();
          setError(d.error || 'Error al subir la foto');
          setLoading(false);
          return;
        }
      }

      // Guardar nombre y bio
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Error al guardar');
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  }

  const initials = name.trim()
    ? name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" /> Editar perfil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Editar perfil</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200"
                    unoptimized={avatarPreview.startsWith('data:')}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                    <span className="text-2xl font-bold text-indigo-600">{initials}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs text-indigo-600 hover:underline font-medium"
              >
                Cambiar foto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input w-full"
                  placeholder="Tu nombre"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Biografía <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input w-full resize-none"
                  rows={3}
                  placeholder="Contá algo sobre vos..."
                  maxLength={500}
                />
                <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Subiendo foto...' : loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
