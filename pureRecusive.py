import psycopg2
import sys
import nltk

# check for command line arguments
if len(sys.argv) < 3:
    print("Usage: python pureRecusive.py [source_table_name] [destination_table_name]")
    sys.exit(1)

source_table = sys.argv[1]
destination_table = sys.argv[2]

print(f"Chunking data from {source_table} into {destination_table}")

# connect to postgres
conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="@Kaji86",
    port=5433
)
cur = conn.cursor()

# create destination table
cur.execute(f"""
    CREATE TABLE IF NOT EXISTS {destination_table} (
        id SERIAL PRIMARY KEY,
        url TEXT,
        title TEXT,
        content TEXT,
        embedding VECTOR(384)
    );
""")
conn.commit()

# check if source table exists
cur.execute(f"""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '{source_table}'
    );
""")
table_exists = cur.fetchone()[0]

if not table_exists:
    print(f"Error: Source table '{source_table}' does not exist.")
    sys.exit(1)

# fetch the url, title, and content from the source table
cur.execute(f"SELECT id, url, title, content FROM {source_table};")
rows = cur.fetchall()

print(f"Found {len(rows)} documents to process.")

# function to recursively split content into chunks of max 500 tokens
def recursive_token_splitting(text, max_tokens=500):
    words = text.split()
    if len(words) <= max_tokens:
        return [text]

    # split the text in half for recursive processing
    mid = len(words) // 2
    first_half = ' '.join(words[:mid])
    second_half = ' '.join(words[mid:])
    
    # recursively process each half
    return recursive_token_splitting(first_half, max_tokens) + recursive_token_splitting(second_half, max_tokens)

# process each row from the original dataset
total_chunks = 0
for row in rows:
    original_id, url, title, content = row
    
    # apply recursive token splitting with 500 token limit
    chunks = recursive_token_splitting(content, 500)
    total_chunks += len(chunks)
    
    # insert chunks into the destination table with url and title
    for chunk in chunks:
        cur.execute(f"""
            INSERT INTO {destination_table} (url, title, content, embedding)
            VALUES (%s, %s, %s, NULL);
        """, (url, title, chunk))
    
    conn.commit()

# close the database connection
cur.close()
conn.close()

print(f"Content has been chunked using recursive splitting with 500 token limit.")
print(f"Created {total_chunks} chunks from {len(rows)} original documents.")
print(f"Data saved to table: {destination_table}")