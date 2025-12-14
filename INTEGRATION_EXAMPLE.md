# Integration Example

## Update Your Supabase Edge Function

Once you've deployed the Azure pronunciation proxy to Vercel, update your `evaluate-with-audio` edge function:

### Before (Direct Azure call - doesn't work in Deno)

```typescript
// ❌ This doesn't work due to Deno TLS issues
const azureResponse = await fetch(azureUrl, {
  method: 'POST',
  headers: {
    'Ocp-Apim-Subscription-Key': azureKey,
    'Content-Type': 'audio/wav',
    'Pronunciation-Assessment': JSON.stringify(config)
  },
  body: audioBuffer
});
```

### After (Using proxy - works perfectly)

```typescript
// ✅ This works! Proxy handles Azure communication
const PRONUNCIATION_PROXY_URL = 'https://your-project.vercel.app/api/pronunciation';

const pronunciationResponse = await fetch(PRONUNCIATION_PROXY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    audio: base64AudioString,
    transcript: userTranscript,
    language: languageCode, // e.g., 'es-ES'
    level: userLevel // e.g., 'A2'
  })
});

const scores = await pronunciationResponse.json();

// Use the scores
console.log('Pronunciation score:', scores.pronunciation_score);
console.log('Accuracy score:', scores.accuracy_score);
console.log('Fluency score:', scores.fluency_score);
console.log('Completeness score:', scores.completeness_score);

// Word-level details
scores.word_scores.forEach(word => {
  console.log(`Word: ${word.word}, Accuracy: ${word.accuracy_score}, Error: ${word.error_type}`);
});
```

## Complete Edge Function Example

```typescript
// supabase/functions/evaluate-with-audio/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRONUNCIATION_PROXY_URL = 'https://your-project.vercel.app/api/pronunciation';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { conversationId, audioBase64, userTranscript, language, level } = await req.json();

    // Get pronunciation assessment via proxy
    const pronunciationResponse = await fetch(PRONUNCIATION_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio: audioBase64,
        transcript: userTranscript,
        language: language || 'es-ES',
        level: level || 'A2'
      })
    });

    if (!pronunciationResponse.ok) {
      throw new Error('Pronunciation assessment failed');
    }

    const pronunciationScores = await pronunciationResponse.json();

    // Continue with your evaluation logic
    const evaluation = {
      conversation_id: conversationId,
      pronunciation_score: pronunciationScores.pronunciation_score,
      accuracy_score: pronunciationScores.accuracy_score,
      fluency_score: pronunciationScores.fluency_score,
      completeness_score: pronunciationScores.completeness_score,
      word_details: pronunciationScores.word_scores,
      overall_score: Math.round(
        (pronunciationScores.pronunciation_score +
         pronunciationScores.accuracy_score +
         pronunciationScores.fluency_score +
         pronunciationScores.completeness_score) / 4
      )
    };

    return new Response(
      JSON.stringify(evaluation),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
```

## Frontend Integration

No changes needed in your frontend! Your existing code continues to work:

```typescript
// Your existing frontend code remains the same
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-with-audio`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversationId,
      audioBase64,
      userTranscript,
      language: 'es-ES',
      level: 'A2'
    })
  }
);

const evaluation = await response.json();
```

## Testing the Integration

### 1. Test the Proxy Directly

```bash
curl -X POST https://your-project.vercel.app/api/pronunciation \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "UklGRiQA...",
    "transcript": "Hola",
    "language": "es-ES",
    "level": "A2"
  }'
```

Expected response:
```json
{
  "pronunciation_score": 87,
  "accuracy_score": 92,
  "fluency_score": 78,
  "completeness_score": 95,
  "word_scores": [...]
}
```

### 2. Test the Edge Function

```bash
curl -X POST ${SUPABASE_URL}/functions/v1/evaluate-with-audio \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-123",
    "audioBase64": "UklGRiQA...",
    "userTranscript": "Hola",
    "language": "es-ES",
    "level": "A2"
  }'
```

### 3. Test from Frontend

```typescript
// In your React component
const testPronunciation = async () => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-with-audio`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: 'test-123',
        audioBase64: 'UklGRiQA...',
        userTranscript: 'Hola',
        language: 'es-ES',
        level: 'A2'
      })
    }
  );

  const result = await response.json();
  console.log('Evaluation:', result);
};
```

## Environment Variables Checklist

### Vercel (Pronunciation Proxy)
- ✅ `AZURE_SPEECH_KEY`: Your Azure subscription key
- ✅ `AZURE_SPEECH_REGION`: westeurope (or your region)

### Supabase (Edge Function)
- ✅ No additional secrets needed!
- ✅ Just update the `PRONUNCIATION_PROXY_URL` in your code

### Frontend
- ✅ `VITE_SUPABASE_URL`: Already configured
- ✅ `VITE_SUPABASE_ANON_KEY`: Already configured

## Troubleshooting

### Issue: "Failed to fetch pronunciation scores"

**Check:**
1. Is the proxy URL correct in your edge function?
2. Is the proxy deployed and accessible?
3. Are Azure credentials set in Vercel?

**Test:**
```bash
curl https://your-project.vercel.app/api/pronunciation
```

### Issue: "CORS error"

**Check:**
1. Make sure you're using HTTPS (not HTTP)
2. Verify CORS headers are set in proxy response

### Issue: "Always getting score of 50"

**This means the proxy is returning fallback scores. Check:**
1. Vercel function logs for errors
2. Azure Speech Service status
3. Audio format (must be WAV, 16kHz, mono, PCM)

## Benefits of This Architecture

✅ **Solves Deno TLS Issues**: Node.js proxy handles Azure communication
✅ **Secure**: Azure keys stored only in Vercel, not in Supabase
✅ **Scalable**: Proxy auto-scales independently
✅ **Reusable**: Use the same proxy across multiple projects
✅ **Cost-Effective**: Vercel free tier suitable for most usage
✅ **Easy to Update**: Deploy proxy changes without touching main app
✅ **Better Error Handling**: Proxy provides consistent fallback behavior

## Next Steps

1. Deploy the proxy to Vercel
2. Update your edge function with the proxy URL
3. Test the integration end-to-end
4. Monitor logs for any issues
5. Enjoy pronunciation assessment! 🎉
