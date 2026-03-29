import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface PhotoUploadProps {
  jobId?: string;
  photoType: 'request' | 'completion' | 'verification';
  onPhotosUploaded?: (urls: string[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ jobId, photoType, onPhotosUploaded, maxPhotos = 5 }: PhotoUploadProps) {
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (uploadedPhotos.length + files.length > maxPhotos) {
      alert(language === 'en' ? `Maximum ${maxPhotos} photos allowed` : `最多上传${maxPhotos}张照片`);
      return;
    }

    setUploading(true);

    try {
      const urls: string[] = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `procurement-photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);

        urls.push(publicUrl);

        if (jobId) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('procurement_photos').insert({
              job_id: jobId,
              photo_url: publicUrl,
              photo_type: photoType,
              uploaded_by: user.id,
            });
          }
        }
      }

      setUploadedPhotos([...uploadedPhotos, ...urls]);
      onPhotosUploaded?.(urls);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert(language === 'en' ? 'Failed to upload photos' : '照片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {language === 'en' ? 'Upload Photos' : '上传照片'}
        <span className="text-gray-500 ml-2">
          ({uploadedPhotos.length}/{maxPhotos})
        </span>
      </label>

      <div className="space-y-3">
        {uploadedPhotos.length < maxPhotos && (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {language === 'en' ? 'Click to upload photos' : '点击上传照片'}
                  </p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </label>
        )}

        {uploadedPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uploadedPhotos.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
