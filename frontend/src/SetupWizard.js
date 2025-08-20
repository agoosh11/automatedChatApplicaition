import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './SetupWizard.css';

const SetupWizard = () => {
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!companyName.trim() || !websiteUrl.trim()) {
      setError('Please fill in all fields');
      return;
    }
    
    setProcessing(true);
    setCurrentStep('Initializing process...');
    
    try {
      const response = await fetch('http://127.0.0.1:5000/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          websiteUrl: websiteUrl.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Setup process failed');
      }
      
      // Setup was successful, navigate to the chatbot interface
      navigate('/chat');
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  // Setup EventSource for real-time updates
  useEffect(() => {
    if (!processing) return;

    const eventSource = new EventSource('http://127.0.0.1:5000/api/setup-status');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.step) {
          setCurrentStep(data.step);
        }
        
        if (data.log) {
          setLogs(prevLogs => [...prevLogs, data.log]);
        }
        
        if (data.complete) {
          eventSource.close();
          // Wait a bit before navigating to give user time to see completion message
          setTimeout(() => navigate('/chat'), 2000);
        }
        
        if (data.error) {
          setError(data.error);
          setProcessing(false);
          eventSource.close();
        }
      } catch (err) {
        console.error('Error parsing event data:', err);
      }
    };

    eventSource.onerror = () => {
      setError('Lost connection to the server');
      setProcessing(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [processing, navigate]);

  return (
    <div className="setup-wizard">
      <div className="setup-container">
        <h1>Chatbot Setup Wizard</h1>
        
        {!processing ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="companyName">Company Name</label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name (alphanumeric only)"
                disabled={processing}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="websiteUrl">Website URL</label>
              <input
                type="url"
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={processing}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={processing}>
              Start Setup Process
            </button>
          </form>
        ) : (
          <div className="processing-status">
            <h2>{currentStep}</h2>
            <div className="progress-indicator">
              <div className="spinner"></div>
            </div>
            
            <div className="logs-container">
              {logs.map((log, index) => (
                <div key={index} className="log-entry">{log}</div>
              ))}
            </div>
            
            {error && <div className="error-message">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupWizard;