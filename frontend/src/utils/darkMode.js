/**
 * Apply or remove the global dark theme based on the user's dark_mode flag.
 * Pass a user object, or omit to read the stored user from localStorage.
 */
export const applyDarkMode = (user) => {
  try {
    const stored = user !== undefined
      ? user
      : JSON.parse(localStorage.getItem('user') || 'null');
    const enabled = !!stored && Number(stored.dark_mode) === 1;
    document.documentElement.classList.toggle('dark', enabled);
  } catch {
    document.documentElement.classList.remove('dark');
  }
};

export const isDarkMode = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
