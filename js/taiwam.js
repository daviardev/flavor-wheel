import * as d3 from 'd3'

import { arcVisible, labelVisible, labelTransform, califications, config } from './constants.js'
import { showToast, showPersistentToast, removeToast } from './toast'

const selectedElements = new Set(JSON.parse(window.localStorage.getItem('selectedElements')) || [])
const tasteSelections = new Map(JSON.parse(window.localStorage.getItem('tasteSelections')) || [])

let colorSelection = window.localStorage.getItem('colorSelection') || null

const hasAromaSelection = () => Array.from(selectedElements).some(path => path.includes('Aroma'))

const tableContainer = document.getElementById('content-results')

const isTestComplete = () => {
  const requiredTasteCategories = ['Sourness', 'Saltiness', 'Sweetness', 'Bitterness', 'Umami',
    'Aftertaste', 'Fullness', 'Smoothness', 'Fineness', 'Purity']
  return hasAromaSelection() && requiredTasteCategories.every(category => tasteSelections.has(category)) && colorSelection !== null
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
    .padRadius(config.radius * 1.5)
    .innerRadius(d => d.y0 * config.radius)
    .outerRadius(d => Math.max(d.y0 * config.radius, d.y1 * config.radius - 1))

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', [
      -config.dimentions.width / 2,
      -config.dimentions.height / 2,
      config.dimentions.width,
      config.dimentions.height
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
    .attr('r', config.radius)
    .attr('fill', 'black')
    .attr('pointer-events', 'all')
    .on('click', clicked)

  parent.append('title')
    .text('To go back')

  svg.append('text')
    .style('text-anchor', 'middle')
    .style('color', 'white')
    .style('cursor', 'pointer')
    .attr('startOffset', '50%')
    .style('font-size', '16px')
    .attr('pointer-events', 'none')
    .text('Click here to go back')

  const generateResultsTable = () => {
    const basicCategories = ['Sourness', 'Saltiness', 'Sweetness', 'Bitterness', 'Umami']
    const mouthCategories = ['Aftertaste', 'Fullness', 'Smoothness', 'Fineness', 'Purity']

    const extractPathParts = (path) => {
      const parts = path.split('/')
      return {
        category: parts[2],
        element: parts.slice(3).join(', ')
      }
    }

    const results = `
    <div class="sections">
      <div class="tea-info">
        <h1 id="teaName">${colorSelection.split('/').pop()}</h1>
        <div class="color-reference">
          <div id="colorSwatch" style="background-color: ${getColorHex(colorSelection)}"></div>
          <span>Color Reference</span>
        </div>
        <div class="form-group">
          <label for="testName">Test Name</label>
          <input type="text" id="testName" placeholder="Enter test name">
        </div>
        <div class="form-group">
          <label>Rating</label>
          <div id="rating">
            <button class="star" data-rating="1">&#9733;</button>
            <button class="star" data-rating="2">&#9733;</button>
            <button class="star" data-rating="3">&#9733;</button>
            <button class="star" data-rating="4">&#9733;</button>
            <button class="star" data-rating="5">&#9733;</button>
          </div>

          <input type="hidden" id="ratingInput" name="rating" value="0">
        </div>
        <div class="form-group">
          <label for="notes">Notes</label>
          <textarea id="notes" placeholder="Add your tasting notes..."></textarea>
        </div>
        <div class="button-group">
          <button class="button" id="saveResults">Download</button>
          <button class="button" id="shareEmail">Share</button>
          <button class="button" id="returnTest">Return test</button>
          <button class="button" id="finishTest">Finish test</button>
        </div>
      </div>
      <div class="tea-profile">
        <div class="tabs">
          <button class="tab-btn active" data-tab="aroma">Aroma</button>
          <button class="tab-btn" data-tab="basic">Basic Flavor</button>
          <button class="tab-btn" data-tab="mouthfeel">Mouthfeel</button>
        </div>
        <div class="tab-content active" id="aromaContent">
          <div class="aroma-grid">
            <div>
              <h3>Aroma</h3>
              <div id="aromaCategories">
                ${Array.from(selectedElements)
                  .filter(path => path.includes('Aroma'))
                  .map(path => {
                    const { category } = extractPathParts(path)
                    return `<p>${category}</p>`
                  }).join('')}
              </div>
            </div>
            <div>
              <h3>Elements</h3>
              <div id="aromaDescriptions">
                ${Array.from(selectedElements)
                  .filter(path => path.includes('Aroma'))
                  .map(path => {
                    const { element } = extractPathParts(path)
                    return `<p>${element}</p>`
                  }).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="tab-content" id="basicContent">
          <h2>Basic Flavor Profile</h2>
          <div id="basicTasteResults">
            ${Array.from(tasteSelections.entries())
              .filter(([category]) => basicCategories.includes(category))
              .map(([category, selection]) => {
                const intensity = parseInt(selection.split('/').pop())
                return `
                  <div>
                    <label>${category}</label>
                    <div class="intensity-bar">
                      ${Array(5).fill().map((_, i) => `
                        <div class="intensity-segment ${i < intensity ? 'active' : ''}"></div>
                      `).join('')}
                    </div>
                  </div>
                `
              }).join('')}
          </div>
        </div>
        <div class="tab-content" id="mouthfeelContent">
          <h2>Mouthfeel Profile</h2>
          <div id="mouthfeelResults">
            ${Array.from(tasteSelections.entries())
              .filter(([category]) => mouthCategories.includes(category))
              .map(([category, selection]) => {
                const intensity = parseInt(selection.split('/').pop())
                return `
                  <div>
                    <label>${category}</label>
                    <div class="intensity-bar">
                      ${Array(5).fill().map((_, i) => `
                        <div class="intensity-segment ${i < intensity ? 'active' : ''}"></div>
                      `).join('')}
                    </div>
                  </div>
                `
              }).join('')}
          </div>
        </div>
      </div>
    </div>
  `
    tableContainer.innerHTML = results

    const tabBtns = document.querySelectorAll('.tab-btn')
    const tabContents = document.querySelectorAll('.tab-content')

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab')
        tabBtns.forEach(b => b.classList.remove('active'))
        tabContents.forEach(c => c.classList.remove('active'))
        btn.classList.add('active')
        document.getElementById(`${tabName}Content`).classList.add('active')
      })
    })

    const stars = document.querySelectorAll('.star')
    const ratingInput = document.getElementById('ratingInput')

    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = star.getAttribute('data-rating')
        ratingInput.value = rating
        updateStars(rating)
      })
    })

    const updateStars = rating => {
      stars.forEach(star => {
        const starRating = star.getAttribute('data-rating')
        star.classList.toggle('active', starRating <= rating)
      })
    }

    document.getElementById('saveResults').addEventListener('click', saveAsCSV)
    document.getElementById('shareEmail').addEventListener('click', shareViaEmail)
    document.getElementById('returnTest').addEventListener('click', returnToTest)
    document.getElementById('finishTest').addEventListener('click', finishAndResetTest)
  }

  const getColorHex = (colorPath) => {
    const colorData = data.children.find(child => child.name === 'Color')
    const selectedColor = colorData.children.find(color => colorPath.includes(color.name))
    return selectedColor ? selectedColor.color : '#FFFFFF'
  }

  function toggleSelection (event, d) {
    const fullPath = d.ancestors().map(d => d.data.name).reverse().join('/')
    const isTaste = d.ancestors().some(node => node.data.name === 'Taste')
    const isColor = d.ancestors().some(node => node.data.name === 'Color')

    if (isTaste) {
      if (!hasAromaSelection()) return

      const category = d.parent.data.name
      const currentSelection = tasteSelections.get(category)

      currentSelection === fullPath
        ? tasteSelections.delete(category)
        : tasteSelections.set(category, fullPath)

      window.localStorage.setItem('tasteSelections', JSON.stringify([...tasteSelections]))
    } else if (isColor) {
      if (colorSelection === fullPath) {
        colorSelection = null
        window.localStorage.removeItem('colorSelection')
      } else {
        colorSelection = fullPath
        window.localStorage.setItem('colorSelection', colorSelection)
      }
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
      const isColor = d.ancestors().some(node => node.data.name === 'Color')

      if (isTaste) {
        if (!hasAromaSelection()) return 0.3
        if (d.children) return 0.6
        const category = d.parent.data.name
        return tasteSelections.get(category) === fullPath ? 1 : 0.4
      }

      if (isColor) {
        return colorSelection === fullPath ? 1 : (d.children ? 0.6 : 0.4)
      }

      return selectedElements.has(fullPath) ? 1 : (d.children ? 0.6 : 0.4)
    })

    if (isTestComplete()) {
      if (!config.completionToast) {
        showCompletionToast()
      }
    } else {
      if (config.completionToast) {
        removeToast(config.completionToast)
        config.completionToast = null
      }
    }
  }

  function showCompletionToast () {
    config.completionToast = showPersistentToast('Test complete! Click here to view results.', 'success', {
      text: 'View Results',
      onClick: finishTest
    })
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
    if (!isTestComplete()) {
      showToast('Please complete all selections before finishing the test.', 'error')
      return
    }

    if (config.completionToast) {
      removeToast(config.completionToast)
      config.completionToast = null
    }

    document.getElementById('chart').style.display = 'none'
    document.getElementById('content-results').style.display = 'block'
    generateResultsTable()
  }

  function returnToTest () {
    document.getElementById('content-results').style.display = 'none'
    document.getElementById('chart').style.display = 'block'
  }

  function finishAndResetTest () {
    window.localStorage.removeItem('selectedElements')
    window.localStorage.removeItem('tasteSelections')
    window.localStorage.removeItem('colorSelection')

    selectedElements.clear()
    tasteSelections.clear()
    colorSelection = null

    document.getElementById('content-results').style.display = 'none'
    document.getElementById('chart').style.display = 'block'

    updateVisuals()
    showToast('Test finished and reset. You can start a new test now.', 'success')
  }

  updateVisuals()

  return svg.node()
}).catch(err => {
  console.error('Fetch error data', err)
})

function saveAsCSV () {
  const testName = document.getElementById('testName').value.trim()
  if (!testName) {
    showToast('Please enter a test name before downloading.', 'error')
    return
  }

  let csvContent = 'data:text/csv;charset=utf-8,'
  csvContent += 'Category - Selection'

  selectedElements.forEach(path => {
    const parts = path.split('/')
    csvContent += `\n${parts[1]}: ${parts.slice(2).join(' - ')}\n`
  })

  tasteSelections.forEach((selection, category) => { csvContent += `\n${category}: ${selection.split('/').pop()}\n` })

  if (colorSelection) { csvContent += `\nColor: ${colorSelection.split('/').pop()}\n` }

  csvContent += `\nTest Name: ${testName}\n`
  csvContent += `Rating: ${document.getElementById('ratingInput').value} stars\n`
  csvContent += `Notes: ${document.getElementById('notes').value}\n`

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')

  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `${testName || 'test_results'}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function shareViaEmail () {
  const testName = document.getElementById('testName').value.trim()
  if (!testName) {
    showToast('Please enter a test name before sharing.', 'error')
    return
  }

  const rating = document.getElementById('ratingInput').value
  const notes = document.getElementById('notes').value

  const emailBody = `
    Tea Tasting Test Results

    Test Name: ${testName}
    Rating: ${'★'.repeat(parseInt(rating))}${'☆'.repeat(5 - parseInt(rating))}
    Color: ${colorSelection ? colorSelection.split('/').pop() : 'Not selected'}

    Aroma Selections:
    ${Array.from(selectedElements)
      .filter(path => path.includes('Aroma'))
      .map(path => {
        const parts = path.split('/')
        return `- ${parts[2]}: ${parts.slice(3).join(', ')}`
      }).join('\n')}

    Taste Selections:
    ${Array.from(tasteSelections.entries())
      .map(([category, selection]) => `- ${category}: ${selection.split('/').pop()}`)
      .join('\n')}

    Notes:
    ${notes}
`

  const mailtoLink = `mailto:?subject=${encodeURIComponent(testName)}&body=${encodeURIComponent(emailBody)}`
  window.location.href = mailtoLink
}
