<template>
  <VueDfpProvider :dfpid="DFP_ID" :dfpUnits="DFP_UNITS" :options="dfpOptions" :mode="currEnv()" section="5975ab2de531830d00e32b2f">
    <template slot-scope="props" slot="dfpPos">
      <HeaderR :abIndicator="abIndicator" :dfpHeaderLogoLoaded="dfpHeaderLogoLoaded" :props="props" :showDfpHeaderLogo="showDfpHeaderLogo" activeSection="videohub" />
      <template v-if="isSingleVideoPage">
        <SingleVideoBody :video="video" :videos="$store.state.playlist[OATH_ALL_VIDEO_PLAYLIST_ID]">
          <ShareLight slot="share" :gtmCategory="'article'" />
          <template v-if="mounted">
            <vue-dfp :is="props.vueDfp" slot="MBHD" :config="props.config" class="dfp" pos="MBHD" :size="get($store, 'getters.adSize')" />
          </template>
          <template v-if="mounted">
            <vue-dfp :is="props.vueDfp" slot="MBFT" :config="props.config" class="dfp" pos="MBFT" :size="get($store, 'getters.adSize')" />
          </template>
          <template v-if="mounted">
            <vue-dfp :is="props.vueDfp" slot="MBE1" :config="props.config" class="dfp" pos="MBE1" :size="get($store, 'getters.adSize')" />
          </template>
        </SingleVideoBody>
      </template>
      <template v-else>
        <VideoLeading>
          <vue-dfp :is="props.vueDfp" v-if="mounted" slot="LMBHD" :config="props.config" class="dfp" pos="LMBHD" :size="get($store, 'getters.adSize')" />
        </VideoLeading>
        <template v-for="(item, index) in playlist">
          <VideoList :key="item.id" :items="$store.state.playlist[item.id]" :playlist="item" @loadmore="handleLoadmore">
            <router-link v-if="!isCategoryPage" slot="more" :to="`/category/${OATH_PLAYLIST[item.id].categoryName}`" class="btn--more">看更多<img src="/assets/mirrormedia/icon/arrow-slideshow-blue-right.png" alt="看更多"></router-link>
            <template v-if="mounted && isCategoryPage">
              <vue-dfp :is="props.vueDfp" :key="`${index}-LMBFT`" slot="LMBFT" :config="props.config" class="dfp" pos="LMBFT" :size="get($store, 'getters.adSize')" />
            </template>
          </VideoList>
          <template v-if="mounted && !isCategoryPage">
            <vue-dfp :is="props.vueDfp" v-if="index === 2" :key="`${index}-LMBFT`" :config="props.config" class="dfp" pos="LMBFT" :size="get($store, 'getters.adSize')" />
          </template>
        </template>
      </template>
      <section class="footer container">
        <Footer />
      </section>
      <Share v-if="!isSingleVideoPage" left="20px" bottom="20px" />
      <LazyItemWrapper :loadAfterPageLoaded="true">
        <DfpST :props="props">
          <vue-dfp :is="props.vueDfp" :config="props.config" pos="MBST" slot="dfpST" />
        </DfpST>
      </LazyItemWrapper>         
      <DfpCover v-if="mounted && isTimeToShowAdCover" v-show="showDfpCoverAdFlag">
        <vue-dfp :is="props.vueDfp" pos="LMBCVR" :config="props.config" slot="ad-cover" />
      </DfpCover>
      <DfpCover v-if="mounted && showDfpCoverAd2Flag" :showCloseBtn="false" class="raw">
        <vue-dfp :is="props.vueDfp" pos="LMBCVR2" :config="props.config" slot="ad-cover" />
      </DfpCover>
      <DfpCover v-if="mounted && showDfpCoverInnityFlag" :showCloseBtn="false" class="raw">
        <vue-dfp :is="props.vueDfp" pos="LMBCVR3" :config="props.config" slot="ad-cover" />
      </DfpCover>
    </template>
  </VueDfpProvider>
</template>
<script>
import Cookie from 'vue-cookie'
import DfpCover from '../components/DfpCover.vue'
import DfpST from '../components/DfpST.vue'
import Footer from '../components/Footer.vue'
import HeaderR from '../components/HeaderR.vue'
import LazyItemWrapper from 'src/components/common/LazyItemWrapper.vue'
import LiveStream from '../components/LiveStream.vue'
import SingleVideoBody from '../components/video/SingleVideoBody.vue'
import Share from '../components/Share.vue'
import ShareLight from '../components/share/ShareLight.vue'
import VideoLeading from '../components/video/VideoLeading.vue'
import VideoList from '../components/video/VideoList.vue'
import VueDfpProvider from 'plate-vue-dfp/DfpProvider.vue'
import titleMetaMixin from '../util/mixinTitleMeta'
import { DFP_ID, DFP_UNITS, DFP_OPTIONS, DFP_SIZE_MAPPING, FB_APP_ID, FB_PAGE_ID, OATH_ALL_VIDEO_PLAYLIST_ID, OATH_PLAYLIST } from '../constants'
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_OGIMAGE, SITE_TITLE, SITE_URL} from '../constants'
import { adtracker } from 'src/util/adtracking'
import { currEnv, sendAdCoverGA, updateCookie } from '../util/comm'
import { get, truncate, } from 'lodash'
import { getRole } from '../util/mmABRoleAssign'

const debug = require('debug')('CLIENT:VIEWS:video')

const fetchCommonData = (store) => {
  return store.dispatch('FETCH_COMMONDATA', { 'endpoints': [ 'sectionfeatured', 'sections', 'topics' ] })
    .catch(err => {
      if (err.status === 404) {
        const e = new Error()
        e.massage = 'Page Not Found'
        e.code = '404'
        throw e
      } else {
        throw err
      }
    })
}

const fetchEvent = (store, eventType = 'embedded') => {
  return store.dispatch('FETCH_EVENT', {
    params: {
      max_results: 1,
      where: {
        isFeatured: true,
        eventType: eventType
      }
    }
  })
}

const fetchPlaylist = (store, { id, params }) => {
  return store.dispatch('FETCH_OATH_PLAYLIST', {
    id,
    params
  })
  .catch(() => {
    const e = new Error()
    e.massage = 'Page Not Found'
    e.code = '404'
    throw e
  })
}

const fetchVideo = (store, { id }) => {
  return store.dispatch('FETCH_OATH_VIDEO', {
    id,
  })
  .catch(() => {
    const e = new Error()
    e.massage = 'Page Not Found'
    e.code = '404'
    throw e
  })
}

const fetchVideoByPlaylist = (store, { id, params = {} }) => {
  return store.dispatch('FETCH_OATH_VIDEO_BY_PLAYLIST', {
    id,
    params
  })
}

const fetchPartners = (store) => {
  return store.dispatch('FETCH_PARTNERS', {
    params: {
      max_results: 25,
      page: 1
    }
  })
}

const fetchFullPlaylist = (store, jobs = []) => {
  const prefetchPlaylist = Object.values(OATH_PLAYLIST)
    .sort((a, b) => a.order - b.order)
    .slice(2)
    .map(playlist => playlist.id)
  prefetchPlaylist.map(playlistId => {
    jobs.push(fetchPlaylist(store, { id: playlistId }))
    jobs.push(fetchVideoByPlaylist(store, { id: playlistId }))
  })
  return jobs
} 

export default {
  name: 'AppVideo',
  components: {
    DfpCover,
    DfpST,
    Footer,
    HeaderR,
    LazyItemWrapper,
    LiveStream,
    SingleVideoBody,
    Share,
    ShareLight,
    VideoLeading,
    VideoList,
    VueDfpProvider,
  },
  asyncData ({ store, route }) {
    const jobs = [
      fetchCommonData(store),
      fetchPartners(store),
    ]

    if (route.fullPath.match(/\/section\//)) {
      const prefetchPlaylist = Object.values(OATH_PLAYLIST)
        .sort((a, b) => a.order - b.order)
        .slice(0, 2)
        .map(playlist => playlist.id)
      prefetchPlaylist.map(playlistId => {
        jobs.push(fetchPlaylist(store, { id: playlistId }))
        jobs.push(fetchVideoByPlaylist(store, { id: playlistId }))
      })
    } else if (route.fullPath.match(/\/category\//)) {
      const playlistInfo = Object.entries(OATH_PLAYLIST).find(item => item[1].categoryName === route.fullPath.split('/')[2])
      const playlistId = playlistInfo[0]
      jobs.push(fetchPlaylist(store, { id: playlistId }))
      jobs.push(fetchVideoByPlaylist(store, { id: playlistId, params: { max_results: 12 } }))
    } else if (route.fullPath.match(/\/video\//)) {
      jobs.push(fetchVideo(store, { id: route.fullPath.split('/')[2] }))
      jobs.push(fetchVideoByPlaylist(store, { id: OATH_ALL_VIDEO_PLAYLIST_ID, params: { max_results: 8 }}))
    }
    return Promise.all(jobs)
  },
  mixins: [ titleMetaMixin ],
  metaSet () {
    const ogUrl = `${SITE_URL}${this.$route.fullPath}`
    const relUrl = `${SITE_URL}${this.$route.fullPath}`
    const sections = get(this.$store, 'state.commonData.sections.items', []) || []
    const videohub = sections.filter(section => section.name === 'videohub')[0]
    
    let title
    let description = get(this.video, 'description') || get(videohub, 'ogDescription') || get(videohub, 'description')
    let image = get(videohub, 'ogImage') || get(videohub, 'image')
    description = description ? truncate(description, { length: 197 }) : SITE_DESCRIPTION
    image = image ? get(image, 'image.resizedTargets.desktop.url') : SITE_OGIMAGE

    switch (true) {
      case /\/category\//.test(this.$route.fullPath):
        title = get(this.playlist[0], 'name')
        break
      case /\/video\//.test(this.$route.fullPath):
        title = get(this.video, 'name')
        image = get(this.video, 'feedThumbnail.url') || image
        break
      default:
        title = get(videohub, 'ogTitle') || get(videohub, 'title')
    }

    if (!title && process.env.VUE_ENV === 'server') {
      const e = new Error()
      e.massage = 'Page Not Found'
      e.code = '404'
      throw e
    }

    if (this.$route.fullPath.match(/(\/section\/|\/category\/)/)) {
      title = `${title} - ${SITE_TITLE}`
    }

    return {
      url: relUrl,
      title: title,
      meta: `
        <meta name="robots" content="index">
        <meta name="keywords" content="${SITE_KEYWORDS}">
        <meta name="description" content="${description}">
        <meta name="section-name" content="videohub">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${image}">
        <meta property="fb:app_id" content="${FB_APP_ID}">
        <meta property="fb:pages" content="${FB_PAGE_ID}">
        <meta property="og:site_name" content="${SITE_TITLE}">
        <meta property="og:locale" content="zh_TW">
        <meta property="og:type" content="article">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:url" content="${ogUrl}">
        <meta property="og:image" content="${image}">
      ` // <meta name="mm-opt" content="">
    }
  },
  data () {
    return {
      DFP_ID,
      DFP_UNITS,
      OATH_ALL_VIDEO_PLAYLIST_ID,
      OATH_PLAYLIST,
      abIndicator: 'A',
      dfpHeaderLogoLoaded: false,
      mounted: false,
      showDfpCoverAdFlag: false,
      showDfpCoverAd2Flag: false,
      showDfpCoverInnityFlag: false,
      showDfpHeaderLogo: false,
    }
  },
  computed: {
    dfpOptions () {
      const currentInstance = this
      return Object.assign({}, DFP_OPTIONS, {
        afterEachAdLoaded: function (event) {
          const dfpCover = document.querySelector(`#${event.slot.getSlotElementId()}`)
          const position = dfpCover.getAttribute('pos')

          /**
           * Because googletag.pubads().addEventListener('slotRenderEnded', afterEachAdLoaded) can't be removed.
           * We have check if current page gets changed with checking by sessionId to prevent from runnig this outdated callback.
           */
          const elSessionId = dfpCover.getAttribute('sessionId')
          debug('this.sessionId', this.sessionId, elSessionId)
          if (elSessionId !== this.sessionId) { return }

          const adDisplayStatus = dfpCover.currentStyle ? dfpCover.currentStyle.display : window.getComputedStyle(dfpCover, null).display
          const loadInnityAd = () => {
            debug('Event "noad2" is detected!!')
            if (currentInstance.showDfpCoverAd2Flag && !currentInstance.showDfpCoverInnityFlag) {
              sendAdCoverGA('innity')
              debug('noad2 detected and go innity')
              currentInstance.showDfpCoverInnityFlag = true
            }
          }
          window.addEventListener('noad2', loadInnityAd)
          window.parent.addEventListener('noad2', loadInnityAd)

          switch (position) {
            case 'LMBCVR':
              sendAdCoverGA('dfp')
              if (adDisplayStatus === 'none') {
                updateCookie({ currEnv: currentInstance.dfpMode }).then((isVisited) => {
                  currentInstance.showDfpCoverAd2Flag = !isVisited
                })
              } else {
                updateCookie({ currEnv: currentInstance.dfpMode }).then((isVisited) => {
                  currentInstance.showDfpCoverAdFlag = !isVisited
                })
              }
              break
            case 'LMBCVR2':
              sendAdCoverGA('ad2')
              debug({ msg: 'ad2 loaded' })
              if (adDisplayStatus === 'none') {
                debug({ msg: 'dfp response no ad2' })
              }
              break
            case 'LMBCVR3':
                debug('adInnity loaded')
                sendAdCoverGA('innity')
                if (adDisplayStatus === 'none') {
                  debug('dfp response no innity')
                }
                break                   
            case 'LOGO':
              if (adDisplayStatus !== 'none') {
                currentInstance.showDfpHeaderLogo = true
              }
              currentInstance.dfpHeaderLogoLoaded = true
              break
          }
          adtracker({
            el: dfpCover,
            slot: event.slot.getSlotElementId(),
            position,
            isAdEmpty: adDisplayStatus === 'none',
            sessionId: elSessionId
          }) 
        },
        setCentering: true,
        sizeMapping: DFP_SIZE_MAPPING
      })
    },
    eventEmbedded () {
      return get(this.$store, 'state.eventEmbedded.items.0')
    },
    eventLogo () {
      return get(this.$store, 'state.eventLogo.items.0')
    },
    isCategoryPage () {
      return this.$route.fullPath.match(/category/)
    },
    isSingleVideoPage () {
      return this.$route.fullPath.match(/\/video\//)
    },
    isTimeToShowAdCover () {
      return get(this.$store, 'state.isTimeToShowAdCover', false)
    },
    playlist () {
      const playlist = Object.values(this.$store.state.playlist.info) || []
      if (this.isCategoryPage) {
        const category = this.$route.fullPath.split('/')[2]
        const playlistInfo = Object.entries(OATH_PLAYLIST).find(item => item[1].categoryName === category)
        return playlist.filter(item => item.id === playlistInfo[0])
      } else {
        const filtered = playlist.filter(item => this.$store.state.playlist[item.id] && this.$store.state.playlist[item.id].length > 0)
        return filtered.sort((a, b) => OATH_PLAYLIST[a.id].order - OATH_PLAYLIST[b.id].order)
      }
    },
    section () {
      const sections = get(this.$store, 'state.commonData.sections.items') || []
      return sections.filter(section => section.name === 'videohub')[0]
    },
    title () {
      if (this.isCategoryPage) {
        return `${this.playlist[0].name} - ${SITE_TITLE}`
      } else if (this.isSingleVideoPage) {
        return this.video.name
      } else {
        return `${this.section.title} - ${SITE_TITLE}`
      }
    },
    video () {
      if (this.isSingleVideoPage) {
        const id = this.$route.fullPath.split('/')[2]
        return this.$store.state.videos[id]
      }
      return 
    },
    videos () {
      const videos = []
      Object.keys(this.$store.state.playlist)
        .filter(key => key !== 'info')
        .map(key => {
          this.$store.state.playlist[key].map(item => videos.push(item))
        })
      return videos
    },
    viewportWidth () {
      return this.$store.state.viewport.width
    }
  },
  beforeMount () {
    this.abIndicator = this.getMmid()
    const jobs = [ fetchEvent(this.$store, 'embedded'), fetchEvent(this.$store, 'logo') ]
    if (this.$route.fullPath.match(/\/section\//)) {
      fetchFullPlaylist(this.$store, jobs)
    }
    Promise.all(jobs)
  },
  mounted () {
    this.mounted = true
    this.sendGA()
  },
  methods: {
    currEnv,
    get,
    getMmid () {
      const mmid = Cookie.get('mmid')
      let assisgnedRole = get(this.$route, [ 'query', 'ab' ])
      if (assisgnedRole) {
        assisgnedRole = assisgnedRole.toUpperCase()
      }
      const role = getRole({ mmid, distribution: [
        { id: 'A', weight: 50 },
        { id: 'B', weight: 50 } ]
      })
      return assisgnedRole || role
    },
    handleLoadmore ({ id, offset }) {
      fetchVideoByPlaylist(this.$store, { id: id, params: { max_results: 12, offset: offset }})
    },
    sendGA () {
      const categoryLabel = this.$route.fullPath.match(/category/)
        ? Object.entries(OATH_PLAYLIST).find(item => item[0] === this.playlist[0].id)[1].categoryName
        : ``
      window.ga('set', 'contentGroup1', this.section.name)
      window.ga('set', 'contentGroup2', categoryLabel)
      window.ga('set', 'contentGroup3', `list${this.abIndicator}`)
      window.ga('send', 'pageview', { title: this.title, location: document.location.href })
    }
  }
}
</script>
<style lang="stylus" scoped>
.dfp
  display inline-block
  width 100%
  margin 20px auto

.btn--more
  display flex
  align-items center
  padding 0
  margin 10px 0 0 auto
  color #064f77
  font-size .75rem
  font-weight 600
  background-color transparent
  border none
  img
    height 1em
    margin-left 5px
</style>
