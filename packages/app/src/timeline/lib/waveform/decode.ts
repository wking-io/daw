import { Input, ALL_FORMATS, BlobSource, BufferSource, AudioSampleSink } from "mediabunny";

export async function decodeAudio(
  source: string | ArrayBuffer,
): Promise<{ pcm: Float32Array; sampleRate: number; channels: number }> {
  const inputSource =
    source instanceof ArrayBuffer
      ? new BufferSource(source)
      : new BlobSource(await fetch(source).then((r) => r.blob()));

  const input = new Input({
    source: inputSource,
    formats: ALL_FORMATS,
  });

  const audioTrack = await input.getPrimaryAudioTrack();
  if (!audioTrack) throw new Error("No audio track found");

  const { sampleRate, numberOfChannels: channels } = audioTrack;
  const sink = new AudioSampleSink(audioTrack);

  const chunks: Float32Array[] = [];
  let totalFrames = 0;

  for await (const sample of sink.samples()) {
    const buf = sample.toAudioBuffer();
    // Mono-mix: average all channels
    const frames = buf.length;
    const mixed = new Float32Array(frames);
    for (let ch = 0; ch < buf.numberOfChannels; ch++) {
      const channelData = buf.getChannelData(ch);
      for (let i = 0; i < frames; i++) {
        mixed[i]! += channelData[i]!;
      }
    }
    if (buf.numberOfChannels > 1) {
      for (let i = 0; i < frames; i++) {
        mixed[i]! /= buf.numberOfChannels;
      }
    }
    chunks.push(mixed);
    totalFrames += frames;
  }

  const pcm = new Float32Array(totalFrames);
  let offset = 0;
  for (const chunk of chunks) {
    pcm.set(chunk, offset);
    offset += chunk.length;
  }

  return { pcm, sampleRate, channels };
}
