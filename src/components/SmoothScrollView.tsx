import { ScrollView, type ScrollViewProps } from 'react-native';

export function SmoothScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      decelerationRate="normal"
      scrollEventThrottle={16}
      keyboardDismissMode="on-drag"
      nestedScrollEnabled
      showsVerticalScrollIndicator={false}
      {...props}
    />
  );
}
