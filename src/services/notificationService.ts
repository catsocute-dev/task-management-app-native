import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

// Configure how foreground notifications are presented
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register the device for push notifications and retrieve ExpoPushToken.
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications.');
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    token = pushTokenData.data;
  } catch (error) {
    console.warn('Could not register for push notifications (likely running in unsupported environment):', error);
  }

  return token;
};

/**
 * Save user push token to Firestore users collection.
 */
export const saveUserPushToken = async (userId: string, token: string): Promise<void> => {
  if (!isFirebaseConfigured() || !db || !token) return;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { pushToken: token });
  } catch (error) {
    console.warn('Failed to save push token to user profile:', error);
  }
};

/**
 * Send an immediate local notification (works reliably on physical devices and emulators).
 */
export const sendLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('Failed to schedule local notification:', error);
  }
};

/**
 * Send remote push notification via Expo Push Notification Service.
 */
export const sendPushNotification = async (
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> => {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    return false;
  }

  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const resJson = await response.json();
    return resJson?.data?.status === 'ok';
  } catch (error) {
    console.warn('Error sending push notification via Expo server:', error);
    return false;
  }
};
