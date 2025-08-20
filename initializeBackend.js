import fetch from 'node-fetch';

async function initializeBackend(tableName) {
  try {
    console.log(`Initializing backend with table: ${tableName}...`);
    const response = await fetch('http://127.0.0.1:5000/api/load_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_name: tableName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize backend: ${await response.text()}`);
    }

    const data = await response.json();
    console.log("Backend initialized successfully:", data.message);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

const tableName = 'testfinal1pagerecursivesplit_89539e74';
initializeBackend(tableName);