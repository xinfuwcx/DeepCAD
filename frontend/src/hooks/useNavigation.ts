import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useNavigation = () => {
  const [showLanding, setShowLanding] = useState(false);
  const navigate = useNavigate();

  console.log('useNavigation: showLanding =', showLanding);

  const handleStartWorkspace = () => {
    console.log('handleStartWorkspace called');
    setShowLanding(false);
    navigate('/dashboard');
  };

  useEffect(() => {
    console.log('useNavigation useEffect: navigating to dashboard');
    // Always navigate to dashboard by default
    navigate('/dashboard');
    setShowLanding(false);
  }, [navigate]);

  return {
    showLanding,
    handleStartWorkspace
  };
};