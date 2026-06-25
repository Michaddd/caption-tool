/**
 * Convert style state to CSS properties for the subtitle overlay div.
 */
export function styleToCSS(style) {
  const {
    fontSize = 24,
    textColor = '#ffffff',
    bgColor = '#000000',
    bgOpacity = 0.5,
    bold = false,
    shadow = true,
    verticalPosition = 80,
  } = style

  const bg = hexToRgba(bgColor, bgOpacity)

  const cssStyle = {
    fontSize: `${fontSize}px`,
    color: textColor,
    backgroundColor: bg,
    fontWeight: bold ? 'bold' : 'normal',
    top: `${verticalPosition}%`,
    transform: 'translateY(-50%)',
  }

  if (shadow) {
    cssStyle.textShadow = '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)'
  } else {
    cssStyle.textShadow = 'none'
  }

  return cssStyle
}

function hexToRgba(hex, opacity) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
