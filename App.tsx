import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Slot } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [loaded] = useFonts({
    'Syne-Bold': require('./assets/fonts/Syne-Bold.ttf'),
    'Syne-ExtraBold': require('./assets/fonts/Syne-ExtraBold.ttf'),
    'DMSans-Regular': require('./assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('./assets/fonts/DMSans-Medium.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <Slot />;
}