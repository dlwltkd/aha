declare module "react-native-reanimated";

declare module "react-native-gesture-handler";

declare module "@react-native-community/slider" {
  import { Component } from "react";
  import type { SliderProps } from "react-native";

  export default class Slider extends Component<SliderProps> {}
}
