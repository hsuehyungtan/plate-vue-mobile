require('babel-core/register')
require('babel-polyfill')

const moment = require('moment')
const { get } = require('lodash')
const { SERVER_PROTOCOL, SERVER_HOST } = require('../../config')
const { SECTION_MAP } = require('../../../src/constants')

const getDate = (date) => {
  const normalizedDt = new Date(date)
  const datetime = moment(normalizedDt).format('YYYY.MM.DD HH:mm')
  return {
    dateFormatted: datetime,
    dateISO: normalizedDt.toISOString()
  }
}

const getSectionColorModifier = (sectionId) => {
  return get(SECTION_MAP, [ sectionId, 'sectionName' ], '')
}

const getCredit = ({ cameraMan = [], designers = [], engineers = [], extendByline = '', photographers = [], writers = [] }) => {
  const creditWriterStr = (writers.length > 0) ? '文/' + writers.filter((o) => (o !== null && o !== undefined)).map((o) => (`<a href=\"/author/${o._id}\">${o.name}</a>`)).join('&nbsp;') : ''
  const creditPhotoStr = (photographers.length > 0) ? '攝影/' + photographers.filter((o) => (o !== null && o !== undefined)).map((o) => (`<a href=\"/author/${o._id}\">${o.name}</a>`)).join('&nbsp;') : ''
  const creditDesignStr = (designers.length > 0) ? '設計/' + designers.filter((o) => (o !== null && o !== undefined)).map((o) => (`<a href=\"/author/${o._id}\">${o.name}</a>`)).join('&nbsp;') : ''
  const creditEnginStr = (engineers.length > 0) ? '工程/' + engineers.filter((o) => (o !== null && o !== undefined)).map((o) => (`<a href=\"/author/${o._id}\">${o.name}</a>`)).join('&nbsp;') : ''
  const creditCamStr = (cameraMan.length > 0) ? '影音/' + cameraMan.filter((o) => (o !== null && o !== undefined)).map((o) => (`<a href=\"/author/${o._id}\">${o.name}</a>`)).join('&nbsp;') : ''
  const creditElse = (extendByline.length > 0) ? extendByline + '&nbsp;' : ''
  return [ creditWriterStr, creditPhotoStr, creditDesignStr, creditEnginStr, creditCamStr, creditElse ].filter((o) => (o.length > 0)).join('&nbsp;&nbsp;&nbsp;&nbsp;')
}

const getStoryHeroImageSrc = (heroImage) => {
  const dimensions = {
    desktop: get(heroImage, 'image.resizedTargets.desktop.url', get(heroImage, 'image.url', `${SERVER_PROTOCOL}://${SERVER_HOST}/public/notImage.png`)),
    tablet: get(heroImage, 'image.resizedTargets.tablet.url', get(heroImage, 'image.url', `${SERVER_PROTOCOL}://${SERVER_HOST}/public/notImage.png`)),
    mobile: get(heroImage, 'image.resizedTargets.mobile.url', get(heroImage, 'image.url', `${SERVER_PROTOCOL}://${SERVER_HOST}/public/notImage.png`)),
    tiny: get(heroImage, 'image.resizedTargets.tiny.url', get(heroImage, 'image.url', `${SERVER_PROTOCOL}://${SERVER_HOST}/public/notImage.png`)),
  }
  return get(dimensions, 'mobile')
}

const annotationTextTagStart = '<!--__ANNOTATION__='
const annotationTextTagEnd = '-->'
const hasAnnotation = (paragraph) => {
  const annotationContentStart = paragraph.toString().indexOf(annotationTextTagStart)
  const annotationContentEnd = paragraph.toString().indexOf(annotationTextTagEnd)

  return (annotationContentStart > -1 && annotationContentEnd > -1)
}

const composeAnnotation =  (annotationStr) => {
  const annotationContentStart = annotationStr.toString().indexOf(annotationTextTagStart)
  const annotationContentEnd = annotationStr.toString().indexOf(annotationTextTagEnd)

  const annotationContent = hasAnnotation(annotationStr) ? annotationStr.toString().substring(annotationContentStart + '<!--__ANNOTATION__='.length, annotationContentEnd) : '{}'

  const annotationContentObj = JSON.parse(annotationContent)

  let paragraph = annotationStr.toString()

  if (get(annotationContentObj, [ 'text' ])) {
    paragraph = paragraph.replace(`--><!--${annotationContentObj.text}-->`, '')
  }

  return {
    annotationPart1: annotationStr.toString().substring(0, annotationContentStart),
    annotationPart2: annotationContentObj.text,
    annotationPart3: hasAnnotation(paragraph.substring(annotationContentEnd)) ? composeAnnotation(paragraph.substring(annotationContentEnd)) : paragraph.substring(annotationContentEnd),
    annotationText: get(annotationContentObj, [ 'pureAnnotationText' ], '')
  }
}

module.exports = {
  getDate,
  getSectionColorModifier,
  getCredit,
  getStoryHeroImageSrc,
  composeAnnotation
}