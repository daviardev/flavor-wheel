import './style.css'

import createFlavorWheel from './js/flavorWheel'

createFlavorWheel({
  chart: {
    svg: 'chart',
    dataUrl: 'https://153532a4-d3a7-4635-b8df-87033232e2df.usrfiles.com/ugd/153532_5423f82e818a43a0a96d82a0c37568db.json'
  },
  storage: {
    aroma: 'Aroma Taiwan',
    flavor: 'Flavors Taiwan',
    color: 'Color Taiwan',
    storage: 'progress Taiwan'
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
