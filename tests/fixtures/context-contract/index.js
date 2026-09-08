const stringTokens = new Map()
let activeSsr = null
let activeProvides = null
let ownProvides = false
let onOwn = null

export function createContext(defaultValue) {
  return { _id: Symbol('aihu.context'), _default: defaultValue }
}

export function contextKey(key) {
  let token = stringTokens.get(key)
  if (!token) {
    token = createContext()
    stringTokens.set(key, token)
  }
  return token
}

export function provide(token, value) {
  if (activeProvides !== null || onOwn !== null) {
    if (!ownProvides) {
      activeProvides = Object.create(activeProvides)
      ownProvides = true
      onOwn?.(activeProvides)
    }
    activeProvides[token._id] = value
    return
  }
  activeSsr?.set(token._id, value)
}

export function inject(token) {
  if (activeProvides !== null) return token._id in activeProvides ? activeProvides[token._id] : token._default
  return activeSsr?.has(token._id) ? activeSsr.get(token._id) : token._default
}

export function _enterContext(parent, callback) {
  const previous = [activeProvides, ownProvides, onOwn]
  activeProvides = parent
  ownProvides = false
  onOwn = callback
  return previous
}

export function _exitContext(previous) {
  ;[activeProvides, ownProvides, onOwn] = previous
}

export function setSsrContextMap(map) { activeSsr = map }
export function clearSsrContextMap() { activeSsr = null }
export function runWithContext(map, fn) {
  const previous = activeSsr
  activeSsr = map
  try { return fn() } finally { activeSsr = previous }
}
