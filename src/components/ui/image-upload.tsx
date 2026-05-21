import React, { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  bucket: string
  folder?: string
  value?: string
  onChange: (url: string) => void
  disabled?: boolean
}

export function ImageUpload({ bucket, folder = '', value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createBrowserClient()

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      onChange(publicUrl)
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemove = () => {
    onChange('')
  }

  return (
    <div className="space-y-4 w-full">
      {value ? (
        <div className="relative group rounded-md border border-zinc-900 bg-zinc-950 overflow-hidden inline-flex items-center justify-center max-w-full">
          <img 
            src={value} 
            alt="Uploaded image" 
            className="max-h-[200px] max-w-full object-contain"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-zinc-900 border-dashed rounded-md hover:border-zinc-800 transition-colors">
          <div className="space-y-1 text-center">
            {isUploading ? (
              <Loader2 className="mx-auto h-8 w-8 text-zinc-500 animate-spin" />
            ) : (
              <Upload className="mx-auto h-8 w-8 text-zinc-600" />
            )}
            <div className="flex text-sm text-zinc-500 mt-4 justify-center">
              <label className="relative cursor-pointer rounded-md font-medium text-amber-500 hover:text-amber-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-amber-500">
                <span>Upload a file</span>
                <input
                  title="Upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={disabled || isUploading}
                />
              </label>
            </div>
            <p className="text-xs text-zinc-600">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      )}
      {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">{error}</p>}
    </div>
  )
}
