const BASE_UUID_SUFFIX = '-0000-1000-8000-00805f9b34fb';

export function aiwaUuid(shortUuid: string): string {
  const normalized = shortUuid.replace(/^0x/i, '').toLowerCase().padStart(4, '0');
  return `0000${normalized}${BASE_UUID_SUFFIX}`;
}

export const AIWA_SERVICES = {
  AE0B: aiwaUuid('AE0B'),
  AE30: aiwaUuid('AE30'),
  AE40: aiwaUuid('AE40'),
  AE50: aiwaUuid('AE50'),
  AE58: aiwaUuid('AE58'),
  AF10: aiwaUuid('AF10'),
  AF15: aiwaUuid('AF15'),
  AF20: aiwaUuid('AF20'),
  AF24: aiwaUuid('AF24'),
  AF29: aiwaUuid('AF29'),
} as const;

export const AIWA_CHARACTERISTICS = {
  AF10: {
    MUSIC_SYNC: aiwaUuid('AF11'),
    LIGHT_CHANNEL: aiwaUuid('AF12'),
    UNKNOWN_AF13: aiwaUuid('AF13'),
    INITIALIZE_READ: aiwaUuid('AF14'),
  },
  AF15: {
    CONTROL_SELECTION: aiwaUuid('AF16'),
    MODE_SELECTION: aiwaUuid('AF17'),
    CONTROL_ACTION: aiwaUuid('AF18'),
  },
  AF20: {
    AUDIO_SOURCE: aiwaUuid('AF21'),
    UNKNOWN_AF22: aiwaUuid('AF22'),
  },
  AF24: {
    LIGHT_POWER: aiwaUuid('AF25'),
    LIGHT_INTENSITY: aiwaUuid('AF26'),
    STATUS_NOTIFY: aiwaUuid('AF27'),
    DEVICE_STATE: aiwaUuid('AF28'),
  },
  AF29: {
    UNKNOWN_AF30: aiwaUuid('AF30'),
  },
} as const;

export const AIWA_BBS01LBL_SERVICE_UUIDS = [
  AIWA_SERVICES.AF10,
  AIWA_SERVICES.AF15,
  AIWA_SERVICES.AF20,
  AIWA_SERVICES.AF24,
  AIWA_SERVICES.AF29,
] as const;

export function shortAiwaUuid(uuid: string): string {
  const normalized = uuid.replace(/-/g, '').toLowerCase();
  return normalized.startsWith('0000')
    ? normalized.slice(4, 8)
    : normalized.slice(0, 4);
}
