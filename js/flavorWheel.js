import * as d3 from 'd3'

import { $$, ID } from '../utils/dom.js'

import { arcVisible, labelVisible, labelTransform, califications, arcs } from './constants'

import { showToast, showPersistentToast, removeToast } from './toast.js'

import { selectors } from '../utils/selectors.js'

function createFlavorWheel (options = {}) {
  const element = selectors(options)

  const aroma = new Set(JSON.parse(window.localStorage.getItem(element.storage.aroma)) || [])
  const flavor = new Map(JSON.parse(window.localStorage.getItem(element.storage.flavor)) || [])

  let color = window.localStorage.getItem(element.storage.color) || null

  const hasAromaSelection = () => Array.from(aroma).some(path => path.includes('Aroma'))

  const chartSvg = ID(element.chart.svg)
  const contentResult = ID('content-results')

  const isTestComplete = () => {
    const requiredFlavor = [...element.requiredFlavor.basic, ...element.requiredFlavor.mouthfeel]
    return hasAromaSelection() && requiredFlavor.every(category => flavor.has(category)) && color !== null
  }

  d3.json(element.chart.dataUrl).then(data => {
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
      .padRadius(arcs.radius * 1.5)
      .innerRadius(d => d.y0 * arcs.radius)
      .outerRadius(d => Math.max(d.y0 * arcs.radius, d.y1 * arcs.radius - 1))

    const svg = d3.select(chartSvg)
      .append('svg')
      .attr('viewBox', [
        -arcs.dimentions.width / 2,
        -arcs.dimentions.height / 2,
        arcs.dimentions.width,
        arcs.dimentions.height
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
      .attr('r', arcs.radius)
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
      const basicFlavor = element.requiredFlavor.basic
      const mouthfeelFlavor = element.requiredFlavor.mouthfeel

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
        <h1 id="teaName">${color.split('/').pop()}</h1>
        <div class="color-reference">
          <div id="colorSwatch" style="background-color: ${getColorHex(color)}"></div>
          <span>Color Reference</span>
        </div>
        <div class="form-group">
          <label for="${element.formGroup.testName}">Test Name</label>
          <input type="text" id="${element.formGroup.testName}" placeholder="Enter test name">
        </div>
        <div class="form-group">
          <label>Rating</label>
          <div>
            <button class="star ${element.formGroup.star}" data-rating="1">&#9733;</button>
            <button class="star ${element.formGroup.star}" data-rating="2">&#9733;</button>
            <button class="star ${element.formGroup.star}" data-rating="3">&#9733;</button>
            <button class="star ${element.formGroup.star}" data-rating="4">&#9733;</button>
            <button class="star ${element.formGroup.star}" data-rating="5">&#9733;</button>
          </div>

          <input type="hidden" id="${element.formGroup.inputRate}" name="rating" value="0">
        </div>
        <div class="form-group">
          <label for="${element.formGroup.notes}">Notes</label>
          <textarea id="${element.formGroup.notes}" placeholder="Add your tasting notes..."></textarea>
        </div>
        <div class="button-group">
          <button class="button" id="${element.formGroup.download}">Download</button>
          <button class="button" id="${element.formGroup.share}">Share</button>
          <button class="button" id="${element.formGroup.returnTest}">Return test</button>
          <button class="button" id="${element.formGroup.finish}">Finish test</button>
        </div>
      </div>
      <div class="tea-profile">
        <div class="tabs">
          <button class="tab-btn ${element.tabButton} active" data-tab="aroma">Aroma</button>
          <button class="tab-btn ${element.tabButton}" data-tab="basic">Basic Flavor</button>
          <button class="tab-btn ${element.tabButton}" data-tab="mouthfeel">Mouthfeel</button>
        </div>
        <div class="tab-content ${element.tabContent} active" id="aromaContent">
          <div class="aroma-grid">
            <div>
              <h3>Aroma</h3>
              <div id="aromaCategories">
                ${Array.from(aroma)
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
                ${Array.from(aroma)
                  .filter(path => path.includes('Aroma'))
                  .map(path => {
                    const { element } = extractPathParts(path)
                    return `<p>${element}</p>`
                  }).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="tab-content ${element.tabContent}" id="basicContent">
          <h2>Basic Flavor Profile</h2>
          <div>
            ${Array.from(flavor.entries())
              .filter(([category]) => basicFlavor.includes(category))
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
        <div class="tab-content ${element.tabContent}" id="mouthfeelContent">
          <h2>Mouthfeel Profile</h2>
          <div id="mouthfeelResults">
            ${Array.from(flavor.entries())
              .filter(([category]) => mouthfeelFlavor.includes(category))
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
      contentResult.innerHTML = results

      const tabBtns = $$(`.${element.tabButton}`)
      const tabContents = $$(`.${element.tabContent}`)

      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabName = btn.getAttribute('data-tab')
          tabBtns.forEach(b => b.classList.remove('active'))
          tabContents.forEach(c => c.classList.remove('active'))
          btn.classList.add('active')
          ID(`${tabName}Content`).classList.add('active')
        })
      })

      const stars = $$(`.${element.formGroup.star}`)
      const ratingInput = ID(element.formGroup.inputRate)

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

      ID(element.formGroup.download).addEventListener('click', saveAsCSV)
      ID(element.formGroup.share).addEventListener('click', shareViaEmail)
      ID(element.formGroup.returnTest).addEventListener('click', returnToTest)
      ID(element.formGroup.finish).addEventListener('click', finishAndResetTest)
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
        const currentSelection = flavor.get(category)

        currentSelection === fullPath
          ? flavor.delete(category)
          : flavor.set(category, fullPath)

        window.localStorage.setItem(element.storage.flavor, JSON.stringify([...flavor]))
      } else if (isColor) {
        if (color === fullPath) {
          color = null
          window.localStorage.removeItem(element.storage.color)
        } else {
          color = fullPath
          window.localStorage.setItem(element.storage.color, color)
        }
      } else {
        aroma.has(fullPath)
          ? aroma.delete(fullPath)
          : aroma.add(fullPath)

        window.localStorage.setItem(element.storage.aroma, JSON.stringify([...aroma]))
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
          return flavor.get(category) === fullPath ? 1 : 0.4
        }

        if (isColor) {
          return color === fullPath ? 1 : (d.children ? 0.6 : 0.4)
        }

        return aroma.has(fullPath) ? 1 : (d.children ? 0.6 : 0.4)
      })

      if (isTestComplete()) {
        if (!arcs.completionsToast) {
          showCompletionToast()
        }
      } else {
        if (arcs.completionsToast) {
          removeToast(arcs.completionsToast)
          arcs.completionsToast = null
        }
      }
    }

    function showCompletionToast () {
      arcs.completionsToast = showPersistentToast('Test complete! Click here to view results.', 'success', {
        text: 'View Results',
        onClick: finishTest
      })
    }

    function clicked (_, p) {
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

      if (arcs.completionsToast) {
        removeToast(arcs.completionsToast)
        arcs.completionsToast = null
      }

      chartSvg.style.display = 'none'
      ID('content-results').style.display = 'block'
      generateResultsTable()
    }

    function returnToTest () {
      ID('content-results').style.display = 'none'
      chartSvg.style.display = 'block'
    }

    function finishAndResetTest () {
      window.localStorage.removeItem(element.storage.aroma)
      window.localStorage.removeItem(element.storage.flavor)
      window.localStorage.removeItem(element.storage.color)

      aroma.clear()
      flavor.clear()
      color = null

      ID('content-results').style.display = 'none'
      chartSvg.style.display = 'block'

      updateVisuals()
      showToast('Test finished and reset. You can start a new test now.', 'success')
    }

    updateVisuals()

    return svg.node()
  }).catch(err => {
    console.error('Fetch error data', err)
  })

  function saveAsCSV () {
    const testName = ID(element.formGroup.testName).value.trim()
    if (!testName) {
      showToast('Please enter a test name before downloading.', 'error')
      return
    }

    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Category - Selection'

    aroma.forEach(path => {
      const parts = path.split('/')
      csvContent += `\n${parts[1]}: ${parts.slice(2).join(', ')}\n`
    })

    flavor.forEach((selection, category) => { csvContent += `\n${category}: ${selection.split('/').pop()}\n` })

    if (color) { csvContent += `\nColor: ${color.split('/').pop()}\n` }

    csvContent += `\nTest Name: ${testName}\n`
    csvContent += `Rating: ${ID(element.formGroup.inputRate).value} stars\n`
    csvContent += `Notes: ${ID(element.formGroup.notes).value}\n`

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')

    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${testName}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function shareViaEmail () {
    const testName = ID(element.formGroup.testName).value.trim()
    if (!testName) {
      showToast('Please enter a test name before sharing.', 'error')
      return
    }

    const rating = ID(element.formGroup.inputRate).value
    const notes = ID(element.formGroup.notes).value

    const emailBody = `
  Hey! 👋

      I'm sharing with you the results of my aroma and taste test. I hope you like it and can see how i did in all this.
      Here are the details:

      NAME OF TEST ${testName}

      RATING ${'⭐'.repeat(parseInt(rating))}

      COLOR ${color && color.split('/').pop()}

      ---------- SELECTIONS -------------

      AROMA
      ${
        Array.from(aroma)
          .filter(path => path.includes('Aroma'))
          .map(path => {
            const parts = path.split('/')

            return `👃 ${parts[2]}: ${parts.slice(3).join(' ')}`
          }).join('\n')
      }

      TASTE
      ${
        Array.from(flavor.entries())
          .map(([category, selection]) => `👅 ${category}: ${selection.split('/').pop()}`)
          .join('\n')
      }

      NOTES ${notes}
`

    const mailtoLink = `mailto:?subject=${encodeURIComponent(testName)}&body=${encodeURIComponent(emailBody)}`
    window.location.href = mailtoLink
  }
}

export default createFlavorWheel
