import React, { useEffect } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen = ({ onFinished }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 8000); // 8 seconds

    return () => clearTimeout(timer); // Cleanup on unmount
  }, [onFinished]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-logo">
          <div className="splash-logo-icon">L</div>
        </div>
        <h1 className="splash-title">WCZYTYWANIE...</h1>
        <div className="progress-bar-container">
          <div className="progress-bar"></div>
        </div>
      </div>
      <footer className="splash-footer">
        <p className="typewriter">Aplikacja Powered By GrzesKlep 730819654</p>
      </footer>
    </div>
  );
};

export default SplashScreen;
