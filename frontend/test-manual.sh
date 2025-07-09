#!/bin/bash

echo "🔧 Setting up environment variables..."
export GOOGLE_CLOUD_PROJECT=ai-square-463013
export GCS_BUCKET_NAME=ai-square-db-v2
export GOOGLE_APPLICATION_CREDENTIALS=/Users/young/project/ai-square/ai-square-key.json

echo "✅ Environment variables set:"
echo "   GOOGLE_CLOUD_PROJECT: $GOOGLE_CLOUD_PROJECT"
echo "   GCS_BUCKET_NAME: $GCS_BUCKET_NAME"
echo "   GOOGLE_APPLICATION_CREDENTIALS: $GOOGLE_APPLICATION_CREDENTIALS"
echo ""

echo "📂 Current directory: $(pwd)"
echo ""

echo "Choose an action:"
echo "1) Start development server"
echo "2) Run E2E tests for all modes"
echo "3) Verify GCS data"
echo "4) Check GCS bucket contents"
echo "5) Run a specific test"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🚀 Starting development server..."
        npm run dev
        ;;
    2)
        echo "🧪 Running E2E tests for all modes..."
        npm run test:all-modes
        ;;
    3)
        echo "📊 Verifying GCS data..."
        npm run verify:gcs
        ;;
    4)
        echo "📁 Checking GCS bucket contents..."
        gsutil ls -r gs://ai-square-db-v2/v2/ | head -30
        echo ""
        echo "Total files:"
        gsutil ls -r gs://ai-square-db-v2/v2/ | grep -c ".json"
        ;;
    5)
        echo "🎯 Available test options:"
        echo "a) Test PBL mode only"
        echo "b) Test Discovery mode only"
        echo "c) Test Assessment mode only"
        read -p "Enter your choice (a-c): " test_choice
        
        case $test_choice in
            a)
                echo "Testing PBL mode..."
                # You can add specific PBL test here
                ;;
            b)
                echo "Testing Discovery mode..."
                # You can add specific Discovery test here
                ;;
            c)
                echo "Testing Assessment mode..."
                # You can add specific Assessment test here
                ;;
        esac
        ;;
esac