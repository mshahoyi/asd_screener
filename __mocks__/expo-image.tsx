import { View } from 'react-native';

// @ts-ignore
export const Image = (props: any) => {
  const { testID, ...rest } = props ?? {};
  return <View testID={testID ?? 'mocked-expo-image'} {...rest} />;
};
