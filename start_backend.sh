#!/bin/bash

echo "Starting TaskFlow Backend..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Initialize database
echo "Initializing database..."
python database.py

# Start the FastAPI server
echo "Starting FastAPI server on http://localhost:8000"
uvicorn main:app --reload --port 8000
