import './style.css'

import createFlavorWheel from './js/flavorWheel'

createFlavorWheel({
  chart: {
    svg: 'chart',
    dataUrl: 'path/data/json'
  },
  storage: {
    aroma: 'Aromas',
    flavor: 'Flavors',
    color: 'Color',
    storage: 'Storage'
  },
  requiredFlavor: {
    basic: [''],
    mouthfeel: ['']
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
