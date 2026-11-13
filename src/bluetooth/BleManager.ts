import BleManager from 'react-native-ble-manager';
import { requestBlePermissions } from './BlePermissions';

export interface DiscoveredPeripheral {
  id: string;
  name?: string | null;
  rssi?: number;
  advertising?: {
    localName?: string;
    serviceUUIDs?: string[];
    [key: string]: unknown;
  };
}

export interface CharacteristicValueEvent {
  peripheral: string;
  service: string;
  characteristic: string;
  value: number[];
}

export type BleAdapterState =
  | 'unknown'
  | 'resetting'
  | 'unsupported'
  | 'unauthorized'
  | 'on'
  | 'off'
  | 'turning_on'
  | 'turning_off';

class BleManagerService {
  private initialized = false;
  private discoverSubscription?: { remove: () => void };
  private stopScanSubscription?: { remove: () => void };
  private onScanFinished?: () => void;

  async initialize(): Promise<BleAdapterState> {
    const granted = await requestBlePermissions();

    if (!granted) {
      throw new Error(
        'As permissões de Bluetooth foram negadas. Autorize o acesso para procurar a Boombox.',
      );
    }

    // start() is idempotent in react-native-ble-manager.
    await BleManager.start({ showAlert: false });
    this.initialized = true;

    return (await BleManager.checkState()) as BleAdapterState;
  }

  async startScan(
    onDeviceFound: (device: DiscoveredPeripheral) => void,
    seconds = 10,
    onFinished?: () => void,
  ): Promise<void> {
    if (!this.initialized) {
      const state = await this.initialize();
      if (state !== 'on') {
        throw new Error(`Bluetooth não está ligado (estado: ${state}).`);
      }
    } else {
      const state = (await BleManager.checkState()) as BleAdapterState;
      if (state !== 'on') {
        throw new Error(`Bluetooth não está ligado (estado: ${state}).`);
      }
    }

    await this.stopScan();
    this.onScanFinished = onFinished;

    this.discoverSubscription = BleManager.onDiscoverPeripheral(peripheral => {
      onDeviceFound(peripheral as DiscoveredPeripheral);
    });

    this.stopScanSubscription = BleManager.onStopScan(() => {
      this.finishScan();
    });

    try {
      // Do not filter by service UUID: some devices do not advertise their
      // proprietary GATT services even though they expose them after connect.
      await BleManager.scan({
        serviceUUIDs: [],
        seconds,
        allowDuplicates: false,
      });
    } catch (error) {
      this.finishScan();
      throw error;
    }
  }

  async stopScan(): Promise<void> {
    try {
      const scanning = await BleManager.isScanning();
      if (scanning) {
        await BleManager.stopScan();
      }
    } finally {
      this.finishScan();
    }
  }

  async connectAndDiscover(peripheralId: string): Promise<unknown> {
    await this.stopScan();
    await BleManager.connect(peripheralId);
    return BleManager.retrieveServices(peripheralId);
  }

  disconnect(peripheralId: string): Promise<void> {
    return BleManager.disconnect(peripheralId);
  }

  read(
    peripheralId: string,
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<number[]> {
    return BleManager.read(peripheralId, serviceUUID, characteristicUUID);
  }

  startNotification(
    peripheralId: string,
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<void> {
    return BleManager.startNotification(
      peripheralId,
      serviceUUID,
      characteristicUUID,
    );
  }

  stopNotification(
    peripheralId: string,
    serviceUUID: string,
    characteristicUUID: string,
  ): Promise<void> {
    return BleManager.stopNotification(
      peripheralId,
      serviceUUID,
      characteristicUUID,
    );
  }

  onCharacteristicValueChanged(
    listener: (event: CharacteristicValueEvent) => void,
  ): { remove: () => void } {
    return BleManager.onDidUpdateValueForCharacteristic(listener);
  }

  private finishScan(): void {
    this.discoverSubscription?.remove();
    this.stopScanSubscription?.remove();
    this.discoverSubscription = undefined;
    this.stopScanSubscription = undefined;

    const callback = this.onScanFinished;
    this.onScanFinished = undefined;
    callback?.();
  }
}

export const bleManager = new BleManagerService();
