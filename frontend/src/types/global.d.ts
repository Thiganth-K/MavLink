declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}

declare global {
  interface Window {
    showGlobalLoader?: () => void;
    hideGlobalLoader?: () => void;
    hideGlobalLoaderImmediate?: () => void;
  }
}

export {};
