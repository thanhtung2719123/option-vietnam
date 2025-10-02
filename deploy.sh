#!/bin/bash

echo "🚀 Deploying Vietnamese Options Risk Management Platform to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy Backend First
echo "📡 Deploying Backend..."
cd backend

# Deploy to Vercel
vercel --prod --confirm

echo "✅ Backend deployed successfully!"

# Deploy Frontend
echo "🌐 Deploying Frontend..."
cd ../frontend

# Deploy to Vercel
vercel --prod --confirm

echo "✅ Frontend deployed successfully!"

echo ""
echo "🎉 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Vercel Dashboard to get your deployment URLs"
echo "2. Update REACT_APP_API_BASE_URL in frontend environment variables"
echo "3. Update CORS settings in backend with your frontend URL"
echo "4. Set up database connection (PostgreSQL recommended)"
echo ""
echo "🔗 Useful Commands:"
echo "   vercel ls                    # List all deployments"
echo "   vercel logs <deployment-url> # View deployment logs"
echo "   vercel env ls               # List environment variables"
echo ""
echo "🌐 Your apps should be available at:"
echo "   Frontend: https://vietnamese-options-frontend-<hash>.vercel.app"
echo "   Backend:  https://vietnamese-options-backend-<hash>.vercel.app" 