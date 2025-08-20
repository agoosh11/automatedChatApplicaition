from sentence_transformers import SentenceTransformer 
import psycopg2

# init Sentence Transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# connect to the postgres
conn = psycopg2.connect(
    host="localhost",
    database="postgres",
    user="postgres",
    password="@Kaji86",
    port=5433
)
cur = conn.cursor()

# fetch the data to embed from postgres
cur.execute("SELECT id, content FROM rec_onlywithst")
rows = cur.fetchall()

# generate embeddings and store them back in db
for row in rows:
    doc_id, content = row

    # generate embedding using the Sentence Transformer model
    embedding = model.encode(content).tolist()  # Convert to list for storage in postgres

    # update the row in db with the generated embedding
    cur.execute(
        "UPDATE rec_onlywithst SET embedding = %s WHERE id = %s",
        (embedding, doc_id)
    )

# Commit the changes and close db connection
conn.commit()
cur.close()
conn.close()

print("Embeddings have been successfully generated and stored.")