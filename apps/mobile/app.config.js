const baseConfig = require('./app.json').expo;

module.exports = () => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null;

  return {
    ...baseConfig,
    extra: {
      ...baseConfig.extra,
      apiBaseUrl,
    },
  };
};
