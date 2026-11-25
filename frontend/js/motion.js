// Shared motion flag: true when the visitor asked the system for less motion,
// or the page was opened with ?motion=off (used for still screenshots and reviews).
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=off\b/.test(location.search);
