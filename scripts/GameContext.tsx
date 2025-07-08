import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMachine } from '@xstate/react';
import { gameMachine } from '@/scripts/gameState';
import { ActorRefFrom, StateFrom } from 'xstate';

type GameContextType = ReturnType<typeof useMachine<typeof gameMachine>>;

const GameContext = createContext<GameContextType | undefined>(undefined);

// @ts-ignore
export const GameProvider: React.FC<{
  children: React.ReactNode;
  machine?: any;
}> = ({ children, machine }) => {
  const data = machine && typeof machine.getSnapshot === 'function' ? useActorState(machine) : useMachine(machine || gameMachine);

  return <GameContext.Provider value={data as GameContextType}>{children}</GameContext.Provider>;
};

// Custom hook to handle actor state subscription
function useActorState(actor: any) {
  const [state, setState] = useState(actor.getSnapshot());

  useEffect(() => {
    const subscription = actor.subscribe((newState: any) => {
      setState(newState);
    });

    return () => subscription.unsubscribe();
  }, [actor]);

  return [state, actor.send, actor];
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
