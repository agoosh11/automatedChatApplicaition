import React, { useState } from 'react';

const Chatbox = () => {
  const [query, setQuery] = useState('');
  const [snippet, setSnippet] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSnippet('');

    try {
      const response = await fetch('http://127.0.0.1:5000/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSnippet(data.results.length > 0 ? data.results[0].snippet : 'No response available.');
    } catch (error) {
      setSnippet(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: 'auto' }}>
      <h3>Ask AI</h3>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Enter your question"
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
      />
      <button onClick={handleSearch} style={{ padding: '10px 20px' }}>Search</button>
      {loading && <p>Loading...</p>}
      {snippet && <p style={{ marginTop: '20px' }}>{snippet}</p>}
    </div>
  );
};

export default Chatbox;
