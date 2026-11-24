import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LoadingState } from '../common/LoadingState.jsx';

export function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1020]">
        <LoadingState message="Verifying session..." />
      </div>
    );
  }

  if (isAuthenticated) {
    // If user is already authenticated, redirect to originally intended route or dashboard
    const destination = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={destination} replace />;
  }

  return children;
}

export default PublicRoute;

