import * as d3 from 'd3'

const dimentions = { width: 600, height: 600 }

const radius = dimentions.width / 6

const arcVisible = d => { return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0 }
const labelVisible = d => { return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03 }

const labelTransform = d => {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI
  const y = (d.y0 + d.y1) / 2 * radius

  return `rotate(${x - 90}) translate(${y}, 0) rotate(${x < 180 ? 0 : 180})`
}

d3.json('/data/taiwan-tea.json').then(data => {
  const hierarchy = d3.hierarchy(data)
    .sum(d => d.value || d.children ? 0 : 1)

  const partition = d3.partition()
    .size([2 * Math.PI, hierarchy.height + 1])(hierarchy)

  partition.each(d => {
    const updateNode = { ...d, current: d }
    Object.assign(d, updateNode)
  })

  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1))

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', [
      -dimentions.width / 2,
      -dimentions.height / 2,
      dimentions.width,
      dimentions.height
    ])
    .style('font', '14px sans-serif')

  const g = svg.append('g')

  const path = g.append('g')
    .selectAll('path')
    .data(partition.descendants().slice(1))
    .join('path')
    .attr('fill', d => d.data.color)
    .attr('fill-opacity', d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
    .attr('pointer-events', d => arcVisible(d.current) ? 'auto' : 'none')
    .attr('d', d => arc(d.current))

  path.filter(d => d.children)
    .style('cursor', 'pointer')
    .on('click', clicked)

  path.append('title')
    .text(d => `${d.ancestors().map(d => d.data.description)}`)

  const label = g.append('g')
    .attr('pointer-events', 'none')
    .attr('text-anchor', 'middle')
    .style('user-select', 'none')
    .selectAll('text')
    .data(partition.descendants().slice(1))
    .join('text')
    .attr('dy', '0.35em')
    .attr('fill-opacity', d => +labelVisible(d.current))
    .attr('transform', d => labelTransform(d.current))
    .text(d => d.data.name)

  const parent = svg.append('circle')
    .datum(partition)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('click', clicked)

  function clicked (event, p) {
    parent.datum(p.parent || partition)

    partition.each(d => {
      d.target = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      }
    })

    const t = g.transition().duration(550)

    path.transition(t)
      .tween('data', d => {
        const i = d3.interpolate(d.current, d.target)
        return t => { d.current = i(t) }
      })
      .filter(function (d) {
        return +this.getAttribute('fill-opacity') || arcVisible(d.target)
      })
      .attr('fill-opacity', d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
      .attr('pointer-events', d => arcVisible(d.target) ? 'auto' : 'none')
      .attrTween('d', d => () => arc(d.current))

    label.filter(function (d) {
      return +this.getAttribute('fill-opacity') || labelVisible(d.target)
    }).transition(t)
      .attr('fill-opacity', d => +labelVisible(d.target))
      .attrTween('transform', d => () => labelTransform(d.current))
  }

  return svg.node()
}).catch(err => {
  console.error('Fetch error data', err)
})
