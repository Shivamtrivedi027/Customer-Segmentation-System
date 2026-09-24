"""
Customer Segmentation System - Backend Application
--------------------------------------------------
A beginner-friendly Flask backend providing K-Means clustering (K=3)
on customer dataset (Income vs Spending Score).

Built with: Flask, pandas, scikit-learn, matplotlib
"""

import os
import io
import base64
import pandas as pd
import numpy as np
import matplotlib
# Use non-interactive backend for server-side image generation
matplotlib.use('Agg')
import matplotlib.pyplot as plt

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# Initialize Flask application
app = Flask(__name__, static_folder='static')
# Enable Cross-Origin Resource Sharing so frontend can call API easily
CORS(app)

# Ensure static folder exists for saving generated plots
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
os.makedirs(STATIC_DIR, exist_ok=True)

# Default sample dataset path
SAMPLE_DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dataset', 'sample.csv')


@app.route("/", methods=["GET"])
@app.route("/health", methods=["GET"])
def index():
    """
    Health check endpoint.
    Requirement: Return 'Server Running' and service identification.
    """
    return jsonify({
        "status": "running",
        "service": "customer-segmentation-backend",
        "message": "Server Running"
    }), 200


@app.route("/analyze", methods=["POST"])
def analyze():
    """
    Main analysis endpoint.
    - Accepts a CSV file via multipart/form-data OR falls back to the sample dataset.
    - Preprocesses Income and Spending Score.
    - Runs K-Means clustering (K=3).
    - Generates a clean scatter plot using matplotlib.
    - Returns cluster statistics, interpretation text, and the plot image path.
    """
    try:
        df = None

        # Check if a file was uploaded
        if 'file' in request.files and request.files['file'].filename != '':
            uploaded_file = request.files['file']
            try:
                # Support various delimiters (comma, semicolon, tab) and UTF-8 BOM
                try:
                    df = pd.read_csv(uploaded_file, sep=None, engine='python', encoding='utf-8-sig')
                except Exception:
                    uploaded_file.seek(0)
                    df = pd.read_csv(uploaded_file, encoding='latin1')
            except Exception as e:
                return jsonify({"error": f"Failed to parse uploaded CSV: {str(e)}"}), 400
        else:
            # Fall back to default sample dataset
            sample_candidates = [
                SAMPLE_DATA_PATH,
                os.path.join(os.getcwd(), 'dataset', 'sample.csv'),
                os.path.join(os.getcwd(), 'sample.csv'),
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sample.csv')
            ]
            sample_found = next((p for p in sample_candidates if os.path.exists(p)), None)
            if sample_found:
                try:
                    df = pd.read_csv(sample_found, sep=None, engine='python', encoding='utf-8-sig')
                except Exception:
                    df = pd.read_csv(sample_found)
            else:
                return jsonify({"error": "No file uploaded and sample dataset not found."}), 400

        # Validate that we have data
        if df is None or len(df) == 0:
            return jsonify({"error": "Dataset is empty."}), 400

        # Normalize column names for flexible matching
        col_map = {}
        for col in df.columns:
            clean_name = str(col).strip().lower().replace(" ", "").replace("_", "").replace('"', '').replace("'", "").replace('\ufeff', '')
            if "income" in clean_name or "salary" in clean_name or "earning" in clean_name:
                col_map["income"] = col
            elif "spending" in clean_name or "score" in clean_name or "expense" in clean_name:
                col_map["spending"] = col

        # If columns were not matched by name, default to the 2nd and 3rd numeric columns or 1st & 2nd
        if "income" not in col_map or "spending" not in col_map:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            # If CustomerID or ID is first numeric column, pick the next two
            if len(numeric_cols) >= 3 and "id" in numeric_cols[0].lower():
                col_income = numeric_cols[1]
                col_spending = numeric_cols[2]
            elif len(numeric_cols) >= 2:
                col_income = numeric_cols[0]
                col_spending = numeric_cols[1]
            else:
                return jsonify({"error": "Dataset must contain at least two numeric features (Income and Spending Score)."}), 400
        else:
            col_income = col_map["income"]
            col_spending = col_map["spending"]

        # Extract features
        features = df[[col_income, col_spending]].copy()

        # Step 1: Preprocessing - Handle missing values simply using median
        features = features.fillna(features.median())

        # Step 2: Preprocessing - Standard Scaler
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(features)

        # Step 3: K-Means Clustering (K=3 fixed as per hackathon specification)
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        raw_labels = kmeans.fit_predict(features_scaled)

        # Attach raw cluster labels to dataframe
        df['RawCluster'] = raw_labels

        # Step 4: Map clusters deterministically to guarantee consistent interpretation:
        # Cluster 1 -> High spending customers
        # Cluster 2 -> Medium customers
        # Cluster 3 -> Low activity customers
        cluster_means = df.groupby('RawCluster')[col_spending].mean()
        # Sort raw cluster IDs by mean spending descending
        sorted_raw_clusters = cluster_means.sort_values(ascending=False).index.tolist()

        # Label map: 0: highest spending (Cluster 1), 1: medium (Cluster 2), 2: lowest (Cluster 3)
        mapping = {
            sorted_raw_clusters[0]: 1,
            sorted_raw_clusters[1]: 2,
            sorted_raw_clusters[2]: 3
        }
        df['Cluster'] = df['RawCluster'].map(mapping)

        # Calculate cluster centers in original scale
        cluster_summaries = []
        cluster_info_text = []

        definitions = {
            1: {
                "name": "Cluster 1: High Spending Customers",
                "tag": "High Spenders",
                "desc": "Customers who demonstrate high spending engagement regardless of income level."
            },
            2: {
                "name": "Cluster 2: Medium Customers",
                "tag": "Balanced Regulars",
                "desc": "Customers with moderate income and steady, moderate spending habits."
            },
            3: {
                "name": "Cluster 3: Low Activity Customers",
                "tag": "Low Activity",
                "desc": "Customers with low spending frequency or conservative spending behavior."
            }
        }

        for c_id in [1, 2, 3]:
            sub_df = df[df['Cluster'] == c_id]
            count = len(sub_df)
            avg_inc = float(sub_df[col_income].mean()) if count > 0 else 0.0
            avg_spd = float(sub_df[col_spending].mean()) if count > 0 else 0.0
            percentage = round((count / len(df)) * 100, 1)

            cluster_summaries.append({
                "cluster_id": c_id,
                "name": definitions[c_id]["name"],
                "tag": definitions[c_id]["tag"],
                "description": definitions[c_id]["desc"],
                "count": count,
                "percentage": percentage,
                "avg_income": round(avg_inc, 1),
                "avg_spending": round(avg_spd, 1)
            })

            cluster_info_text.append(
                f"Cluster {c_id} ({definitions[c_id]['tag']}): {count} customers ({percentage}%), "
                f"Avg Income: ${round(avg_inc, 1)}k, Avg Spending Score: {round(avg_spd, 1)}/100."
            )

        # Step 5: Generate scatter plot using matplotlib
        # Restrained, elegant palette adhering strictly to design guidelines (warm background, clear colors, no gradients)
        colors = {
            1: '#0066cc',  # Primary Accent Blue (High spenders)
            2: '#2e7d32',  # Restrained Forest Green (Medium regulars)
            3: '#757575'   # Neutral Slate (Low activity)
        }

        fig, ax = plt.subplots(figsize=(8, 5.5), dpi=150)
        fig.patch.set_facecolor('#ffffff')
        ax.set_facecolor('#ffffff')

        # Scatter points for each cluster
        for c_id in [1, 2, 3]:
            sub_df = df[df['Cluster'] == c_id]
            ax.scatter(
                sub_df[col_income],
                sub_df[col_spending],
                c=colors[c_id],
                label=f"Cluster {c_id} ({definitions[c_id]['tag']})",
                s=70,
                alpha=0.85,
                edgecolors='none'
            )

        # Compute and plot cluster centers in original units
        for c_id in [1, 2, 3]:
            sub_df = df[df['Cluster'] == c_id]
            center_x = sub_df[col_income].mean()
            center_y = sub_df[col_spending].mean()
            ax.scatter(
                center_x, center_y,
                c='#1a1a1a',
                marker='X',
                s=130,
                linewidths=1.5,
                edgecolors='#ffffff',
                zorder=5
            )

        # Typography & layout inspired by Apple design
        ax.set_title("Customer Segments (K-Means, K=3)", fontsize=13, fontweight='600', color='#1a1a1a', pad=15)
        ax.set_xlabel("Annual Income ($k)", fontsize=11, color='#1a1a1a', labelpad=10)
        ax.set_ylabel("Spending Score (1-100)", fontsize=11, color='#1a1a1a', labelpad=10)

        # Minimalist grid and clean borders
        ax.grid(True, linestyle='--', linewidth=0.5, color='#e5e5e3', alpha=0.8)
        for spine in ax.spines.values():
            spine.set_color('#d1d1cd')
            spine.set_linewidth(0.8)

        ax.tick_params(colors='#4a4a4a', labelsize=10)
        ax.legend(frameon=True, facecolor='#ffffff', edgecolor='#e5e5e3', fontsize=9, loc='upper right')

        plt.tight_layout()

        # Save plot image to static directory
        plot_filename = "cluster_plot.png"
        plot_filepath = os.path.join(STATIC_DIR, plot_filename)
        plt.savefig(plot_filepath, format='png', dpi=150, facecolor=fig.get_facecolor(), edgecolor='none')

        # Also encode to base64 so frontend can display immediately without filesystem path friction
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, facecolor=fig.get_facecolor(), edgecolor='none')
        buffer.seek(0)
        plot_base64 = "data:image/png;base64," + base64.b64encode(buffer.read()).decode('utf-8')
        plt.close(fig)

        # Response payload
        interpretation_text = " | ".join(cluster_info_text)

        response_data = {
            "success": True,
            "cluster_count": 3,
            "total_customers": len(df),
            "clusters": cluster_summaries,
            "interpretation_text": interpretation_text,
            "plot_image_path": f"/static/{plot_filename}",
            "plot_base64": plot_base64
        }

        return jsonify(response_data), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred during analysis: {str(e)}"}), 500


@app.route("/static/<path:filename>", methods=["GET"])
def serve_static(filename):
    """Serve generated plot images from the static directory."""
    return send_from_directory(STATIC_DIR, filename)


if __name__ == "__main__":
    import socket

    def get_port():
        for candidate in [5000, 5001, 5005, 5050, 8000]:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('127.0.0.1', candidate))
                    return candidate
            except OSError:
                continue
        return 5001

    port = get_port()
    print(f"Starting Customer Segmentation System Backend on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=False)

