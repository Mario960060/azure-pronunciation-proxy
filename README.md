# Azure Pronunciation Assessment Proxy

Standalone microservice that proxies pronunciation assessment requests to Azure Speech API, solving Deno TLS compatibility issues.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` for local testing:
```bash
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=westeurope
```

3. Test locally:
```bash
vercel dev
```

## Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables (in Vercel Dashboard or CLI):
```bash
vercel env add AZURE_SPEECH_KEY
vercel env add AZURE_SPEECH_REGION
```

## Usage

POST to: `https://your-app.vercel.app/api/pronunciation`

Request body:
```json
{
  "audio": "UklGRiQjAgBXQVZF...",
  "transcript": "Hola, ¿cómo estás?",
  "language": "es-ES",
  "level": "A2"
}
```

Response:
```json
{
  "pronunciation_score": 87,
  "accuracy_score": 92,
  "fluency_score": 78,
  "completeness_score": 95,
  "word_scores": [
    {
      "word": "hola",
      "accuracy_score": 95,
      "error_type": "None"
    },
    {
      "word": "cómo",
      "accuracy_score": 88,
      "error_type": "None"
    },
    {
      "word": "estás",
      "accuracy_score": 92,
      "error_type": "None"
    }
  ]
}
```

## Testing

```bash
curl -X POST http://localhost:3000/api/pronunciation \
  -H "Content-Type: application/json" \
  -d @test-request.json
```

### Test Request Example

Create `test-request.json`:
```json
{
  "audio": "UklGRiQjAgBXQVZF...",
  "transcript": "Hola, ¿cómo estás?",
  "language": "es-ES",
  "level": "A2"
}
```

## Integration

Use this URL in your Supabase Edge Function:

```javascript
const response = await fetch('https://your-app.vercel.app/api/pronunciation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    audio: base64Audio,
    transcript: expectedText,
    language: 'es-ES',
    level: 'A2'
  })
});

const result = await response.json();
console.log('Pronunciation scores:', result);
```

## Features

- **CORS Enabled**: Works from any origin
- **Timeout Protection**: 8-second timeout on Azure calls
- **Fallback Scores**: Returns 50 for all metrics if Azure fails
- **Error Resilient**: Never crashes, always returns 200 status
- **Transcript Normalization**: Automatically cleans punctuation and formatting
- **Word-Level Analysis**: Detailed per-word accuracy and error types

## Supported Languages

- Spanish: `es-ES`
- English (US): `en-US`
- French: `fr-FR`
- German: `de-DE`
- Italian: `it-IT`
- Portuguese: `pt-BR`
- And more (check Azure Speech Service documentation)

## Error Handling

The service is designed to never fail completely:

1. If Azure API is unreachable → Returns fallback scores (50)
2. If audio is malformed → Returns fallback scores
3. If transcript is missing → Returns fallback scores
4. If timeout occurs (>8s) → Returns fallback scores
5. All errors are logged but don't crash the service

## Environment Variables

- `AZURE_SPEECH_KEY` (required): Your Azure Speech Service subscription key
- `AZURE_SPEECH_REGION` (optional): Azure region (default: westeurope)

## Architecture

This is a standalone microservice that can be:
- Deployed independently from your main application
- Reused across multiple projects
- Scaled independently
- Updated without affecting main app

## Security

- No secrets are stored in code
- Environment variables are used for all sensitive data
- CORS is enabled but can be restricted if needed
- All errors are logged but sensitive data is never exposed

## Cost Optimization

- Uses Azure Speech Service (pay per use)
- Timeout protection prevents long-running requests
- Caches nothing (stateless service)
- Vercel free tier compatible

## Troubleshooting

### "AZURE_SPEECH_KEY not configured"
Set the environment variable in Vercel Dashboard or `.env.local`

### "Azure API timeout"
The request took longer than 8 seconds. Check your network or Azure region.

### Always getting fallback scores (50)
Check logs in Vercel Dashboard to see specific error messages.

### CORS errors
Make sure the service URL is correct and HTTPS is being used.

## License

MIT
