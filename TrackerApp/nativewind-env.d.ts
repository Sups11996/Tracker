/// <reference types="nativewind/types" />

// Allow CSS side-effect imports (processed by Metro / NativeWind, not tsc)
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
