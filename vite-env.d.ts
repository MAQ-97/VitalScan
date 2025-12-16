// Manually declare process.env to support API_KEY usage and fix missing vite/client types.
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};
