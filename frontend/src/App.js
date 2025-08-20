import React, { useState } from 'react';

const Chatbox = () => {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, chat_history: chatHistory }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (data.results.length > 0) {
        setChatHistory([...data.chat_history]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setQuery('');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundImage: `url('/HackerEarth.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh',
        width: '100vw',
      }}
    >
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0px 0px 10px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ marginTop: 0, textAlign: 'center' }}>Chat with AI</h3>

        <div
          style={{
            border: '1px solid #ccc',
            padding: '10px',
            height: '200px',
            overflowY: 'auto',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9',
          }}
        >
          {chatHistory.map((item, index) => (
            <div key={index} style={{ marginBottom: '10px' }}>
              <p><strong>You:</strong> {item.question}</p>
              <p><strong>AI:</strong> {item.response}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Ask..."
            style={{ flex: 1, padding: '8px' }}
          />

          <button
            onClick={handleSearch}
            style={{ padding: '8px 12px' }}
            disabled={loading}
          >
            {loading ? '...' : 'Ask'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbox;
