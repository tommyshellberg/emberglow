import { type ImageSourcePropType } from 'react-native';

export type Character = {
  id: string;
  type: string;
  title: string;
  description: string;
  image: ImageSourcePropType;
  profileImage: ImageSourcePropType;
};

const CHARACTERS: Character[] = [
  {
    id: 'alchemist',
    type: 'Alchemist',
    title: 'Master of Transformation',
    description: 'Turns idle hours into gold.',
    image: require('@/../assets/images/characters/alchemist-full.jpg'),
    profileImage: require('@/../assets/images/characters/alchemist-profile.jpg'),
  },
  {
    id: 'bard',
    type: 'Bard',
    title: 'Voice of Inspiration',
    description: 'Every quiet moment becomes a song.',
    image: require('@/../assets/images/characters/bard-full.jpg'),
    profileImage: require('@/../assets/images/characters/bard-profile.jpg'),
  },
  {
    id: 'druid',
    type: 'Druid',
    title: 'Guardian of Nature',
    description: 'Draws strength from the world beyond the screen.',
    image: require('@/../assets/images/characters/druid-full.jpg'),
    profileImage: require('@/../assets/images/characters/druid-profile.jpg'),
  },
  {
    id: 'knight',
    type: 'Knight',
    title: 'Paragon of Discipline',
    description: 'Holds the line, one quest at a time.',
    image: require('@/../assets/images/characters/knight-full.jpg'),
    profileImage: require('@/../assets/images/characters/knight-profile.jpg'),
  },
  {
    id: 'scout',
    type: 'Scout',
    title: 'The Lone Explorer',
    description: 'Finds paths where others see none.',
    image: require('@/../assets/images/characters/scout-full.jpg'),
    profileImage: require('@/../assets/images/characters/scout-profile.jpg'),
  },
  {
    id: 'wizard',
    type: 'Wizard',
    title: 'Wielder of Magic',
    description: 'Bends time itself to their will.',
    image: require('@/../assets/images/characters/wizard-full.jpg'),
    profileImage: require('@/../assets/images/characters/wizard-profile.jpg'),
  },
];

export default CHARACTERS;
