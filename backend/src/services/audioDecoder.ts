import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

if (ffmpegStatic) ffmpeg.setFfmpegPath(ffmpegStatic);

const SAMPLE_RATE = 22050;

function parseWAV(buf: Buffer): { samples: Float32Array; sampleRate: number } {
  let offset = 12; // skip RIFF header + WAVE
  let sampleRate = SAMPLE_RATE;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset < buf.length - 8) {
    const id = buf.subarray(offset, offset + 4).toString('ascii');
    const size = buf.readUInt32LE(offset + 4);

    if (id === 'fmt ') {
      sampleRate = buf.readUInt32LE(offset + 12);
      bitsPerSample = buf.readUInt16LE(offset + 22);
    } else if (id === 'data') {
      dataOffset = offset + 8;
      dataSize = size;
      break;
    }

    offset += 8 + (size + (size % 2)); // word-align
  }

  if (dataOffset < 0) throw new Error('No data chunk found in WAV');

  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.min(dataSize / bytesPerSample, (buf.length - dataOffset) / bytesPerSample);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const byteOff = dataOffset + i * bytesPerSample;
    if (bitsPerSample === 16) {
      samples[i] = buf.readInt16LE(byteOff) / 32768;
    } else if (bitsPerSample === 32) {
      samples[i] = buf.readFloatLE(byteOff);
    }
  }

  return { samples, sampleRate };
}

function runFFmpeg(input: string, output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions([`-ar ${SAMPLE_RATE}`, '-ac 1', '-f wav', '-acodec pcm_s16le'])
      .output(output)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

export async function decodeAudio(inputBuf: Buffer): Promise<{ samples: Float32Array; sampleRate: number }> {
  const id = crypto.randomBytes(8).toString('hex');
  const tmpIn = path.join(os.tmpdir(), `maqam-in-${id}`);
  const tmpOut = path.join(os.tmpdir(), `maqam-out-${id}.wav`);

  try {
    await fs.promises.writeFile(tmpIn, inputBuf);
    await runFFmpeg(tmpIn, tmpOut);
    const wavBuf = await fs.promises.readFile(tmpOut);
    return parseWAV(wavBuf);
  } finally {
    await fs.promises.unlink(tmpIn).catch(() => {});
    await fs.promises.unlink(tmpOut).catch(() => {});
  }
}
