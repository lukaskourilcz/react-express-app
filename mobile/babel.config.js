module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Required by react-native-reanimated (used by expo-router). Must be last.
    plugins: ['react-native-reanimated/plugin'],
  };
};
