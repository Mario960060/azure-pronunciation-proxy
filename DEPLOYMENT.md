# Deployment Guide

## Quick Start

### 1. Initialize as Git Repository

```bash
cd azure-pronunciation-proxy
git init
git add .
git commit -m "Initial commit: Azure pronunciation proxy"
```

### 2. Push to GitHub (Optional)

```bash
# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/azure-pronunciation-proxy.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Vercel

**Option A: Using Vercel Dashboard (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository (or upload folder)
4. Vercel will auto-detect the configuration
5. Add environment variables:
   - `AZURE_SPEECH_KEY`: Your Azure subscription key
   - `AZURE_SPEECH_REGION`: westeurope (or your region)
6. Click "Deploy"
7. Your service will be live at: `https://YOUR_PROJECT.vercel.app`

**Option B: Using Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts, then add environment variables:
vercel env add AZURE_SPEECH_KEY
# Paste your Azure key when prompted
# Select: Production, Preview, Development (all)

vercel env add AZURE_SPEECH_REGION
# Enter: westeurope
# Select: Production, Preview, Development (all)

# Deploy to production
vercel --prod
```

### 4. Test Your Deployment

```bash
curl -X POST https://YOUR_PROJECT.vercel.app/api/pronunciation \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "UklGRiQA...",
    "transcript": "Hola",
    "language": "es-ES",
    "level": "A2"
  }'
```

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Create .env.local
echo "AZURE_SPEECH_KEY=your_key_here" > .env.local
echo "AZURE_SPEECH_REGION=westeurope" >> .env.local

# Start local server
npm run dev
```

The service will be available at: `http://localhost:3000/api/pronunciation`

### Testing Locally

```bash
# Test with curl
curl -X POST http://localhost:3000/api/pronunciation \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

## Getting Azure Speech API Key

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a "Speech Service" resource (or use existing)
3. Go to "Keys and Endpoint"
4. Copy either KEY 1 or KEY 2
5. Note your REGION (e.g., westeurope, eastus)

## Integration with Supabase Edge Function

Once deployed, update your Supabase Edge Function:

```javascript
// In your evaluate-with-audio edge function
const PRONUNCIATION_PROXY_URL = 'https://YOUR_PROJECT.vercel.app/api/pronunciation';

const pronunciationResponse = await fetch(PRONUNCIATION_PROXY_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audio: base64Audio,
    transcript: userTranscript,
    language: languageCode,
    level: userLevel
  })
});

const scores = await pronunciationResponse.json();
```

## Monitoring

### View Logs

**Vercel Dashboard:**
1. Go to your project
2. Click on "Deployments"
3. Select latest deployment
4. View "Functions" logs

**Vercel CLI:**
```bash
vercel logs
```

### Common Issues

**Issue: "AZURE_SPEECH_KEY not configured"**
- Solution: Add environment variable in Vercel Dashboard or CLI

**Issue: "Azure API timeout"**
- Solution: Check your Azure region, try a closer one

**Issue: Always returning fallback scores (50)**
- Solution: Check Vercel logs for specific errors

**Issue: CORS errors**
- Solution: Verify you're using HTTPS, not HTTP

## Cost Estimation

**Azure Speech Service:**
- Standard: $1 per audio hour
- Free tier: 5 audio hours/month

**Vercel:**
- Hobby (Free): 100GB bandwidth/month
- Function execution: 100GB-hours/month
- Most small projects stay within free tier

## Scaling

This microservice is designed to scale automatically with Vercel:
- Auto-scales based on traffic
- No server management needed
- Handles concurrent requests efficiently
- 10-second max function duration

## Security Best Practices

1. **Never commit secrets**: Use environment variables only
2. **Rotate keys regularly**: Update Azure keys periodically
3. **Monitor usage**: Set up Azure alerts for unexpected usage
4. **Restrict CORS**: Optionally limit to specific domains
5. **Use HTTPS**: Always use HTTPS endpoints in production

## Updating the Service

```bash
# Make your changes
git add .
git commit -m "Update: description of changes"
git push

# Vercel will auto-deploy from Git
# Or manually deploy:
vercel --prod
```

## Backup & Disaster Recovery

- Code is version controlled in Git
- Environment variables backed up in Vercel
- No state stored (stateless service)
- Can redeploy instantly from Git repository

## Support

For issues:
1. Check Vercel function logs
2. Verify Azure Speech Service status
3. Test with curl to isolate issues
4. Check Azure quota limits

## Multi-Region Deployment

Deploy to multiple regions for better latency:

```bash
# Deploy with different Azure regions
vercel --prod --env AZURE_SPEECH_REGION=eastus
vercel --prod --env AZURE_SPEECH_REGION=westeurope
```

Use a load balancer or geo-routing to direct users to nearest deployment.
