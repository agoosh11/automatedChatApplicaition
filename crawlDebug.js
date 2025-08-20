import pkg from 'pg';
const { Client } = pkg;

// Try catching import errors
let FirecrawlApp;
try {
  console.log('Attempting to import FirecrawlApp...');
  const firecrawlModule = await import('@mendable/firecrawl-js');
  FirecrawlApp = firecrawlModule.default;
  console.log('Successfully imported FirecrawlApp:', typeof FirecrawlApp);
} catch (error) {
  console.error('Error importing FirecrawlApp:', error.message);
  process.exit(1);
}

// Replace with your actual API key
const FIRECRAWL_API_KEY = 'fc-b9305baf096149d98b13e3fc70b30898';

// PostgreSQL client setup
const dbClient = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '@Kaji86',
  port: 5433
});

console.log('Connecting to PostgreSQL...');
await dbClient.connect();
console.log('Connected to PostgreSQL');

console.log('Initializing FirecrawlApp with API key...');
const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
console.log('FirecrawlApp initialized');

async function crawlAndSave(url, tableName) {
  try {
    console.log(`Starting crawl for URL: ${url}`);
    
    console.log('Creating timeout promise...');
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firecrawl API call timed out after 45 seconds')), 45000);
    });

    console.log('Making API call to crawl URL...');
    console.log('API call started at:', new Date().toISOString());
    
    try {
      console.log('Calling app.crawlUrl directly...');
      const crawlPromise = app.crawlUrl(url, { limit: 5 });
      console.log('API promise created, now racing with timeout...');
      
      const crawlResponse = await Promise.race([
        crawlPromise,
        timeoutPromise
      ]);
      
      console.log('API call completed at:', new Date().toISOString());
      console.log('Crawl response received, checking success status...');

      if (!crawlResponse.success) {
        throw new Error(`Failed to crawl: ${crawlResponse.error || 'Unknown error'}`);
      }

      console.log('Crawl successful, processing data...');
      const pages = crawlResponse.data || [];
      console.log(`Number of pages crawled: ${pages.length}`);
      
      try {
        console.log('Starting database operations...');
        const createQuery = `
          CREATE TABLE IF NOT EXISTS "${tableName}" (
            id SERIAL PRIMARY KEY,
            url TEXT,
            title TEXT,
            content TEXT,
            embedding VECTOR(384)
          );
        `;
        console.log(`Creating table "${tableName}" if not exists...`);
        await dbClient.query(createQuery);
        console.log(`Table "${tableName}" is ready`);

        const insertQuery = `
          INSERT INTO "${tableName}" (url, title, content, embedding)
          VALUES ($1, $2, $3, $4);
        `;

        for (const [index, page] of pages.entries()) {
          console.log(`Processing page ${index + 1}/${pages.length}...`);
          
          const pageUrl = page.metadata?.url || page.metadata?.sourceURL || '';
          const title = page.metadata?.title || '';
          const content = page.markdown || '';
          
          console.log(`Inserting page: ${pageUrl}`);
          await dbClient.query(insertQuery, [pageUrl, title, content, null]);
          console.log(`Inserted page ${index + 1}`);
        }

        console.log(`All data inserted into table: "${tableName}"`);
      } catch (dbError) {
        console.error('Database operation failed:', dbError.message);
        throw dbError;
      }
    } catch (apiError) {
      console.error('Error during API call:', apiError.message);
      throw apiError;
    }
  } catch (err) {
    console.error('Error during crawl or DB insert:', err.message);
    console.error(err.stack);
  } finally {
    console.log('Function execution complete');
  }
}

// Directly call crawlAndSave with arguments provided by prepareChatbot.js
const [,, url, tableName] = process.argv;

if (!url || !tableName) {
  console.error("Usage: node crawlDebug.js <url> <tableName>");
  process.exit(1);
}

console.log('Running crawlAndSave directly with provided arguments...');
crawlAndSave(url, tableName)
  .then(() => {
    console.log('Crawl and save complete. Closing DB connection.');
    dbClient.end();
    console.log('DB connection closed.');
  })
  .catch((err) => {
    console.error("Script failed:", err.message);
    dbClient.end();
    console.log('DB connection closed after error.');
    process.exit(1);
  });