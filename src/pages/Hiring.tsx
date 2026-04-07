import { useState, useEffect } from 'react';
import { Plus, X, UserPlus, Briefcase, Mail, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import { BackButton } from '../components/BackButton';

interface HiringJob {
  id: string;
  title_en: string;
  title_zh?: string;
  description_en: string;
  description_zh?: string;
  probation_months: number;
  status: string;
  created_at: string;
  candidates?: HiringCandidate[];
}

interface HiringCandidate {
  id: string;
  candidate_name: string;
  candidate_contact: string;
  council_score?: number;
  owner_score?: number;
  total_score?: number;
  status: string;
  recommended_by?: string;
  recommender?: {
    full_name_en: string;
    full_name_zh?: string;
  };
}

interface PropertyManager {
  id: string;
  full_name_en: string;
  full_name_zh: string;
  email: string;
  phone: string;
  status: string;
  hire_date?: string;
}

export function Hiring() {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<HiringJob[]>([]);
  const [propertyManagers, setPropertyManagers] = useState<PropertyManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [scoringCandidate, setScoringCandidate] = useState<{ id: string; councilScore: string; ownerScore: string } | null>(null);

  const [newJob, setNewJob] = useState({
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    probation_months: '3',
  });
  const [isSearching, setIsSearching] = useState(false);

  const [newCandidate, setNewCandidate] = useState({
    candidate_name: '',
    candidate_contact: '',
  });

  const [newManager, setNewManager] = useState({
    full_name_en: '',
    full_name_zh: '',
    email: '',
    phone: '',
  });

  const loadJobs = async () => {
    if (!profile || !currentPropertyId) return;

    setLoading(true);
    try {
      const { data: jobsData, error: jobsError } = await supabase
        .from('hiring_jobs')
        .select('*')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false });

      if (jobsError) {
        console.error('Error loading jobs:', jobsError);
        return;
      }

      // Load candidates for each job
      const jobsWithCandidates = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { data: candidatesData, error: candidatesError } = await supabase
            .from('hiring_candidates')
            .select(`
              *,
              recommender:profiles!recommended_by(full_name_en, full_name_zh)
            `)
            .eq('job_id', job.id)
            .order('total_score', { ascending: false, nullsFirst: false });

          if (candidatesError) {
            console.error('Error loading candidates:', candidatesError);
            return { ...job, candidates: [] };
          }

          return { ...job, candidates: candidatesData || [] };
        })
      );

      setJobs(jobsWithCandidates);
    } finally {
      setLoading(false);
    }
  };

  const searchCandidates = async (jobId: string, title: string, description: string) => {
    setIsSearching(true);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-candidates`;
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Search candidates result:', result);

      if (result.success && result.candidates && result.candidates.length > 0) {
        const insertPromises = result.candidates.map((candidate: any) =>
          supabase.from('hiring_candidates').insert({
            job_id: jobId,
            candidate_name: candidate.candidate_name,
            candidate_contact: candidate.candidate_contact,
            recommended_by: profile?.id,
            status: 'pending',
          })
        );

        const insertResults = await Promise.all(insertPromises);

        const errors = insertResults.filter(r => r.error);
        if (errors.length > 0) {
          console.error('Some candidates failed to insert:', errors);
        } else {
          console.log(`Successfully added ${result.candidates.length} candidates`);
        }
      }
    } catch (error) {
      console.error('Error searching candidates:', error);
      alert(language === 'en' ? 'Failed to search candidates. Please try again.' : '搜索候选人失败，请重试。');
    } finally {
      setIsSearching(false);
    }
  };

  const createJob = async () => {
    if (!profile || !currentPropertyId) return;

    const { data, error } = await supabase.from('hiring_jobs').insert({
      property_id: currentPropertyId,
      posted_by: profile.id,
      title_en: newJob.title_en,
      title_zh: newJob.title_zh,
      description_en: newJob.description_en,
      description_zh: newJob.description_zh,
      probation_months: parseInt(newJob.probation_months),
      status: 'open',
    }).select().single();

    if (error) {
      console.error('Error creating job:', error);
      alert(language === 'en' ? 'Failed to create job. Please try again.' : '创建职位失败，请重试。');
      return;
    }

    if (data) {
      await searchCandidates(data.id, newJob.title_zh || newJob.title_en, newJob.description_zh || newJob.description_en);
    }

    setShowNewJobModal(false);
    setNewJob({ title_en: '', title_zh: '', description_en: '', description_zh: '', probation_months: '3' });
    await loadJobs();
  };

  const recommendCandidate = async () => {
    if (!profile || !selectedJob) return;

    const { error } = await supabase.from('hiring_candidates').insert({
      job_id: selectedJob,
      candidate_name: newCandidate.candidate_name,
      candidate_contact: newCandidate.candidate_contact,
      recommended_by: profile.id,
      status: 'pending',
    });

    if (error) {
      console.error('Error recommending candidate:', error);
      return;
    }

    setShowRecommendModal(false);
    setNewCandidate({ candidate_name: '', candidate_contact: '' });
    loadJobs();
  };

  const updateScores = async () => {
    if (!scoringCandidate) return;

    const councilScore = parseFloat(scoringCandidate.councilScore);
    const ownerScore = parseFloat(scoringCandidate.ownerScore);
    const totalScore = (councilScore + ownerScore) / 2;

    const { error } = await supabase
      .from('hiring_candidates')
      .update({
        council_score: councilScore,
        owner_score: ownerScore,
        total_score: totalScore,
        status: 'interview',
      })
      .eq('id', scoringCandidate.id);

    if (error) {
      console.error('Error updating scores:', error);
      return;
    }

    setScoringCandidate(null);
    loadJobs();
  };

  const loadPropertyManagers = async () => {
    if (!currentPropertyId) return;
    const { data, error } = await supabase
      .from('property_managers')
      .select('*')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading property managers:', error);
      return;
    }

    setPropertyManagers(data || []);
  };

  const addPropertyManager = async () => {
    if (!profile || !currentPropertyId) return;

    const { error } = await supabase.from('property_managers').insert({
      property_id: currentPropertyId,
      full_name_en: newManager.full_name_en,
      full_name_zh: newManager.full_name_zh,
      email: newManager.email,
      phone: newManager.phone,
      status: 'active',
    });

    if (error) {
      console.error('Error adding property manager:', error);
      alert(language === 'en' ? 'Failed to add property manager' : '添加物业经理失败');
      return;
    }

    setShowAddManagerModal(false);
    setNewManager({ full_name_en: '', full_name_zh: '', email: '', phone: '' });
    loadPropertyManagers();
  };

  useEffect(() => {
    if (profile && currentPropertyId) {
      loadJobs();
      void loadPropertyManagers();
    }
  }, [profile, currentPropertyId]);

  const isCouncil =
    currentRole === 'council' || currentRole === 'admin' || currentRole === 'property_admin';

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>;
  }

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('hiring_title')}</h1>
        {isCouncil && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowManagerModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Briefcase size={20} />
              {language === 'en' ? 'Property Managers' : '物业经理'}
            </button>
            <button
              onClick={() => setShowNewJobModal(true)}
              className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
            >
              <Plus size={20} />
              {t('hiring_new_job')}
            </button>
          </div>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">{language === 'en' ? 'No hiring jobs' : '暂无招聘职位'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {language === 'en' ? job.title_en : job.title_zh || job.title_en}
                </h3>
                <p className="text-gray-600 mb-2">
                  {language === 'en' ? job.description_en : job.description_zh || job.description_en}
                </p>
                <div className="text-sm text-gray-500">
                  {t('hiring_probation')}: {job.probation_months} {language === 'en' ? 'months' : '个月'}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                job.status === 'hired' ? 'bg-green-100 text-green-800' :
                job.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {t(`status_${job.status}`) || job.status}
              </span>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {language === 'en' ? 'Candidates' : '候选人'} ({job.candidates?.length || 0})
                </h4>
                {job.status === 'open' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        await searchCandidates(
                          job.id,
                          language === 'en' ? job.title_en : job.title_zh || job.title_en,
                          language === 'en' ? job.description_en : job.description_zh || job.description_en
                        );
                        await loadJobs();
                      }}
                      disabled={isSearching}
                      className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      <UserPlus size={16} />
                      {language === 'en' ? 'AI Search' : 'AI 搜索'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedJob(job.id);
                        setShowRecommendModal(true);
                      }}
                      className="flex items-center gap-2 text-[#1D9E75] hover:underline text-sm font-medium"
                    >
                      <UserPlus size={16} />
                      {t('hiring_recommend')}
                    </button>
                  </div>
                )}
              </div>

              {job.candidates && job.candidates.length > 0 && (
                <div className="space-y-3">
                  {job.candidates.map((candidate) => (
                    <div key={candidate.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{candidate.candidate_name}</div>
                          <div className="text-sm text-gray-500">{candidate.candidate_contact}</div>
                          {candidate.recommender && (
                            <div className="text-xs text-gray-400 mt-1">
                              {language === 'en' ? 'Recommended by:' : '推荐人：'}{' '}
                              {language === 'en'
                                ? candidate.recommender.full_name_en
                                : candidate.recommender.full_name_zh || candidate.recommender.full_name_en}
                            </div>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          candidate.status === 'hired' ? 'bg-green-100 text-green-800' :
                          candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          candidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {t(`status_${candidate.status}`) || candidate.status}
                        </span>
                      </div>

                      {candidate.total_score !== null && candidate.total_score !== undefined && (
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <div className="text-gray-500">{t('hiring_council_score')}</div>
                            <div className="font-semibold text-gray-900">{candidate.council_score}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">{t('hiring_owner_score')}</div>
                            <div className="font-semibold text-gray-900">{candidate.owner_score}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">{t('hiring_total_score')}</div>
                            <div className="font-semibold text-[#1D9E75]">{candidate.total_score?.toFixed(1)}</div>
                          </div>
                        </div>
                      )}

                      {isCouncil && candidate.status === 'pending' && (
                        <button
                          onClick={() => setScoringCandidate({
                            id: candidate.id,
                            councilScore: '0',
                            ownerScore: '0',
                          })}
                          className="mt-3 text-[#1D9E75] hover:underline text-sm font-medium"
                        >
                          {language === 'en' ? 'Add Scores' : '添加评分'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          ))}
        </div>
      )}

      {showNewJobModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">{t('hiring_new_job')}</h2>
              <button onClick={() => setShowNewJobModal(false)} disabled={isSearching}>
                <X size={24} />
              </button>
            </div>

            {isSearching && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm font-medium">
                    {language === 'en' ? 'AI is searching for candidates...' : 'AI 正在搜索候选人...'}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('procurement_job_title')} (English)
                </label>
                <input
                  type="text"
                  value={newJob.title_en}
                  onChange={(e) => setNewJob({ ...newJob, title_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('procurement_job_title')} (中文)
                </label>
                <input
                  type="text"
                  value={newJob.title_zh}
                  onChange={(e) => setNewJob({ ...newJob, title_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('procurement_description')} (English)
                </label>
                <textarea
                  value={newJob.description_en}
                  onChange={(e) => setNewJob({ ...newJob, description_en: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('procurement_description')} (中文)
                </label>
                <textarea
                  value={newJob.description_zh}
                  onChange={(e) => setNewJob({ ...newJob, description_zh: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('hiring_probation')}
                </label>
                <input
                  type="number"
                  value={newJob.probation_months}
                  onChange={(e) => setNewJob({ ...newJob, probation_months: e.target.value })}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createJob}
                  disabled={isSearching}
                  className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (language === 'en' ? 'Searching...' : '搜索中...') : t('action_submit')}
                </button>
                <button
                  onClick={() => setShowNewJobModal(false)}
                  disabled={isSearching}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('action_cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecommendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('hiring_recommend')}</h2>
              <button onClick={() => setShowRecommendModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('hiring_candidate_name')}
                </label>
                <input
                  type="text"
                  value={newCandidate.candidate_name}
                  onChange={(e) => setNewCandidate({ ...newCandidate, candidate_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('procurement_contact')}
                </label>
                <input
                  type="text"
                  value={newCandidate.candidate_contact}
                  onChange={(e) => setNewCandidate({ ...newCandidate, candidate_contact: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={recommendCandidate}
                  className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#178a66] transition-colors"
                >
                  {t('action_submit')}
                </button>
                <button
                  onClick={() => setShowRecommendModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('action_cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {language === 'en' ? 'Property Managers' : '物业经理'}
              </h2>
              <button onClick={() => setShowManagerModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <button
                onClick={() => setShowAddManagerModal(true)}
                className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
              >
                <Plus size={20} />
                {language === 'en' ? 'Add Property Manager' : '添加物业经理'}
              </button>
            </div>

            {propertyManagers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {language === 'en' ? 'No property managers found' : '未找到物业经理'}
              </div>
            ) : (
              <div className="space-y-3">
                {propertyManagers.map((manager) => (
                  <div key={manager.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {language === 'en' ? manager.full_name_en : manager.full_name_zh}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-gray-400" />
                            <span>{manager.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-gray-400" />
                            <span>{manager.phone}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        manager.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {manager.status === 'active' ? (language === 'en' ? 'Active' : '在职') : (language === 'en' ? 'Inactive' : '离职')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {language === 'en' ? 'Add Property Manager' : '添加物业经理'}
              </h2>
              <button onClick={() => setShowAddManagerModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Full Name (English)' : '全名（英文）'}
                </label>
                <input
                  type="text"
                  value={newManager.full_name_en}
                  onChange={(e) => setNewManager({ ...newManager, full_name_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Full Name (Chinese)' : '全名（中文）'}
                </label>
                <input
                  type="text"
                  value={newManager.full_name_zh}
                  onChange={(e) => setNewManager({ ...newManager, full_name_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="张三"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Email' : '邮箱'}
                </label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="manager@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Phone' : '电话'}
                </label>
                <input
                  type="tel"
                  value={newManager.phone}
                  onChange={(e) => setNewManager({ ...newManager, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addPropertyManager}
                  className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#178a66] transition-colors"
                >
                  {t('action_submit')}
                </button>
                <button
                  onClick={() => setShowAddManagerModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('action_cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {scoringCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {language === 'en' ? 'Add Scores' : '添加评分'}
              </h2>
              <button onClick={() => setScoringCandidate(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('hiring_council_score')} (0-100)
                </label>
                <input
                  type="number"
                  value={scoringCandidate.councilScore}
                  onChange={(e) => setScoringCandidate({ ...scoringCandidate, councilScore: e.target.value })}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('hiring_owner_score')} (0-100)
                </label>
                <input
                  type="number"
                  value={scoringCandidate.ownerScore}
                  onChange={(e) => setScoringCandidate({ ...scoringCandidate, ownerScore: e.target.value })}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={updateScores}
                  className="flex-1 bg-[#1D9E75] text-white py-2 rounded-lg hover:bg-[#178a66] transition-colors"
                >
                  {t('action_save')}
                </button>
                <button
                  onClick={() => setScoringCandidate(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  {t('action_cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
