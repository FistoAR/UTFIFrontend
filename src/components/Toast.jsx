import React, { useEffect, useState } from 'react';

const Toast = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleManualClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const config = {
    success: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-900',
      accent: 'bg-emerald-500',
      icon: (
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )
    },
    error: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      text: 'text-rose-900',
      accent: 'bg-rose-500',
      icon: (
        <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      )
    },
    info: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-900',
      accent: 'bg-sky-500',
      icon: (
        <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      accent: 'bg-amber-500',
      icon: (
        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )
    }
  };

  const style = config[type] || config.info;

  return (
    <div className={` overflow-hidden
      relative group pointer-events-auto
      flex items-center gap-4 px-6 py-4 rounded-2xl
      bg-white/95 backdrop-blur-md border ${style.border}
      shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)]
      min-w-[340px] max-w-[450px]
      transition-all duration-300 ease-out
      ${isExiting ? 'opacity-0 translate-x-10 scale-95' : 'animate-in slide-in-from-right-10 fade-in'}
    `}>
      <div className="shrink-0">
        {style.icon}
      </div>
      
      <div className="flex-1 min-w-0">
        <h4 className={`text-[0.85vw] ${style.text} font-semibold mb-0.5 opacity-70`}>
          {type} notification
        </h4>
        <p className={`text-[0.9vw] font-bold ${style.text} `}>
          {message}
        </p>
      </div>

      <button 
        onClick={handleManualClose} 
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-black transition-all cursor-pointer shadow-sm border border-gray-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Progress Bar Animation */}
      {!isExiting && (
        <div className="absolute bottom-0 left-0 h-[0.2vw] bg-gray-100 w-full rounded-b-2xl overflow-hidden">
          <div 
            className={`h-full ${style.accent} animate-toast-progress`}
            style={{ animationDuration: '4000ms' }}
          />
        </div>
      )}

      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-toast-progress {
          animation-name: toast-progress;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
