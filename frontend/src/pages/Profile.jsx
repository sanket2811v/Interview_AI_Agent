import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Briefcase,
  Upload,
  CheckCircle2,
  Sparkles,
  MapPin,
  Phone,
  FileText,
  Plus,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Profile() {
  const toast = useToast();
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: user?.name || user?.profile?.fullName || '',
    phone: user?.profile?.phone || '',
    location: user?.profile?.location || '',
    headline: user?.profile?.headline || '',
    bio: user?.profile?.bio || '',
    currentRole: user?.profile?.currentRole || '',
    experience: user?.profile?.experience || '',
    preferredJobRole: user?.profile?.preferredJobRole || '',
    skills: user?.profile?.skills || ['React', 'Node.js', 'PostgreSQL', 'System Design']
  });

  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || user.profile?.fullName || '',
        phone: user.profile?.phone || '',
        location: user.profile?.location || '',
        headline: user.profile?.headline || '',
        bio: user.profile?.bio || '',
        currentRole: user.profile?.currentRole || '',
        experience: user.profile?.experience || '',
        preferredJobRole: user.profile?.preferredJobRole || '',
        skills: user.profile?.skills?.length
          ? user.profile.skills
          : ['React', 'Node.js', 'PostgreSQL', 'System Design']
      });
    }
  }, [user]);

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove)
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateProfile(formData);
      toast.success('Candidate profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const initials = formData.fullName
    ? formData.fullName.substring(0, 2).toUpperCase()
    : 'AI';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <PageHeader
        title="Candidate Profile & Dossier"
        subtitle="Manage your credentials, professional background, and career targets for personalized AI interview coaching."
      />

      <form onSubmit={handleSave}>
        <Card className="space-y-6">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar initials={initials} size="xl" status="online" />
              <div>
                <CardTitle>{formData.fullName || 'Candidate Profile'}</CardTitle>
                <CardDescription>
                  {user?.email} • {user?.isEmailVerified ? 'Verified Account' : 'Pending Verification'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            {/* Primary Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                iconLeft={User}
                required
              />
              <Input
                label="Account Email"
                value={user?.email || ''}
                disabled
                helperText="Managed via account security settings"
                iconLeft={Mail}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                iconLeft={Phone}
              />
              <Input
                label="Location"
                placeholder="San Francisco, CA (or Remote)"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                iconLeft={MapPin}
              />
            </div>

            {/* Career Goals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Current Title / Role"
                placeholder="Software Engineer"
                value={formData.currentRole}
                onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                iconLeft={Briefcase}
              />
              <Input
                label="Target / Preferred Role"
                placeholder="Staff Engineer / Tech Lead"
                value={formData.preferredJobRole}
                onChange={(e) => setFormData({ ...formData, preferredJobRole: e.target.value })}
                iconLeft={Sparkles}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Total Years of Experience"
                placeholder="5+ Years"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              />
              <Input
                label="Professional Headline"
                placeholder="Full Stack Specialist passionate about distributed systems"
                value={formData.headline}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
              />
            </div>

            {/* Professional Bio */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                Professional Bio & Summary
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe your software journey, core strengths, and what sets you apart..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Core Skills Tag Manager */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                Competencies & Technical Skills
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="primary" size="md" className="flex items-center gap-1.5 py-1 px-2.5">
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-violet-300 hover:text-white transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Add skill (e.g. GraphQL, AWS, Go)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill(e);
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-[#27324A] bg-white dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
                <Button type="button" size="sm" variant="outline" onClick={handleAddSkill} iconLeft={Plus}>
                  Add
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end border-t border-slate-100 dark:border-[#27324A]/60 pt-4">
            <Button type="submit" variant="primary" isLoading={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}

export default Profile;
