import * as React from 'react';
import { StyleSheet } from 'react-native';

import { CARD_HEIGHT } from '@/features/home/constants/home-constants';
import { render, screen, setup } from '@/lib/test-utils';

import QuestCard from './quest-card';

const baseProps = {
  mode: 'story' as const,
  title: "Stone Library & King's Method",
  subtitle: 'Vaedros Kingdom',
  duration: 45,
  xp: 90,
  description:
    'After escaping into the forest, Rowan and I confronted uncomfortable truths.',
  progress: 0.48,
};

describe('QuestCard (home mode card)', () => {
  it('renders the storyline eyebrow, title, meta line, and description', () => {
    render(<QuestCard {...baseProps} />);

    expect(screen.getByText('Vaedros Kingdom')).toBeOnTheScreen();
    expect(screen.getByText("Stone Library & King's Method")).toBeOnTheScreen();
    expect(screen.getByText('45 min · 90 XP')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'After escaping into the forest, Rowan and I confronted uncomfortable truths.'
      )
    ).toBeOnTheScreen();
  });

  it('is a fixed-height card matching the CARD_HEIGHT constant', () => {
    render(<QuestCard {...baseProps} testID="quest-card" />);

    // Height lives on the inner clipped view; the outer testID view is the
    // unclipped shadow wrapper (iOS drops shadows on overflow-hidden views).
    const style = StyleSheet.flatten(
      screen.getByTestId('quest-card-inner').props.style
    );
    expect(style.height).toBe(CARD_HEIGHT);
  });

  it('renders full-opacity art, unlike the shared Emberglow QuestCard which dims to 0.55', () => {
    render(<QuestCard {...baseProps} testID="quest-card" />);

    const image = screen.getByTestId('quest-card-art');
    const style = StyleSheet.flatten(image.props.style);
    expect(style.opacity).toBeUndefined();
  });

  it('renders a "Premium" badge with no emoji when requiresPremium is set', () => {
    render(<QuestCard {...baseProps} requiresPremium />);

    expect(screen.getByText('Premium')).toBeOnTheScreen();
    expect(screen.queryByText('⭐ Premium')).not.toBeOnTheScreen();
  });

  it('does not render a premium badge when requiresPremium is false', () => {
    render(<QuestCard {...baseProps} requiresPremium={false} />);

    expect(screen.queryByText('Premium')).not.toBeOnTheScreen();
  });

  it('shows a restart control for story mode once progress has started, and it fires onRestart', async () => {
    const onRestart = jest.fn();
    const { user } = setup(
      <QuestCard
        {...baseProps}
        progress={0.2}
        onRestart={onRestart}
        testID="quest-card"
      />
    );

    await user.press(screen.getByTestId('quest-card-restart'));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('hides the restart control when progress is 0', () => {
    render(
      <QuestCard
        {...baseProps}
        progress={0}
        onRestart={jest.fn()}
        testID="quest-card"
      />
    );

    expect(screen.queryByTestId('quest-card-restart')).not.toBeOnTheScreen();
  });

  it('hides the restart control for non-story modes even with progress and onRestart', () => {
    render(
      <QuestCard
        {...baseProps}
        mode="custom"
        progress={0.5}
        onRestart={jest.fn()}
        testID="quest-card"
      />
    );

    expect(screen.queryByTestId('quest-card-restart')).not.toBeOnTheScreen();
  });

  it('renders the story progress block with a percent label when showProgress is set', () => {
    render(<QuestCard {...baseProps} progress={0.48} showProgress />);

    expect(screen.getByText('Story progress')).toBeOnTheScreen();
    expect(screen.getByText('48%')).toBeOnTheScreen();
  });

  it('does not render the story progress block when showProgress is false', () => {
    render(<QuestCard {...baseProps} progress={0.48} showProgress={false} />);

    expect(screen.queryByText('Story progress')).not.toBeOnTheScreen();
  });

  it('shows the literal "3 XP/min" for the holdout card instead of a zero-value meta line', () => {
    render(<QuestCard {...baseProps} mode="holdout" duration={0} xp={0} />);

    expect(screen.getByText('3 XP/min')).toBeOnTheScreen();
    expect(screen.queryByText(/0 min/)).not.toBeOnTheScreen();
    expect(screen.queryByText('0 min · 0 XP')).not.toBeOnTheScreen();
  });

  it('still shows the duration/XP meta line for a non-holdout mode', () => {
    render(<QuestCard {...baseProps} mode="custom" duration={5} xp={15} />);

    expect(screen.getByText('5 min · 15 XP')).toBeOnTheScreen();
    expect(screen.queryByText('3 XP/min')).not.toBeOnTheScreen();
  });

  it('shows sentence-case "Quest complete" and the completion message when isCompleted', () => {
    render(<QuestCard {...baseProps} isCompleted progress={1} />);

    expect(screen.getByText('Quest complete')).toBeOnTheScreen();
    expect(screen.queryByText("Stone Library & King's Method")).toBeNull();
    expect(
      screen.getByText(/completed the entire Vaedros storyline/)
    ).toBeOnTheScreen();
  });
});
