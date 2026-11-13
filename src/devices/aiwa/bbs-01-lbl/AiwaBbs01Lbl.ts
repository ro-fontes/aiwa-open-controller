import { bleManager } from '@/bluetooth/BleManager';
import {
  AIWA_CHARACTERISTICS,
  AIWA_SERVICES,
  shortAiwaUuid,
} from './AiwaUUIDs';
import {
  parseAiwaDeviceState,
  parseAiwaStatusUpdate,
  type AiwaDeviceState,
} from './AiwaParser';

const wait = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

export interface AiwaBbs01LblSession {
  initialState: AiwaDeviceState;
  initializeReadResponse: number[];
  dispose: () => Promise<void>;
}

/** Implements only the verified, read/notification part of the BBS-01-LBL protocol. */
export const AiwaBbs01Lbl = {
  async connectAndInitialize(
    peripheralId: string,
    onStatusUpdate: (update: ReturnType<typeof parseAiwaStatusUpdate>) => void,
  ): Promise<AiwaBbs01LblSession> {
    await bleManager.connectAndDiscover(peripheralId);

    let notificationSubscription: { remove: () => void } | undefined;
    let notificationStarted = false;

    try {
      // The original app waits ~500ms after opening the device component,
      // then reads AF10/AF14 to begin its state initialization sequence.
      await wait(500);

      const initializeReadResponse = await bleManager.read(
        peripheralId,
        AIWA_SERVICES.AF10,
        AIWA_CHARACTERISTICS.AF10.INITIALIZE_READ,
      );

      // The official BBS-01-LBL component then reads the 7-byte state at AF24/AF28.
      const stateBytes = await bleManager.read(
        peripheralId,
        AIWA_SERVICES.AF24,
        AIWA_CHARACTERISTICS.AF24.DEVICE_STATE,
      );
      const initialState = parseAiwaDeviceState(stateBytes);

      // Subscribe before enabling notifications so no first update is missed.
      notificationSubscription = bleManager.onCharacteristicValueChanged(event => {
        if (event.peripheral !== peripheralId) return;
        if (shortAiwaUuid(event.service) !== 'af24') return;
        if (shortAiwaUuid(event.characteristic) !== 'af27') return;

        try {
          onStatusUpdate(parseAiwaStatusUpdate(event.value));
        } catch (error) {
          console.warn('[AIWA] Notificação de estado inválida:', error);
        }
      });

      await bleManager.startNotification(
        peripheralId,
        AIWA_SERVICES.AF24,
        AIWA_CHARACTERISTICS.AF24.STATUS_NOTIFY,
      );
      notificationStarted = true;

      return {
        initialState,
        initializeReadResponse,
        dispose: async () => {
          notificationSubscription?.remove();
          if (notificationStarted) {
            await bleManager.stopNotification(
              peripheralId,
              AIWA_SERVICES.AF24,
              AIWA_CHARACTERISTICS.AF24.STATUS_NOTIFY,
            );
          }
        },
      };
    } catch (error) {
      notificationSubscription?.remove();
      throw error;
    }
  },
};
