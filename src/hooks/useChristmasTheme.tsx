import { useEffect, useState } from 'react';

export const useChristmasTheme = () => {
  const [isChristmas, setIsChristmas] = useState(false);

  useEffect(() => {
    const checkChristmasTheme = () => {
      const now = new Date();
      const christmasEnd = new Date('2026-01-06T23:59:59');
      const christmasStart = new Date('2024-12-01T00:00:00'); // Theme starts from December
      
      const shouldShowChristmas = now >= christmasStart && now <= christmasEnd;
      setIsChristmas(shouldShowChristmas);
      
      // Add or remove Christmas class on body
      if (shouldShowChristmas) {
        document.body.classList.add('christmas-theme');
      } else {
        document.body.classList.remove('christmas-theme');
      }
    };

    checkChristmasTheme();
    
    // Check every hour in case date changes
    const interval = setInterval(checkChristmasTheme, 3600000);
    
    return () => clearInterval(interval);
  }, []);

  return isChristmas;
};
