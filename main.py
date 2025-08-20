from flask import Flask, request, jsonify
import openai
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import traceback
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env.local')

# init flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

# openAI client setup

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

# global variables for embeddings
texts, titles, urls, tfidf_matrix, vectorizer = [], [], [], None, None

# database connection function
def get_db_connection():
    return psycopg2.connect(
        dbname="postgres",
        user="postgres",
        password="@Kaji86",
        host="localhost",
        port="5433"
    )

@app.route('/api/load_data', methods=['POST'])
def load_data():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload received"}), 400

        table_name = data.get('table_name', '').strip()
        if not table_name:
            return jsonify({"error": "Table name is required"}), 400

        # connect to the database
        conn = get_db_connection()
        cursor = conn.cursor()

        # fetch data from the specified table
        cursor.execute(f"SELECT url, title, content FROM \"{table_name}\";")
        rows = cursor.fetchall()

        # process the data into embeddings
        global texts, titles, urls, tfidf_matrix, vectorizer
        texts = [row[2] for row in rows]
        titles = [row[1] for row in rows]
        urls = [row[0] for row in rows]

        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(texts)

        # close the database connection
        cursor.close()
        conn.close()

        return jsonify({"message": "Data loaded successfully"})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def generate_similar_queries(prompt, num_variations=3):
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"Generate exactly {num_variations} alternative search queries that are semantically similar to the original query. Output only the queries, one per line."},
            {"role": "user", "content": f"Original Query: {prompt}"}
        ],
        temperature=0.7,
        max_tokens=150
    )
    variations = response.choices[0].message.content.strip().split('\n')
    return [v for v in variations if v.strip()]

def mmr_selection(top_indices, doc_embeddings, question_embedding, k, diversity=0.7):
    selected = []
    candidate_indices = set(top_indices)

    while len(selected) < k and candidate_indices:
        if not selected:
            best = max(candidate_indices,
                       key=lambda idx: cosine_similarity([doc_embeddings[idx]], [question_embedding])[0][0])
        else:
            best = max(
                candidate_indices,
                key=lambda idx: diversity * cosine_similarity([doc_embeddings[idx]], [question_embedding])[0][0] - 
                                (1 - diversity) * max(
                    cosine_similarity([doc_embeddings[idx]], [doc_embeddings[i]])[0][0] for i in selected
                )
            )
        selected.append(best)
        candidate_indices.remove(best)

    return selected

def find_most_relevant_context(question, k=3):
    alt_queries = generate_similar_queries(question)
    all_queries = [question] + alt_queries

    question_vector = vectorizer.transform(all_queries)
    similarities = cosine_similarity(question_vector, tfidf_matrix).mean(axis=0)

    top_k_indices = similarities.argsort()[-(k * 2):][::-1]
    selected_indices = mmr_selection(top_k_indices, tfidf_matrix.toarray(), question_vector.toarray()[0], k)

    selected_texts = [f"{titles[i]}: {texts[i]}" for i in selected_indices]
    selected_urls = [urls[i] for i in selected_indices]

    return selected_texts, selected_urls

@app.route('/api/search', methods=['POST'])
def search():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload received"}), 400

        question = data.get('query', '').strip()
        if not question:
            return jsonify({"error": "Query is required"}), 400

        history = data.get('chat_history', [])

        k = 3
        relevant_contexts, relevant_urls = find_most_relevant_context(question, k)
        context_with_urls = "\n\n".join([f"{context}\nSource: {url}" for context, url in zip(relevant_contexts, relevant_urls)])

        if len(history) > 5:
            summary_prompt = "\n".join([f"Q: {qa['question']}\nA: {qa['response']}" for qa in history])
            summary_prompt += "\nSummarize this conversation briefly."

            summary_response = client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "system", "content": "Summarize the following chat history:"},
                          {"role": "user", "content": summary_prompt}]
            )
            history = [{"question": "Summary", "response": summary_response.choices[0].message.content}]

        messages = [
            {"role": "system", "content": "You are a helpful assistant. Answer the user's question based on the provided context and conversation history."}
        ]

        for qa in history:
            messages.append({"role": "user", "content": qa["question"]})
            messages.append({"role": "assistant", "content": qa["response"]})

        messages.append({
            "role": "user",
            "content": (
                f"Question: {question}\n\n"
                f"Relevant documentation:\n{context_with_urls}\n\n"
                "Answer the question based on the provided documentation."
            )
        })

        completion = client.chat.completions.create(
            model="gpt-4",
            messages=messages
        )

        response = completion.choices[0].message.content
        history.append({"question": question, "response": response})
        if len(history) > 5:
            history.pop(0)

        return jsonify({"results": [{"snippet": response}], "chat_history": history})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Unhandled exception: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)
