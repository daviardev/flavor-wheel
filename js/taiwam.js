import * as d3 from 'd3'

const dimentions = { width: 600, height: 600 }

const radius = dimentions.width / 6

const selectedElements = new Set(JSON.parse(window.localStorage.getItem('selectedElements')) || [])
const tasteSelections = new Map(JSON.parse(window.localStorage.getItem('tasteSelections')) || [])

const arcVisible = d => { return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0 }
const labelVisible = d => { return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03 }

const labelTransform = d => {
  const x = (d.x0 + d.x1) / 2 * 180 / Math.PI
  const y = (d.y0 + d.y1) / 2 * radius

  return `rotate(${x - 90}) translate(${y}, 0) rotate(${x < 180 ? 0 : 180})`
}

const hasAromaSelection = () => { return Array.from(selectedElements).some(path => path.includes('Aroma')) }

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

const isTestComplete = () => {
  const requiredTasteCategories = ['Sourness', 'Saltiness', 'Sweetness', 'Bitterness', 'Umami',
    'Aftertaste', 'Fullness', 'Smoothness', 'Fineness', 'Purity']
  return hasAromaSelection() && requiredTasteCategories.every(category => tasteSelections.has(category))
}

const generateResultsTable = () => {
  const tableContainer = document.createElement('div')
  tableContainer.innerHTML = `
    <h2>Resultados de la Prueba</h2>
    <table id="resultsTable">
      <tr>
        <th>Categoría</th>
        <th>Selección</th>
      </tr>
      ${Array.from(selectedElements).map(path => `
        <tr>
          <td>${path.split('/')[1]}</td>
          <td>${path.split('/').slice(2).join(' > ')}</td>
        </tr>
      `).join('')}
      ${Array.from(tasteSelections.entries()).map(([category, selection]) => `
        <tr>
          <td>${category}</td>
          <td>${selection.split('/').pop()}</td>
        </tr>
      `).join('')}
    </table>
    <div>
      <label for="testName">Nombre de la Prueba:</label>
      <input type="text" id="testName">
    </div>
    <div>
      <label for="rating">Calificación:</label>
      <select id="rating">
        <option value="1">1 Estrella</option>
        <option value="2">2 Estrellas</option>
        <option value="3">3 Estrellas</option>
        <option value="4">4 Estrellas</option>
        <option value="5">5 Estrellas</option>
      </select>
    </div>
    <div>
      <label for="notes">Notas:</label>
      <textarea id="notes"></textarea>
    </div>
    <button id="saveResults">Guardar Resultados</button>
  `
  return tableContainer
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

  path.filter(d => !d.children)
    .style('cursor', 'pointer')
    .on('click', toggleSelection)

  path.append('title')
    .text(d => d.data.description)

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
    .text(d => califications(d) ? califications(d.data.name) : d.data.name)

  const parent = svg.append('circle')
    .datum(partition)
    .attr('r', radius)
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('click', clicked)

  parent.append('title')
    .text('Return')

  const finishButton = d3.select('#chart')
    .append('button')
    .attr('id', 'finishTest')
    .text('Finalizar Prueba')
    .attr('disabled', true)
    .on('click', finishTest)

  function toggleSelection (event, d) {
    const fullPath = d.ancestors().map(d => d.data.name).reverse().join('/')
    const isTaste = d.ancestors().some(node => node.data.name === 'Taste')

    if (isTaste) {
      if (!hasAromaSelection()) return

      const category = d.parent.data.name
      const currentSelection = tasteSelections.get(category)

      currentSelection === fullPath
        ? tasteSelections.delete(category)
        : tasteSelections.set(category, fullPath)

      window.localStorage.setItem('tasteSelections', JSON.stringify(Array.from(tasteSelections.entries())))
    } else {
      selectedElements.has(fullPath)
        ? selectedElements.delete(fullPath)
        : selectedElements.add(fullPath)

      window.localStorage.setItem('selectedElements', JSON.stringify([...selectedElements]))
    }

    updateVisuals()
  }

  function updateVisuals () {
    path.attr('fill-opacity', d => {
      if (!arcVisible(d.current)) return 0

      const fullPath = d.ancestors().map(d => d.data.name).reverse().join('/')
      const isTaste = d.ancestors().some(node => node.data.name === 'Taste')

      if (isTaste) {
        if (!hasAromaSelection()) return 0.3
        if (d.children) return 0.6
        const category = d.parent.data.name
        return tasteSelections.get(category) === fullPath ? 1 : 0.4
      }

      return selectedElements.has(fullPath) ? 1 : (d.children ? 0.6 : 0.4)
    })

    finishButton.attr('disabled', isTestComplete() ? null : true)
  }

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

    t.end().then(updateVisuals)
  }

  function finishTest () {
    !isTestComplete() &&
      window.alert('Por favor, complete todas las selecciones antes de finalizar la prueba.')

    d3
      .select('#chart')
      .style('display', 'none')

    const resultsContainer = d3.select('body').append('div').attr('id', 'resultsContainer')
    resultsContainer.node().appendChild(generateResultsTable())

    document.getElementById('saveResults').addEventListener('click', saveResults)
  }

  function saveResults () {
    const testName = document.getElementById('testName').value
    const rating = document.getElementById('rating').value
    const notes = document.getElementById('notes').value

    !testName &&
      window.alert('Por favor, ingrese un nombre para la prueba.')

    const results = {
      testName,
      rating,
      notes,
      aromaSelections: Array.from(selectedElements),
      tasteSelections: Array.from(tasteSelections.entries())
    }

    const savedTests = JSON.parse(window.localStorage.getItem('savedTests') || '[]')
    savedTests.push(results)
    window.localStorage.setItem('savedTests', JSON.stringify(savedTests))

    window.alert('Resultados de la prueba guardados exitosamente!')
  }

  return svg.node()
}).catch(err => {
  console.error('Fetch error data', err)
})
