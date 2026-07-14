import * as React from 'react';

import { render, screen, setup } from '@/lib/test-utils';

import { QuestDeck, type QuestDeckItem } from './quest-deck';

const data: QuestDeckItem[] = [
  {
    id: 'story',
    mode: 'story',
    title: "Stone Library & King's Method",
    subtitle: 'Vaedros Kingdom',
    duration: 45,
    xp: 90,
    description: 'Rowan and I confronted uncomfortable truths.',
    progress: 0.48,
    showProgress: true,
  },
  {
    id: 'custom',
    mode: 'custom',
    title: 'Start Custom Quest',
    subtitle: 'Free Play Mode',
    duration: 5,
    xp: 15,
    description: 'An adventure of your own design.',
    progress: 0,
  },
  {
    id: 'cooperative',
    mode: 'cooperative',
    title: 'Cooperative Quest',
    subtitle: 'Team Challenge',
    duration: 5,
    xp: 15,
    description: 'Invite a friend to stay off your phone together.',
    progress: 0,
  },
];

describe('QuestDeck', () => {
  it('renders all three cards, with the active one showing its full content and the others showing a strip label', () => {
    render(<QuestDeck data={data} activeIndex={0} onAdvance={jest.fn()} />);

    // Front card (story, order 0) — full content visible.
    expect(screen.getByText("Stone Library & King's Method")).toBeOnTheScreen();
    expect(
      screen.getByText('Rowan and I confronted uncomfortable truths.')
    ).toBeOnTheScreen();

    // Back cards (custom order 1, cooperative order 2) — strip labels visible.
    expect(screen.getByText('Custom')).toBeOnTheScreen();
    expect(screen.getByText('Co-op')).toBeOnTheScreen();
  });

  it('exposes back cards as accessible buttons that advance the deck', async () => {
    const onAdvance = jest.fn();
    const { user } = setup(
      <QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />
    );

    await user.press(screen.getByRole('button', { name: 'Show Custom card' }));

    expect(onAdvance).toHaveBeenCalledWith(1);
  });

  it('advances by 1 regardless of which back card is tapped', async () => {
    const onAdvance = jest.fn();
    const { user } = setup(
      <QuestDeck data={data} activeIndex={0} onAdvance={onAdvance} />
    );

    await user.press(screen.getByRole('button', { name: 'Show Co-op card' }));

    expect(onAdvance).toHaveBeenCalledWith(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('does not expose the front card as a "Show X card" button', () => {
    render(<QuestDeck data={data} activeIndex={0} onAdvance={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Show Story card' })
    ).not.toBeOnTheScreen();
  });
});
