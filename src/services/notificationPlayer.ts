import * as Notifications from 'expo-notifications';
import { usePlayerStore } from '../store/playerStore';

const NOTIFICATION_CATEGORY = 'now_playing';

export const setupNotificationPlayer = async () => {
  await Notifications.setNotificationCategoryAsync(NOTIFICATION_CATEGORY, [
    {
      identifier: 'prev',
      buttonTitle: '⏮ Previous',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'playpause',
      buttonTitle: '⏯ Play/Pause',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'next',
      buttonTitle: '⏭ Next',
      options: { opensAppToForeground: false },
    },
  ]);

  Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier;
    const store = usePlayerStore.getState();

    if (actionId === 'prev') {
      store.playPrevious();
    } else if (actionId === 'playpause') {
      store.togglePlay();
    } else if (actionId === 'next') {
      store.playNext();
    }
  });
};

export const updateNotificationPlayer = async (track: any, isPlaying: boolean) => {
  if (!track) {
    await Notifications.dismissAllNotificationsAsync();
    return;
  }

  // Note: Background audio and notification controls cannot be fully tested in Expo Go.
  // It requires `npx expo prebuild` + a custom dev client (`npx expo run:android` / `npx expo run:ios`)
  // or an EAS development build.
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: track.title,
      body: `${track.artist} ${isPlaying ? '▶' : '⏸'}`,
      categoryIdentifier: NOTIFICATION_CATEGORY,
      autoDismiss: false,
      sticky: true,
    },
    trigger: null,
  });
};
