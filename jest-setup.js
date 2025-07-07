import "react-native-gesture-handler/jestSetup";

jest.mock("expo-image", () => {
  const {Text} = require("react-native");

  return {
    Image: ({source, ...props}) => {
      return <Text>{source}</Text>;
    },
  };
});
