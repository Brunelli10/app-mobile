import '@testing-library/jest-native/extend-expect';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => {
  let store = {};
  return {
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => {
      return Promise.resolve(store[key] || null);
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
  };
});

// Mock react-navigation hooks
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      addListener: jest.fn(() => jest.fn()),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    hostUri: 'localhost:3000',
  },
}));

// Silence React Native warn/error logs that are not relevant to test outcome
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    args[0] && 
    (args[0].includes('Sending `onAnimatedValueUpdate` with no listeners registered') ||
     args[0].includes('Constants.manifest') ||
     args[0].includes('componentWillReceiveProps'))
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
