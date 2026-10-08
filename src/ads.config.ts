// Ad codes for Can I Trade Now.
// Paste the snippets exactly as Adsterra (or Monetag) gives them.
// An empty string turns that placement off, so the site never shows an empty box.
//
// Adsterra: Websites -> Add website -> Get code
//   - "Banner 728x90"  -> desktop banners
//   - "Banner 320x50"  -> mobile banners
//   - "Social Bar"     -> socialBar (the "auto" format)

const BANNER_728 = `<script>
  atOptions = {
    'key' : '95f3847993b02c888b94165082606adb',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/95f3847993b02c888b94165082606adb/invoke.js"></script>`;

const BANNER_320 = `<script>
  atOptions = {
    'key' : 'f9330b06395e92372b771b82f053fae5',
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script src="https://www.highrevenueformat.com/f9330b06395e92372b771b82f053fae5/invoke.js"></script>`;

export const ADS = {
  /** Banner under the TRADE / WAIT status card */
  top: { desktop: BANNER_728, mobile: BANNER_320 },
  /** Banner above the footer (same codes for now; swap in separate ones to track it on its own) */
  bottom: { desktop: BANNER_728, mobile: BANNER_320 },
  /** Social Bar / floating format. Loaded once, straight into <body>. */
  socialBar: ``,
};

/** Width at or above which the desktop banner is used. */
export const DESKTOP_MIN_WIDTH = 760;
