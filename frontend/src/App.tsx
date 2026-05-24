import { useStore } from './store/useStore';
import { SurahBrowser } from './components/SurahBrowser';
import { VersePicker } from './components/VersePicker';
import { PracticeScreen } from './components/PracticeScreen';

export default function App() {
  const screen = useStore((s) => s.screen);

  return (
    <>
      {screen === 'browser' && <SurahBrowser />}
      {screen === 'verses' && <VersePicker />}
      {screen === 'practice' && <PracticeScreen />}
    </>
  );
}
