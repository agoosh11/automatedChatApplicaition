from FlagEmbedding import BGEM3FlagModel
import psycopg2
import sys

# check for command line arguments
if len(sys.argv) < 2:
    print("Usage: python bge-m3Embeding.py [table_name]")
    sys.exit(1)

table_name = sys.argv[1]
print(f"Generating embeddings for table: {table_name}")

# initialize BGE-M3 model
model = BGEM3FlagModel('BAAI/bge-small-en-v1.5', use_fp16=True)  # use_fp16=True speeds up computation with slight performance degradation

# connect to the postgres
conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="@Kaji86",
    port=5433
)
cur = conn.cursor()

# check if table exists
cur.execute(f"""
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = '{table_name}'
    );
""")
table_exists = cur.fetchone()[0]

if not table_exists:
    print(f"Error: Table '{table_name}' does not exist.")
    sys.exit(1)

# fetch the data to embed from postgres
cur.execute(f"SELECT id, content FROM {table_name}")
rows = cur.fetchall()

print(f"Found {len(rows)} chunks to embed.")

# generate embeddings and store them back in postgres
count = 0
batch_size = 10  # process in batches to provide progress updates

for i in range(0, len(rows), batch_size):
    batch = rows[i:i+batch_size]
    batch_ids = [row[0] for row in batch]
    batch_contents = [row[1] for row in batch]
    
    # generate embeddings using the BGE-M3 model
    embeddings = model.encode(batch_contents, batch_size=batch_size)['dense_vecs']

    # update rows in postgres with the generated embeddings
    for j, (doc_id, embedding) in enumerate(zip(batch_ids, embeddings)):
        cur.execute(
            f"UPDATE {table_name} SET embedding = %s WHERE id = %s",
            (embedding.tolist(), doc_id)
        )
    
    count += len(batch)
    conn.commit()
    print(f"Processed {count}/{len(rows)} chunks")

# commit the changes and close the connection
conn.commit()
cur.close()
conn.close()

print(f"Embeddings have been successfully generated and stored in {table_name} using BGE-M3 model.")