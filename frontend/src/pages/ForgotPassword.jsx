import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { AuthLayout } from '../layouts/AuthLayout.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Button } from '../components/ui/Button.jsx';
import { authService } from '../services/api.js';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    try {
      setLoading(true);
      await authService.forgotPassword({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Reset link sent"
        subtitle="Check your inbox for instructions"
      >
        <div className="text-center space-y-4 py-4">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Instructions Dispatched
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              If an account exists for <strong className="text-slate-800 dark:text-slate-200">{email}</strong>, we have sent password reset instructions to your inbox.
            </p>
          </div>
          <div className="pt-4">
            <Link to="/login">
              <Button variant="outline" className="w-full justify-center" iconLeft={ArrowLeft}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email to receive recovery instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Input
          label="Registered email address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          iconLeft={Mail}
          required
          autoComplete="email"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full justify-center"
          isLoading={loading}
          iconRight={Send}
        >
          {loading ? 'Sending Instructions...' : 'Send Reset Instructions'}
        </Button>

        <div className="pt-2 text-center">
          <Link
            to="/login"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back to Sign In
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;

