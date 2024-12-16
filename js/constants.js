const config = {
  dimentions: { width: 600, height: 600 },
  radius: 100,
  completionsToast: null
}

const arcVisible = d => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
const labelVisible = d => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03

const labelTransform = d => {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI
  const y = (d.y0 + d.y1) / 2 * config.radius

  return `rotate(${x - 90}) translate(${y}, 0) rotate(${x < 180 ? 0 : 180})`
}

const califications = value => {
  const dots = {
    1: '●',
    2: '● ●',
    3: '● ● ●',
    4: '● ● ● ●',
    5: '● ● ● ● ●'
  }

  return dots[value] || value
}

export {
  config,
  arcVisible,
  labelVisible,
  labelTransform,
  califications
}
