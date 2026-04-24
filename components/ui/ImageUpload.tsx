'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  value?: string;
  onChange: (base64: string | undefined) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = 'Upload Image' }: Props) {
  const [error, setError] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError('');
      const file = acceptedFiles[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be under 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        onChange(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'] },
    maxFiles: 1,
  });

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative group w-fit">
          <img
            src={value}
            alt="Uploaded"
            className="h-16 max-w-[200px] object-contain rounded-lg border border-gray-200 bg-gray-50 p-2"
          />
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, SVG up to 2MB · stored as base64</p>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
