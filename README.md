# Customer Segmentation System

A complete, beginner-friendly machine learning web application that segments customers based on **Annual Income** and **Spending Score** using **K-Means Clustering ($K=3$)**. Designed with an Apple-inspired minimalist aesthetic.

---

## 🚀 Quick Start Guide

### 1. Requirements
Ensure Python 3.10+ is installed on your system. The required libraries are:
- `Flask`
- `flask-cors`
- `pandas`
- `scikit-learn`
- `matplotlib`

Install them via pip if not already installed:
```bash
pip install Flask flask-cors pandas scikit-learn matplotlib
```

### 2. Run the Flask Backend
Navigate to the `backend` folder and start the server:
```bash
python backend/app.py
```
*The server will start on `http://127.0.0.1:5000`.*

### 3. Open the Frontend
Simply double-click or open `frontend/index.html` in any web browser (Chrome, Edge, Safari, Firefox).

*Alternatively, on Windows, double-click `run.bat` in the project root to launch the backend and open the browser automatically.*

---

## 📁 Project Structure

```
customer-segmentation/
│
├── backend/
│   ├── app.py              # Flask server and K-Means clustering pipeline
│   └── static/             # Directory where generated plot images are saved
│
├── frontend/
│   ├── index.html          # Clean semantic UI with Apple-inspired hierarchy
│   ├── style.css           # Warm neutral minimalist design (#f7f7f5)
│   └── script.js           # Upload handlers, API requests, and dynamic rendering
│
├── dataset/
│   └── sample.csv          # Sample dataset (CustomerID, Income, SpendingScore)
│
├── README.md               # Project documentation and presentation pitch
└── run.bat                 # 1-click Windows launcher
```

---

## 🧠 Machine Learning Explanation

### 1. What is K-Means Clustering?
K-Means is an unsupervised machine learning algorithm that groups unlabeled data into $K$ distinct clusters based on mathematical similarity. It places $K$ initial centroids, assigns every customer to their closest centroid using Euclidean distance, and recalculates the centroid coordinates iteratively until convergence.

### 2. How Clustering Works in This Project
1. **Feature Extraction**: We select two key behavioral signals: `Income` (financial capacity) and `Spending Score` (purchasing propensity).
2. **Preprocessing**: Missing values are imputed with median values, and both features are normalized using `StandardScaler` so that neither feature skews the distance metrics.
3. **Clustering ($K=3$)**: The model identifies 3 distinct groups:
   - **Cluster 1 — High Spending Customers**: High purchase propensity (priority for VIP programs & loyalty incentives).
   - **Cluster 2 — Medium Customers**: Balanced income and consistent spending (steady core audience).
   - **Cluster 3 — Low Activity Customers**: Conservative spending patterns (target for win-back campaigns and introductory offers).
4. **Visualization**: A high-resolution scatter plot is generated via `matplotlib`, visualizing the 3 cohorts and their respective cluster centers ($X$ markers).

### 3. 30-Second Pitch to Judges
> *"We built an end-to-end customer segmentation system powered by Flask and scikit-learn. Instead of relying on guesswork, businesses can upload raw transaction data and immediately segment their audience into three actionable behavioral clusters: High Spenders, Steady Regulars, and Low Activity accounts. The app outputs real-time statistical distributions and a visual scatter plot, bridging the gap between raw data science and marketing decision-making."*

---

## 🔌 API Reference

### Health Check
- **URL**: `GET /`
- **Response**: `"Server Running"` (Status `200 OK`)

### Run Clustering Analysis
- **URL**: `POST /analyze`
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file` *(optional)*: Uploaded `.csv` file with customer data. If omitted, the default `sample.csv` is automatically analyzed.
- **Sample JSON Response**:
```json
{
  "success": true,
  "cluster_count": 3,
  "total_customers": 60,
  "clusters": [
    {
      "cluster_id": 1,
      "name": "Cluster 1: High Spending Customers",
      "tag": "High Spenders",
      "count": 22,
      "percentage": 36.7,
      "avg_income": 49.3,
      "avg_spending": 81.5
    },
    {
      "cluster_id": 2,
      "name": "Cluster 2: Medium Customers",
      "tag": "Balanced Regulars",
      "count": 23,
      "percentage": 38.3,
      "avg_income": 53.6,
      "avg_spending": 52.3
    },
    {
      "cluster_id": 3,
      "name": "Cluster 3: Low Activity Customers",
      "tag": "Low Activity",
      "count": 15,
      "percentage": 25.0,
      "avg_income": 42.1,
      "avg_spending": 14.8
    }
  ],
  "interpretation_text": "Cluster 1 (High Spenders): 22 customers (36.7%), ...",
  "plot_image_path": "/static/cluster_plot.png",
  "plot_base64": "data:image/png;base64,..."
}
```
