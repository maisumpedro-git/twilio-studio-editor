export {};

declare global {
  interface Window {
    twilioStudio: import("@preload/index").TwilioStudioAPI;
  }
}
