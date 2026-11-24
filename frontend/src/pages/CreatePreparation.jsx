import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Building,
  Briefcase,
  MapPin,
  Clock,
  Layers,
  Code2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Upload,
  X,
  FileCheck,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { preparationService } from '../services/preparationService.js';

export function CreatePreparation() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    jobTitle: '',
    companyName: '',
    location: '',
    experienceLevel: 'SENIOR',
    yearsOfExperience: '',
    preferredLanguage: 'JavaScript',
    difficulty: 'HARD',
    preferences: [
      'Technical interview',
      'System design'
    ],
    jobDescription: ''
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const experienceOptions = [
    { value: 'ENTRY', label: 'Entry Level / Graduate (0-2 yrs)' },
    { value: 'JUNIOR', label: 'Junior (2-3 yrs)' },
    { value: 'MID', label: 'Mid-Level (3-5 yrs)' },
    { value: 'SENIOR', label: 'Senior (5-8 yrs)' },
    { value: 'LEAD', label: 'Lead / Staff Architect (8+ yrs)' }
  ];

  const languageOptions = [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'Go',
    'C++',
    'C#',
    'SQL & Databases'
  ];

  const difficultyOptions = [
    { value: 'EASY', label: 'Standard Enterprise' },
    { value: 'MEDIUM', label: 'Fast-Growing Tech Scaleup' },
    { value: 'HARD', label: 'Tier-1 Tech / High Bar' },
    { value: 'EXPERT', label: 'Staff / Principal Level' }
  ];

  const preferenceOptions = [
    'Technical interview',
    'HR interview',
    'Coding assessment',
    'System design',
    'Scenario-based questions',
    'Company-specific preparation'
  ];

  const validate = () => {
    const newErrors = {};
    if (!formData.jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    if (!formData.jobDescription.trim()) {
      newErrors.jobDescription = 'Job description is required. Please paste text or upload a document.';
    } else if (formData.jobDescription.trim().length < 20) {
      newErrors.jobDescription = 'Job description must be at least 20 characters for meaningful interview preparation.';
    }
    if (formData.yearsOfExperience !== '' && (isNaN(formData.yearsOfExperience) || Number(formData.yearsOfExperience) < 0)) {
      newErrors.yearsOfExperience = 'Please enter a valid non-negative number of years';
    }
    if (!formData.preferences || formData.preferences.length === 0) {
      newErrors.preferences = 'Please select at least one preparation focus area';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit. Please choose a smaller document.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error(`Unsupported file type (${ext}). Please upload a PDF, DOCX, or text file.`);
      return;
    }

    setSelectedFile(file);
    setIsExtracting(true);
    try {
      const res = await preparationService.uploadDocument(file);
      if (res.data?.extractedText) {
        setFormData((prev) => ({
          ...prev,
          jobDescription: res.data.extractedText
        }));
        setExtractedFileName(file.name);
        toast.success(`Successfully parsed text from ${file.name}`);
        setErrors((prev) => ({ ...prev, jobDescription: undefined }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not extract text. Please paste manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePreference = (pref) => {
    setFormData((prev) => {
      const exists = prev.preferences.includes(pref);
      return {
        ...prev,
        preferences: exists
          ? prev.preferences.filter((p) => p !== pref)
          : [...prev.preferences, pref]
      };
    });
    setErrors((prev) => ({ ...prev, preferences: undefined }));
  };

  const submissionLockRef = React.useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting || submissionLockRef.current) {
      return;
    }

    if (!validate()) {
      toast.error('Please review the form and correct validation errors.');
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        yearsOfExperience: formData.yearsOfExperience !== '' ? Number(formData.yearsOfExperience) : null
      };

      const res = await preparationService.createPreparation(payload, selectedFile);

      // Defensively extract session object and session ID
      const sessionObj = res?.data || res;
      const sessionId = sessionObj?.id || res?.id;

      if (!sessionId || typeof sessionId !== 'string') {
        throw new Error('Server created workspace but did not return a valid preparation ID.');
      }

      toast.success('Preparation workspace created successfully!');
      navigate(`/preparations/${sessionId}`);
    } catch (err) {
      submissionLockRef.current = false;
      toast.error(err.response?.data?.message || err.message || 'Failed to create preparation session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Create Preparation Session"
        subtitle="Submit a target Job Description to generate a tailored interview preparation workspace, custom mock rounds, and question banks."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Target Role & Company */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Building className="h-4 w-4 text-violet-500" />
              <span>Target Role & Company Details</span>
            </CardTitle>
            <CardDescription>
              Specify the role and organization you are interviewing with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Job Title *"
                placeholder="e.g. Senior Full Stack Engineer"
                value={formData.jobTitle}
                onChange={(e) => {
                  setFormData({ ...formData, jobTitle: e.target.value });
                  if (errors.jobTitle) setErrors({ ...errors, jobTitle: undefined });
                }}
                error={errors.jobTitle}
                required
              />

              <Input
                label="Company Name *"
                placeholder="e.g. TechCorp Labs"
                value={formData.companyName}
                onChange={(e) => {
                  setFormData({ ...formData, companyName: e.target.value });
                  if (errors.companyName) setErrors({ ...errors, companyName: undefined });
                }}
                error={errors.companyName}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Location (Optional)"
                placeholder="e.g. San Francisco, CA (Remote)"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />

              <Input
                label="Years of Experience (Optional)"
                type="number"
                min="0"
                max="50"
                placeholder="e.g. 5"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                error={errors.yearsOfExperience}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Experience & Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Layers className="h-4 w-4 text-violet-500" />
              <span>Experience & Interview Preferences</span>
            </CardTitle>
            <CardDescription>
              Tune the technical difficulty and interview question types.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Experience Level *
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.experienceLevel}
                  onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                >
                  {experienceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Primary Language *
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                >
                  {languageOptions.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Difficulty *
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                >
                  {difficultyOptions.map((diff) => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preparation Preferences Checkboxes */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Preparation Focus Areas *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {preferenceOptions.map((pref) => {
                  const isChecked = formData.preferences.includes(pref);
                  return (
                    <div
                      key={pref}
                      onClick={() => togglePreference(pref)}
                      className={`flex items-center space-x-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-300 font-medium'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded border flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-transparent'
                        }`}
                      >
                        {isChecked && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span className="text-xs">{pref}</span>
                    </div>
                  );
                })}
              </div>
              {errors.preferences && (
                <p className="text-xs text-rose-500 mt-1">{errors.preferences}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Job Description & Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <span>Job Description Details</span>
            </CardTitle>
            <CardDescription>
              Paste the complete job description or upload a document (PDF, DOCX, TXT) to automatically extract requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isDragOver
                  ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-violet-400 bg-slate-50/50 dark:bg-slate-900/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                className="hidden"
                id="doc-upload"
              />

              {isExtracting ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2 text-violet-600 dark:text-violet-400">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-xs font-semibold">Extracting and sanitizing document text...</p>
                </div>
              ) : extractedFileName ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 max-w-md mx-auto">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <FileCheck className="h-5 w-5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {extractedFileName}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-rose-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-10 w-10 mx-auto rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <label
                      htmlFor="doc-upload"
                      className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
                    >
                      Click to upload
                    </label>
                    <span className="text-xs text-slate-500 dark:text-slate-400"> or drag and drop</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    PDF, DOCX, TXT or Markdown files (up to 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Direct Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Job Description Text *
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {formData.jobDescription.length} characters
                </span>
              </div>
              <Textarea
                rows={9}
                placeholder="Paste the target Job Description, responsibilities, required technical skills, and qualifications here..."
                value={formData.jobDescription}
                onChange={(e) => {
                  setFormData({ ...formData, jobDescription: e.target.value });
                  if (errors.jobDescription) setErrors({ ...errors, jobDescription: undefined });
                }}
                error={errors.jobDescription}
                className="font-mono text-xs leading-relaxed"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-200/60 dark:border-slate-800/60 p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/preparations')}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isExtracting}
              iconRight={ArrowRight}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? 'Creating Workspace...' : 'Create Preparation Workspace'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
export default CreatePreparation;
