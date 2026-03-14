import React from 'react';

interface LoginPageHeaderProps {
  isDayGradient: boolean;
}

export const LoginPageHeader: React.FC<LoginPageHeaderProps> = ({ isDayGradient }) => (
  <div className="text-center mb-10 animate-login-reveal animate-login-reveal-delay-1">
    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-xl mb-6 p-2 animate-float">
      <img
        src="/images/logos/logo_HHR.svg"
        alt="Hospital Hanga Roa"
        className="w-full h-full object-contain"
      />
    </div>
    <h1
      className={`text-3xl font-display tracking-tight font-bold mb-2 ${isDayGradient ? 'text-slate-800' : 'text-white'}`}
    >
      Hospital Hanga Roa
    </h1>
    <p className={isDayGradient ? 'text-blue-900' : 'text-blue-200'}>
      Sistema Estadístico de Hospitalizados
    </p>
  </div>
);
