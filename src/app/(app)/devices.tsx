import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { bleManager, type DiscoveredPeripheral } from '@/bluetooth/BleManager';
import { AiwaBbs01Lbl, type AiwaBbs01LblSession } from '@/devices/aiwa/bbs-01-lbl/AiwaBbs01Lbl';
import type { AiwaDeviceState } from '@/devices/aiwa/bbs-01-lbl/AiwaParser';

function getDeviceName(device: DiscoveredPeripheral): string {
  return device.name || device.advertising?.localName || 'Dispositivo sem nome';
}

export default function DevicesScreen() {
  const [devices, setDevices] = useState<DiscoveredPeripheral[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<AiwaDeviceState | null>(null);
  const [status, setStatus] = useState('Toque em “Buscar dispositivos” para começar.');
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<AiwaBbs01LblSession | null>(null);

  const handleDeviceFound = useCallback((device: DiscoveredPeripheral) => {
    setDevices(current => {
      const existingIndex = current.findIndex(item => item.id === device.id);
      if (existingIndex === -1) return [...current, device];

      const updated = [...current];
      updated[existingIndex] = device;
      return updated;
    });
  }, []);

  const handleScan = useCallback(async () => {
    setError(null);
    setDevices([]);
    setIsScanning(true);
    setStatus('Verificando Bluetooth e procurando dispositivos...');

    try {
      const state = await bleManager.initialize();
      if (state !== 'on') {
        throw new Error(`O Bluetooth do celular não está ligado (estado: ${state}).`);
      }

      await bleManager.startScan(
        handleDeviceFound,
        10,
        () => {
          setIsScanning(false);
          setStatus('Busca finalizada.');
        },
      );
      setStatus('Buscando dispositivos Bluetooth LE...');
    } catch (scanError) {
      setIsScanning(false);
      setError(scanError instanceof Error ? scanError.message : String(scanError));
      setStatus('Não foi possível iniciar a busca.');
    }
  }, [handleDeviceFound]);

  const handleConnect = useCallback(async (device: DiscoveredPeripheral) => {
    setError(null);
    setConnectingId(device.id);
    setStatus(`Conectando a ${getDeviceName(device)}...`);

    try {
      await bleManager.stopScan();
      const session = await AiwaBbs01Lbl.connectAndInitialize(device.id, update => {
        setDeviceState(current =>
          current
            ? {
                ...current,
                controlSelection: update.controlSelection,
                lightingEnabled: update.lightingEnabled,
              }
            : current,
        );
      });

      sessionRef.current = session;
      setConnectedId(device.id);
      setDeviceState(session.initialState);
      setStatus('Conectado. Estado inicial lido e notificações ativadas.');
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : String(connectError));
      setStatus('Falha ao conectar ou ler o estado da Boombox.');
    } finally {
      setConnectingId(null);
      setIsScanning(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!connectedId) return;

    try {
      await sessionRef.current?.dispose();
      sessionRef.current = null;
      await bleManager.disconnect(connectedId);
      setConnectedId(null);
      setDeviceState(null);
      setStatus('Desconectado.');
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : String(disconnectError));
    }
  }, [connectedId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.eyebrow}>AIWA OPEN CONTROLLER</Text>
        <Text style={styles.title}>Dispositivos</Text>
        <Text style={styles.subtitle}>
          Ligue a Boombox e deixe o aplicativo oficial fechado antes de conectar por aqui.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={isScanning || connectingId !== null || connectedId !== null}
          onPress={handleScan}
          style={({ pressed }) => [
            styles.primaryButton,
            (pressed || isScanning || connectedId !== null) && styles.buttonMuted,
          ]}
        >
          {isScanning ? <ActivityIndicator color="#fff" /> : null}
          <Text style={styles.primaryButtonText}>
            {isScanning ? 'Buscando...' : 'Buscar dispositivos'}
          </Text>
        </Pressable>

        <Text style={styles.status}>{status}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={devices}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Nenhum dispositivo encontrado ainda. Inicie uma busca para listar os dispositivos próximos.
            </Text>
          }
          renderItem={({ item }) => {
            const isConnected = connectedId === item.id;
            const isConnecting = connectingId === item.id;

            return (
              <View style={styles.deviceCard}>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{getDeviceName(item)}</Text>
                  <Text style={styles.deviceMeta}>ID: {item.id}</Text>
                  <Text style={styles.deviceMeta}>Sinal: {item.rssi ?? '—'} dBm</Text>
                </View>
                <Pressable
                  disabled={isConnecting || (connectedId !== null && !isConnected)}
                  onPress={() => (isConnected ? handleDisconnect() : handleConnect(item))}
                  style={[styles.deviceButton, isConnected && styles.disconnectButton]}
                >
                  <Text style={styles.deviceButtonText}>
                    {isConnecting ? 'Conectando...' : isConnected ? 'Desconectar' : 'Conectar'}
                  </Text>
                </Pressable>
              </View>
            );
          }}
        />

        {deviceState ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Estado recebido da BBS-01-LBL</Text>
            <Text style={styles.stateLine}>Iluminação: {deviceState.lightingEnabled ? 'Ligada' : 'Desligada'}</Text>
            <Text style={styles.stateLine}>Intensidade: {deviceState.lightingIntensity}%</Text>
            <Text style={styles.stateLine}>Fonte: {deviceState.audioSource}</Text>
            <Text style={styles.stateLine}>Índice do modo: {deviceState.modeIndex}</Text>
            <Text style={styles.stateLine}>Seleção de controle: {deviceState.controlSelection}</Text>
            <Text style={styles.rawBytes}>
              AF24/AF28: {deviceState.rawBytes.map(value => value.toString(16).padStart(2, '0')).join(' ')}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0b0d10' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  eyebrow: { color: '#7c8796', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  title: { color: '#f4f6f8', fontSize: 30, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#9ca6b3', fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 20 },
  primaryButton: {
    minHeight: 52,
    backgroundColor: '#1769aa',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  buttonMuted: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  status: { color: '#b8c1cc', fontSize: 13, marginTop: 14 },
  error: { color: '#ff8585', fontSize: 13, marginTop: 8 },
  listContent: { paddingTop: 14, paddingBottom: 14, gap: 10 },
  emptyText: { color: '#727e8c', fontSize: 14, lineHeight: 21, marginTop: 24 },
  deviceCard: {
    backgroundColor: '#171b21',
    borderColor: '#2a313a',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  deviceInfo: { gap: 4 },
  deviceName: { color: '#f4f6f8', fontSize: 16, fontWeight: '700' },
  deviceMeta: { color: '#8893a1', fontSize: 11 },
  deviceButton: { backgroundColor: '#245d89', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  disconnectButton: { backgroundColor: '#873c43' },
  deviceButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stateCard: { backgroundColor: '#171b21', borderColor: '#2a313a', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18, gap: 6 },
  stateTitle: { color: '#f4f6f8', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  stateLine: { color: '#bac3ce', fontSize: 13 },
  rawBytes: { color: '#7c8796', fontSize: 11, marginTop: 6 },
});
