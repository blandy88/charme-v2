// Smooth scrolling disabled — native browser scroll is faster and more responsive.
// The previous implementation used passive:false wheel/touch listeners that blocked
// the browser's compositor-thread scroll, causing severe jank.
// CSS scroll-behavior: smooth on <html> achieves the same effect without JS overhead.
