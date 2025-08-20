async function testFirecrawl() {
    try {
      console.log('Attempting to import FirecrawlApp...');
      const firecrawlModule = await import('@mendable/firecrawl-js');
      const FirecrawlApp = firecrawlModule.default;
      console.log('Successfully imported FirecrawlApp');
      
      const API_KEY = 'fc-b9305baf096149d98b13e3fc70b30898';
      const app = new FirecrawlApp({ apiKey: API_KEY });
      console.log('FirecrawlApp initialized');
      
      console.log('Testing API with a simple request...');
      
      // create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API call timed out after 15 seconds')), 15000);
      });
      
      // try with minimal options
      const response = await Promise.race([
        app.crawlUrl('https://example.com', { limit: 1 }),
        timeoutPromise
      ]);
      
      console.log('API response received:', JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('Test failed:', error.message);
      console.error(error.stack);
    }
  }
  
  testFirecrawl();