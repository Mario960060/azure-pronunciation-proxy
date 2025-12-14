export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const fallbackScores = {
    pronunciation_score: 50,
    accuracy_score: 50,
    fluency_score: 50,
    completeness_score: 50,
    word_scores: []
  };

  try {
    const { audio, transcript, language = 'es-ES', level = 'A2' } = req.body;

    if (!audio || !transcript) {
      console.error('Missing required fields: audio or transcript');
      return res.status(200).json(fallbackScores);
    }

    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION || 'westeurope';

    if (!azureKey) {
      console.error('AZURE_SPEECH_KEY not configured');
      return res.status(200).json(fallbackScores);
    }

    const normalizedTranscript = normalizeTranscript(transcript);
    console.log('Normalized transcript:', normalizedTranscript);

    let audioBuffer;
    try {
      audioBuffer = Buffer.from(audio, 'base64');
    } catch (err) {
      console.error('Failed to decode base64 audio:', err);
      return res.status(200).json(fallbackScores);
    }

    const pronunciationConfig = {
      referenceText: normalizedTranscript,
      gradingSystem: 'HundredMark',
      granularity: 'Word',
      dimension: 'Comprehensive'
    };

    const azureUrl = `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const azureResponse = await fetch(azureUrl, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
          'Accept': 'application/json',
          'Connection': 'keep-alive',
          'Pronunciation-Assessment': JSON.stringify(pronunciationConfig)
        },
        body: audioBuffer,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!azureResponse.ok) {
        const errorText = await azureResponse.text();
        console.error('Azure API error:', azureResponse.status, errorText);
        return res.status(200).json(fallbackScores);
      }

      const azureData = await azureResponse.json();
      console.log('Azure response:', JSON.stringify(azureData, null, 2));

      if (azureData.RecognitionStatus !== 'Success' || !azureData.NBest || azureData.NBest.length === 0) {
        console.error('Azure recognition failed:', azureData.RecognitionStatus);
        return res.status(200).json(fallbackScores);
      }

      const assessment = azureData.NBest[0].PronunciationAssessment;
      const words = azureData.NBest[0].Words || [];

      const result = {
        pronunciation_score: Math.round(assessment.PronScore || 50),
        accuracy_score: Math.round(assessment.AccuracyScore || 50),
        fluency_score: Math.round(assessment.FluencyScore || 50),
        completeness_score: Math.round(assessment.CompletenessScore || 50),
        word_scores: words.map(word => ({
          word: word.Word,
          accuracy_score: Math.round(word.PronunciationAssessment?.AccuracyScore || 50),
          error_type: word.PronunciationAssessment?.ErrorType || 'None'
        }))
      };

      console.log('Returning result:', result);
      return res.status(200).json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('Azure API timeout after 8 seconds');
      } else {
        console.error('Azure API fetch error:', fetchError);
      }

      return res.status(200).json(fallbackScores);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(200).json(fallbackScores);
  }
}

function normalizeTranscript(text) {
  return text
    .toLowerCase()
    .replace(/[¿?¡!.,;:"']/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}
