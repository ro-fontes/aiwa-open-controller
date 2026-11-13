import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests the runtime permissions required to scan and connect over BLE.
 * Android 12+ uses BLUETOOTH_SCAN/CONNECT; older Android versions use location
 * permission for BLE scanning.
 */
export async function requestBlePermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const apiLevel = Number(Platform.Version);
  if (apiLevel < 23) {
    return true;
  }

  const permissionNames =
    apiLevel >= 31
      ? [
          'android.permission.BLUETOOTH_SCAN',
          'android.permission.BLUETOOTH_CONNECT',
        ]
      : ['android.permission.ACCESS_FINE_LOCATION'];

  const permissions = permissionNames as Parameters<
    typeof PermissionsAndroid.requestMultiple
  >[0];

  const result = await PermissionsAndroid.requestMultiple(permissions);

  return permissions.every(
    permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}
