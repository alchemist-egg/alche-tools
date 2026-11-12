export const themeOptions = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' }
] as const

export type ThemePreference = (typeof themeOptions)[number]['value']

const storageKey = 'alche-tools.theme.v1'

export function readTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(storageKey)
    return themeOptions.find(({ value }) => value === stored)?.value ?? 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: ThemePreference): boolean {
  try {
    localStorage.setItem(storageKey, theme)
    return true
  } catch {
    return false
  }
}
