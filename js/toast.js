const toastContainer = document.createElement('div')
toastContainer.id = 'toast-container'
document.body.appendChild(toastContainer)

const style = document.createElement('style')
style.textContent = `
  #toast-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: 10px;
  }

  .toast {
    min-width: 300px;
    padding: 12px 16px;
    border-radius: 6px;
    background: white;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toast-in 0.3s ease-out forwards;
    transition: transform 0.3s ease-out;
  }

  .toast.removing {
    animation: toast-out 0.3s ease-out forwards;
  }

  .toast-success {
    border-left: 4px solid #22c55e;
  }

  .toast-error {
    border-left: 4px solid #ef4444;
  }

  .toast-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .toast-success .toast-icon {
    color: #22c55e;
  }

  .toast-error .toast-icon {
    color: #ef4444;
  }

  .toast-message {
    color: #1f2937;
    font-size: 14px;
    margin: 0;
  }

  @keyframes toast-in {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes toast-out {
    from {
      transform: translateY(0);
      opacity: 1;
    }
    to {
      transform: translateY(100%);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

const createIcon = (type) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.classList.add('toast-icon')

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')

  if (type === 'success') {
    path.setAttribute('d', 'M20 6L9 17l-5-5')
  } else {
    path.setAttribute('d', 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')
  }

  svg.appendChild(path)
  return svg
}

export const showToast = (message, type = 'success', options = {}) => {
  const { duration = 3000, persistent = false, action = null } = options
  const toast = document.createElement('div')
  toast.classList.add('toast', `toast-${type}`)

  const icon = createIcon(type)
  const messageElement = document.createElement('p')
  messageElement.classList.add('toast-message')
  messageElement.textContent = message

  toast.appendChild(icon)
  toast.appendChild(messageElement)

  if (action) {
    const actionButton = document.createElement('button')
    actionButton.textContent = action.text
    actionButton.classList.add('toast-action')
    actionButton.addEventListener('click', () => {
      action.onClick()
      if (!persistent) {
        removeToast(toast)
      }
    })
    toast.appendChild(actionButton)
  }

  toastContainer.appendChild(toast)

  if (!persistent) {
    setTimeout(() => {
      removeToast(toast)
    }, duration)
  }

  return toast
}

export const removeToast = (toast) => {
  toast.classList.add('removing')
  toast.addEventListener('animationend', () => {
    toast.remove()
    adjustToastPositions()
  })
}

export const showPersistentToast = (message, type = 'success', action) => {
  const toast = showToast(message, type, { persistent: true })

  if (action) {
    const actionButton = document.createElement('button')
    actionButton.textContent = action.text
    actionButton.classList.add('toast-action')
    actionButton.addEventListener('click', () => {
      action.onClick()
      removeToast(toast)
    })
    toast.appendChild(actionButton)
  }

  return toast
}

const adjustToastPositions = () => {
  const toasts = toastContainer.querySelectorAll('.toast:not(.removing)')
  toasts.forEach((t, index) => {
    t.style.transform = index === 0 ? '' : `translateY(-${index * 10}px)`
  })
}

const actionButtonStyle = `
.toast-action {
  background: none;
  border: none;
  color: #4CAF50;
  font-weight: bold;
  cursor: pointer;
  margin-left: 10px;
  padding: 0;
}

.toast-action:hover {
  text-decoration: underline;
}
`

style.textContent += actionButtonStyle
