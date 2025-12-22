/**
 * Voice Transcription API Route - OpenAI Whisper
 * POST /api/transcribe
 *
 * Accepts audio files and returns transcribed text
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createTracer } from '@/lib/tracing/chat-tracer';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Supported audio formats
const SUPPORTED_FORMATS = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/flac',
  'audio/m4a',
];

// Max file size (25MB - Whisper limit)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const sessionId = formData.get('sessionId') as string | null;
    const language = formData.get('language') as string || 'he'; // Default to Hebrew

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!SUPPORTED_FORMATS.includes(audioFile.type) && !audioFile.name.match(/\.(webm|mp4|mp3|wav|ogg|flac|m4a)$/i)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${audioFile.type}. Supported: webm, mp4, mp3, wav, ogg, flac, m4a` },
        { status: 400 }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 25MB, got ${Math.round(audioFile.size / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    // Initialize tracer if session provided
    const tracer = sessionId ? createTracer(sessionId) : null;

    console.log('🎤 Transcribing audio:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
      language,
    });

    // Convert File to the format OpenAI expects
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a File-like object for OpenAI
    const file = new File([buffer], audioFile.name || 'audio.webm', {
      type: audioFile.type || 'audio/webm',
    });

    // Call Whisper API with prompt for better Hebrew recognition
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language, // Hebrew
      response_format: 'verbose_json', // Get detailed response with confidence
      prompt: language === 'he'
        ? 'שומת מקרקעין, נדל"ן, דירה, בית, שכונה, עיר, רחוב, גוש, חלקה, טאבו, שמאי, מחיר, שווי, מטר רבוע'
        : undefined, // Provide context words for better recognition
    });

    const latencyMs = Date.now() - startTime;

    console.log('✅ Transcription complete:', {
      text: transcription.text.substring(0, 100) + '...',
      duration: transcription.duration,
      language: transcription.language,
      latencyMs,
    });

    // Log to tracer
    if (tracer) {
      tracer.logVoiceTranscription(
        audioFile.name,
        transcription.text,
        latencyMs
      );
    }

    return NextResponse.json({
      success: true,
      text: transcription.text,
      language: transcription.language,
      duration: transcription.duration,
      segments: transcription.segments?.map(seg => ({
        text: seg.text,
        start: seg.start,
        end: seg.end,
      })),
      latencyMs,
    });
  } catch (error) {
    console.error('❌ Transcription error:', error);

    // Check for specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check if transcription is available
export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    available: hasApiKey,
    model: 'whisper-1',
    supportedFormats: SUPPORTED_FORMATS,
    maxFileSize: MAX_FILE_SIZE,
    supportedLanguages: ['he', 'en', 'ar'], // Hebrew, English, Arabic
  });
}
