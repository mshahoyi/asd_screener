import React from 'react';
import { render, screen } from '@testing-library/react-native';
import GameScreen from './game';

describe('GameScreen', () => {
  it('should display the initial difficulty level', () => {
    render(<GameScreen />);
    const difficultyText = screen.getByText(/Difficulty: 1/i);
    expect(difficultyText).toBeTruthy();
  });
});
