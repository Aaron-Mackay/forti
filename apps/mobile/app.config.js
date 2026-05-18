module.exports = ({config}) => {
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? null;

  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl,
    },
    "plugins": [
      "expo-font",
      "expo-image",
      "expo-secure-store",
      "expo-web-browser"
    ]
  };
};
