"use client";

import { useState, useMemo } from "react";
import zxcvbn from "zxcvbn";

export function PasswordStrengthClient() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const result = useMemo(() => {
    if (!password) return null;
    return zxcvbn(password);
  }, [password]);

  const getScoreColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "bg-destructive";
      case 2:
        return "bg-orange-500";
      case 3:
        return "bg-yellow-500";
      case 4:
        return "bg-system-green";
      default:
        return "bg-separator";
    }
  };

  const getScoreLabel = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      case 4:
        return "Strong";
      default:
        return "";
    }
  };

  return (
    <div className="apple-surface space-y-8 max-w-2xl mx-auto w-full">
      
      {/* Input Section */}
      <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator p-6 sm:p-8">
        
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type a password to test..."
            className="w-full h-16 bg-fill-tertiary rounded-xl px-4 sm:px-6 pr-14 text-xl sm:text-2xl font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>

        {/* Strength Bar */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-muted-foreground">Strength</span>
            <span className={password ? "text-foreground" : "text-muted-foreground"}>
              {password ? getScoreLabel(result!.score) : "None"}
            </span>
          </div>
          <div className="flex gap-2 h-2.5">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`flex-1 rounded-full transition-colors duration-500 ${
                  password && result!.score >= level || (result!.score === 0 && level === 1 && password)
                    ? getScoreColor(result!.score)
                    : "bg-fill-tertiary"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="px-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Detailed Analysis
          </h2>

          <div className="bg-card shadow-sm rounded-[22px] overflow-hidden border border-separator">
            
            {/* Crack Time */}
            <div className="settings-control-row sm:px-5">
              <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-9 h-9 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span>
                <strong>Crack Time</strong>
                <small>Estimated time to crack</small>
              </span>
              <span className="font-semibold text-[15px] text-right">
                {result.crack_times_display.offline_slow_hashing_1e4_per_second}
              </span>
            </div>
            
            <div className="h-px bg-separator ml-[4.5rem]" />

            {/* Guesses */}
            <div className="settings-control-row sm:px-5">
              <span className="flex items-center justify-center text-muted-foreground bg-fill-secondary w-9 h-9 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </span>
              <span>
                <strong>Guesses</strong>
                <small>Estimated required attempts</small>
              </span>
              <span className="font-mono text-[14px] text-right font-medium">
                {result.guesses.toLocaleString()}
              </span>
            </div>

            {/* Feedback & Suggestions */}
            {(result.feedback.warning || result.feedback.suggestions.length > 0) && (
              <>
                <div className="h-px bg-separator ml-[4.5rem]" />
                <div className="p-4 sm:px-5 sm:py-5 flex flex-col gap-3">
                  {result.feedback.warning && (
                    <p className="text-[14px] font-medium text-orange-500 flex items-start gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                      {result.feedback.warning}
                    </p>
                  )}
                  {result.feedback.suggestions.length > 0 && (
                    <ul className="text-[13px] text-muted-foreground list-disc list-inside space-y-1 ml-1">
                      {result.feedback.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
