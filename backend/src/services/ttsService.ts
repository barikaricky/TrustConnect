import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import path from 'path';
import fs from 'fs';

const VOICE_DIR = path.join(__dirname, '..', '..', 'uploads', 'ai-voice');

// Ensure output directory exists
if (!fs.existsSync(VOICE_DIR)) {
  fs.mkdirSync(VOICE_DIR, { recursive: true });
}

// Nigerian English female voice – warm and professional
const VOICE_NAME = 'en-NG-EzinneNeural';

/**
 * Generate a voice note MP3 from text using Microsoft Edge TTS.
 * Completely free — no API key or account needed.
 */
export async function generateVoiceNote(
  text: string
): Promise<{ filePath: string; relativePath: string } | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE_NAME, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const fileName = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
    const { audioFilePath } = await tts.toFile(VOICE_DIR, text, { rate: '-5%' });

    // msedge-tts generates a random filename, rename to ours
    const finalPath = path.join(VOICE_DIR, fileName);
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      fs.renameSync(audioFilePath, finalPath);
    } else {
      return null;
    }

    tts.close();

    const relativePath = `/uploads/ai-voice/${fileName}`;
    return { filePath: finalPath, relativePath };
  } catch (err) {
    console.error('TTS generation failed (non-blocking):', err);
    return null;
  }
}
