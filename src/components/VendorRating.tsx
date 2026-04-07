import { useState } from 'react';
import { Star, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';

interface VendorRatingProps {
  jobId: string;
  vendorName: string;
  vendorContact?: string;
  onRatingSubmitted?: () => void;
}

export function VendorRating({ jobId, vendorName, vendorContact, onRatingSubmitted }: VendorRatingProps) {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const [rating, setRating] = useState({
    quality_score: 0,
    speed_score: 0,
    attitude_score: 0,
    comments: '',
    would_recommend: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating.quality_score === 0 || rating.speed_score === 0 || rating.attitude_score === 0) {
      alert(language === 'en' ? 'Please rate all categories' : '请对所有类别进行评分');
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!currentPropertyId) throw new Error('No property selected');

      const { error } = await supabase.from('vendor_ratings').insert({
        property_id: currentPropertyId,
        job_id: jobId,
        vendor_name: vendorName,
        vendor_contact: vendorContact,
        rated_by: user.id,
        quality_score: rating.quality_score,
        speed_score: rating.speed_score,
        attitude_score: rating.attitude_score,
        comments: rating.comments,
        would_recommend: rating.would_recommend,
      });

      if (error) throw error;

      alert(language === 'en' ? 'Rating submitted successfully' : '评分提交成功');
      onRatingSubmitted?.();
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(language === 'en' ? 'Failed to submit rating' : '评分提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (category: 'quality_score' | 'speed_score' | 'attitude_score', label: string) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => setRating({ ...rating, [category]: score })}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              size={32}
              className={
                score <= rating[category]
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }
            />
          </button>
        ))}
        <span className="text-sm text-gray-600 ml-2 self-center">
          {rating[category] > 0 ? `${rating[category]}/5` : language === 'en' ? 'Not rated' : '未评分'}
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {language === 'en' ? 'Rate Vendor Performance' : '评价供应商表现'}
        </h3>
        <p className="text-sm text-gray-600">
          {language === 'en' ? `Vendor: ${vendorName}` : `供应商：${vendorName}`}
        </p>
      </div>

      {renderStars('quality_score', language === 'en' ? 'Work Quality' : '工作质量')}
      {renderStars('speed_score', language === 'en' ? 'Completion Speed' : '完成速度')}
      {renderStars('attitude_score', language === 'en' ? 'Service Attitude' : '服务态度')}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {language === 'en' ? 'Comments (Optional)' : '评论（可选）'}
        </label>
        <textarea
          value={rating.comments}
          onChange={(e) => setRating({ ...rating, comments: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          rows={3}
          placeholder={language === 'en' ? 'Share your experience...' : '分享您的体验...'}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="recommend"
          checked={rating.would_recommend}
          onChange={(e) => setRating({ ...rating, would_recommend: e.target.checked })}
          className="w-5 h-5 text-[#1D9E75] border-gray-300 rounded focus:ring-[#1D9E75]"
        />
        <label htmlFor="recommend" className="text-sm text-gray-700 flex items-center gap-2">
          <ThumbsUp size={18} className="text-[#1D9E75]" />
          {language === 'en' ? 'I would recommend this vendor' : '我推荐这个供应商'}
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-[#1D9E75] text-white py-3 rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
      >
        {submitting
          ? (language === 'en' ? 'Submitting...' : '提交中...')
          : (language === 'en' ? 'Submit Rating' : '提交评分')}
      </button>
    </div>
  );
}
