#!/bin/bash

echo "Starting TaskFlow Frontend..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Start the React development server
echo "Starting React development server on http://localhost:5173"
npm run dev
