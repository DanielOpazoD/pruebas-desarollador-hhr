import React from 'react';

interface LoginPageFooterProps {
  isDayGradient: boolean;
}

export const LoginPageFooter: React.FC<LoginPageFooterProps> = ({ isDayGradient }) => (
  <div className="text-center mt-8 space-y-1 animate-login-reveal animate-login-reveal-delay-3">
    <p
      className={`text-[10px] uppercase tracking-widest font-bold ${
        isDayGradient ? 'text-slate-700' : 'text-slate-300'
      }`}
    >
      V 3.0
    </p>
    <p className={`text-[9px] ${isDayGradient ? 'text-slate-700' : 'text-slate-300'}`}>
      Desarrollo: daniel.opazo@hospitalhangaroa.cl
    </p>
    <p className={`text-[9px] ${isDayGradient ? 'text-slate-700' : 'text-slate-300'}`}>
      Rapa Nui, Chile
    </p>
  </div>
);
