import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '../api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  let token: string | null = null;

  try {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Push notification permissions denied');
        return null;
      }

      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = typeof deviceToken.data === 'string' ? deviceToken.data : JSON.stringify(deviceToken.data);
      } catch (e) {
        try {
          const expoToken = await Notifications.getExpoPushTokenAsync();
          token = expoToken.data;
        } catch (err) {
          console.error('Error fetching push token', err);
        }
      }

      if (token) {
        try {
          await api.users.saveFcmToken(token);
          console.log('FCM token saved to backend successfully');
        } catch (err) {
          console.error('Failed to save FCM token to backend:', err);
        }
      }
    } else {
      console.log('Push notifications require a physical device');
    }
  } catch (error) {
    console.error('Error registering for push notifications:', error);
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#208AEF',
    });
  }

  return token;
}
