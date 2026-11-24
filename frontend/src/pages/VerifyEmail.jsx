import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, RefreshCw, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { authService } from '../services/api.js';
import { useToast } from '../components/ui/Toast.jsx';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(!!token);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Resend form state
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verifyToken = async () => {
      try {
        setVerifying(true);
        await authService.verifyEmail({ token });
        if (isMounted) {
          setIsSuccess(true);
          toast.success('Email successfully verified! Welcome aboard.');
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err.message || 'Verification token is invalid or expired.');
        }
      } finally {
        if (isMounted) setVerifying(false);
      }
    };

    verifyToken();
    return () => { isMounted = false; };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    try {
      setResendLoading(true);
      await authService.resendVerification({ email: resendEmail.trim() });
      setResendSuccess(true);
      toast.success('If the email is registered, verification instructions have been sent.');
    } catch (err) {
      toast.error(err.message || 'Unable to send verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (verifying) {
    return (
      <AuthLayout title="Verifying your account" subtitle="Please wait while we confirm your email">
        <div className="text-center py-8 space-y-4">
          <RefreshCw className="h-10 w-10 text-violet-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Validating security tokens...
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (isSuccess) {
    return (
      <AuthLayout title="Email Verified" subtitle="Your candidate account is fully active">
        <div className="text-center space-y-4 py-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Verification Complete!
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Thank you for confirming your email. You can now unlock full AI mock interviews, detailed scoring reports, and system design roadmaps.
            </p>
          </div>
          <div className="pt-4">
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => navigate('/login')}
              iconRight={ArrowRight}
            >
              Sign In to Your Workspace
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Email Verification"
      subtitle={errorMessage ? 'Verification link expired or invalid' : 'Resend verification link'}
    >
      <div className="space-y-6">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {resendSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              If an account with this email exists, a fresh verification link has been sent. Please check your inbox and spam folder.
            </span>
          </div>
        ) : (
          <form onSubmit={handleResend} className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your email address below to receive a new verification link.
            </p>
            <Input
              label="Account email"
              type="email"
              placeholder="name@company.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              iconLeft={Mail}
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full justify-center"
              isLoading={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Request New Verification Link'}
            </Button>
          </form>
        )}

        <div className="pt-2 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmail;

