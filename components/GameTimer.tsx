import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { interval } from 'rxjs';

export default function GameTimer() {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const sub = interval(1000).subscribe(() => {
      setTime((prev) => prev + 1);
    });

    return () => sub.unsubscribe();
  }, []);

  return <Text style={{ fontSize: 16 }}>{time} seconds</Text>;
}
