
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from flask import Flask, jsonify

np.random.seed(42)

NUM_USERS = 200
NUM_ITEMS = 100
NUM_INTERACTIONS = 5000

df = pd.DataFrame({
    "user_id": np.random.randint(1, NUM_USERS + 1, NUM_INTERACTIONS),
    "item_id": np.random.randint(1, NUM_ITEMS + 1, NUM_INTERACTIONS),
    "rating": np.random.randint(1, 6, NUM_INTERACTIONS)
})

print(df.head())


user_item_matrix = df.pivot_table(
    index="user_id",
    columns="item_id",
    values="rating",
    aggfunc="mean"
).fillna(0)



user_similarity = cosine_similarity(user_item_matrix)

user_similarity_df = pd.DataFrame(
    user_similarity,
    index=user_item_matrix.index,
    columns=user_item_matrix.index
)

print("User similarity matrix created.")

def recommend_items(user_id, top_n=5):

    # Check if user exists
    if user_id not in user_item_matrix.index:
        return []

    # Get similar users
    similar_users = user_similarity_df[user_id] \
        .sort_values(ascending=False)[1:6]

    recommended_items = {}

    for similar_user in similar_users.index:

        # Items rated by similar user
        similar_user_ratings = user_item_matrix.loc[similar_user]

        # Items already rated by current user
        current_user_ratings = user_item_matrix.loc[user_id]

        for item_id in user_item_matrix.columns:

            if current_user_ratings[item_id] == 0 and \
               similar_user_ratings[item_id] > 0:

                if item_id not in recommended_items:
                    recommended_items[item_id] = 0

                recommended_items[item_id] += \
                    similar_user_ratings[item_id]

    recommended_items = sorted(
        recommended_items.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return recommended_items[:top_n]

print("\nRecommendations for User 10:\n")

recommendations = recommend_items(10)

for item, score in recommendations:
    print(f"Item {item} | Score: {score:.2f}")


app = Flask(__name__)

@app.route("/recommend/<int:user_id>")
def recommend(user_id):

    recommendations = recommend_items(user_id)

    response = []

    for item, score in recommendations:
        response.append({
            "item_id": int(item),
            "score": round(float(score), 2)
        })

    return jsonify({
        "user_id": user_id,
        "recommendations": response
    })


if __name__ == "__main__":

    print("\nFlask API Running...")
    print("Open:")
    print("http://127.0.0.1:5000/recommend/10")

    app.run(debug=True)