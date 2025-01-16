import './style.css'

import createFlavorWheel from './js/flavorWheel'

createFlavorWheel({
  chart: {
    svg: 'chart',
    dataUrl: '/data/japanese-tea.json'
  },
  storage: {
    aroma: 'Aroma',
    flavor: 'Flavors',
    color: 'Color',
    storage: 'progress'
  },
  requiredFlavor: {
    basic: ['Sourness', 'Saltiness', 'Sweetness', 'Bitterness', 'Umami'],
    mouthfeel: ['Aftertaste', 'Fullness', 'Smoothness', 'Fineness', 'Purity']
  },
  formGroup: {
    testName: 'testName',
    star: 'star',
    inputRate: 'ratingInput',
    notes: 'notes',
    download: 'saveResult',
    share: 'shareResult',
    returnTest: 'returnTest',
    finish: 'finishTest'
  },
  tabButton: 'tab-page',
  tabContent: 'tab-content-page'
})
