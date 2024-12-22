export const selectors = (options = {}) => {
  return {
    chart: {
      svg: options.chart?.svg,
      dataUrl: options.chart?.dataUrl
    },
    storage: {
      aroma: options.storage?.aroma,
      flavor: options.storage?.flavor,
      color: options.storage?.color
    },
    requiredFlavor: {
      basic: options.requiredFlavor?.basic,
      mouthfeel: options.requiredFlavor?.mouthfeel
    },
    formGroup: {
      testName: options.formGroup?.testName,
      star: options.formGroup?.star,
      inputRate: options.formGroup?.inputRate,
      notes: options.formGroup?.notes,
      download: options.formGroup?.download,
      share: options.formGroup?.share,
      returnTest: options.formGroup?.return,
      finish: options.formGroup?.finish
    },
    tabButton: options.tabButton,
    tabContent: options.tabContent,
    content: options.content
  }
}
