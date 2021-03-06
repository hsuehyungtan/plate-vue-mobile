import { alexa, fb_sdk, gtm_mirrormedia, gtm_likr, scorecardresearch } from './dynamicScript'
import { forEach, split } from 'lodash'

const debug = require('debug')('CLIENT:mixinTitleMeta')
const timestamp_start = Date.now()
let isScriptLoaded = false
let isWindowLoadedHandlerSetup = false

function getMetaSet (vm) {
  const { metaSet } = vm.$options
  if (metaSet) {
    return typeof metaSet === 'function'
      ? metaSet.call(vm)
      : metaSet
  }
  return undefined
}

const serverTitleMetaMixin = {
  created () {
    const metaSet = getMetaSet(this)
    if (!metaSet) { return }
    const link = metaSet.link
    const meta = metaSet.meta
    const title = metaSet.title
    const url = metaSet.url
    const adTrace = metaSet.adTrace
    this.$ssrContext.custom = metaSet.custom || ''
    if (title) {
      this.$ssrContext.title = title
    }
    if (meta) {
      this.$ssrContext.meta = meta
    }
    if (link) {
      this.$ssrContext.link = link
    }
    if (url) {
      this.$ssrContext.url = url
    }
    if (adTrace) {
      this.$ssrContext.adTrace = adTrace
    }
  }
}

const updateMeta = metaInfo => {
  const { title, meta, url, adTrace } = metaInfo
  const adTraceScripts = [ ...document.querySelectorAll('*[data-name="ad-trace"]') ]
  adTraceScripts.map(node => node.remove())
  
  if (title) {
    document.querySelector('title').innerHTML = title
  }
  if (url) {
    const alternate = document.head.querySelector(`link[rel='canonical']`)
    alternate && (alternate.href = url)
  }
  if (adTrace) {
    const parser = new DOMParser()
    const doc = parser.parseFromString(adTrace, "text/html")
    const scripts = [ ...doc.querySelectorAll('*[data-name="ad-trace"]') ]
    debug('adTrace scripts', scripts)
    scripts.map(node => document.head.appendChild(node))
  }
  if (meta) {
    const dynamicMeta = document.querySelectorAll('head meta:not([fixed="true"])')
    const newMeta = split(meta, '>')
    forEach(dynamicMeta, (node) => {
      document.head.removeChild(node)
    })
    forEach(newMeta, (m) => {
      const node = document.createElement('div')
      node.innerHTML = `${m}>`
      const updateMeta = node.querySelector('meta')
      if (updateMeta) {
        document.head.appendChild(updateMeta)
      }
    })
  }
}

const clientTitleMetaMixin = {
  mounted () {
    const metaSet = getMetaSet(this)
    metaSet && updateMeta(metaSet, this)
  },
  updated () {
    const metaSet = getMetaSet(this)
    metaSet && updateMeta(metaSet, this)
  }
}

process.env.VUE_ENV === 'client' && document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded.', Date.now() - timestamp_start, 'ms')
})
process.env.VUE_ENV === 'client' && !isWindowLoadedHandlerSetup && window.addEventListener('load', () => {
  console.log('PAGE LOADED.', Date.now() - timestamp_start, 'ms')
  if (!isScriptLoaded) {
    const insertCodes = async codes => {
      const script = document.createElement('script')
      script.innerHTML = codes
      document.head.appendChild(script)
    }
    isScriptLoaded = Promise.all([
      insertCodes(gtm_mirrormedia).then(() => insertCodes(gtm_likr)),
      insertCodes(fb_sdk),
      insertCodes(scorecardresearch).then(() => insertCodes(alexa)),
      Promise.resolve()
    ]).then(() => true).catch(() => false)
  }
  isWindowLoadedHandlerSetup = true
})

export default process.env.VUE_ENV === 'server'
  ? serverTitleMetaMixin
  : clientTitleMetaMixin
