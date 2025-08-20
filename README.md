# Capstone Chat App

A domain specific RAG AI chatbot that crawls a given website using Firecrawl API and stores the extracted content in a PostgreSQL database to prepare a domain ready chatbot.

## Usage

Run the crawler with a URL and table name:

```bash
node crawl.js <url> <table_name>
```

Example:
```bash
node crawl.js https://example.com example_content
```

## Environment Variables

- `FIRECRAWL_API_KEY`: Your Firecrawl API key (required)
- `DB_USER`: PostgreSQL username (default: postgres)
- `DB_HOST`: Database host (default: localhost)
- `DB_NAME`: Database name (default: postgres)
- `DB_PASSWORD`: Database password (required)
- `DB_PORT`: Database port (default: 5433)