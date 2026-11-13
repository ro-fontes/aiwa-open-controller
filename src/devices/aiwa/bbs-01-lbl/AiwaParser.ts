export type AiwaAudioSource = 'Bluetooth' | 'USB' | 'AUX' | 'Unknown';

export interface AiwaDeviceState {
  /** Value returned at byte 0 by AF24/AF28. */
  controlSelection: number;
  /** In the original app, byte 1 === 0 means the lights are on. */
  lightingEnabled: boolean;
  /** Index returned at byte 3. The app offers four modes (0..3). */
  modeIndex: number;
  /** Value returned at byte 5. */
  audioSourceValue: number;
  audioSource: AiwaAudioSource;
  /** Value returned at byte 6, expected to be 0..100. */
  lightingIntensity: number;
  rawBytes: number[];
}

export interface AiwaStatusUpdate {
  controlSelection: number;
  lightingEnabled: boolean;
  rawBytes: number[];
}

function assertByteArray(bytes: number[], minimumLength: number, source: string): void {
  if (bytes.length < minimumLength) {
    const hex = bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
    throw new Error(
      `${source} retornou ${bytes.length} byte(s), mas eram esperados pelo menos ${minimumLength}. Dados: [${hex}]`,
    );
  }
}

function mapAudioSource(value: number): AiwaAudioSource {
  switch (value) {
    case 0:
      return 'Bluetooth';
    case 1:
      return 'USB';
    case 2:
      return 'AUX';
    default:
      return 'Unknown';
  }
}

export function parseAiwaDeviceState(bytes: number[]): AiwaDeviceState {
  assertByteArray(bytes, 7, 'AF24/AF28');

  return {
    controlSelection: bytes[0],
    lightingEnabled: bytes[1] === 0,
    modeIndex: bytes[3],
    audioSourceValue: bytes[5],
    audioSource: mapAudioSource(bytes[5]),
    lightingIntensity: bytes[6],
    rawBytes: [...bytes],
  };
}

export function parseAiwaStatusUpdate(bytes: number[]): AiwaStatusUpdate {
  assertByteArray(bytes, 2, 'AF24/AF27');

  return {
    controlSelection: bytes[0],
    lightingEnabled: bytes[1] === 0,
    rawBytes: [...bytes],
  };
}
