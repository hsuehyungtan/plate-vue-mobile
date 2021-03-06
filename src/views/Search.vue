<template>
  <vue-dfp-provider :dfpUnits="dfpUnits" :dfpid="dfpid" :section="'other'" :options="dfpOptions" :mode="dfpMode">
    <template slot-scope="props" slot="dfpPos">
      <div class="search-view">
        <section style="width: 100%;">
          <HeaderR :abIndicator="abIndicator" :dfpHeaderLogoLoaded="dfpHeaderLogoLoaded" :props="props" :showDfpHeaderLogo="showDfpHeaderLogo" />
        </section>
        <div class="search-title container">
          <span class="search-title__text" v-text="title"></span>
          <div class="search-title__colorBlock"></div>
        </div>
        <article-list :articles='articles' />
        <loading :show="loading" />
        <section class="container">
          <more v-if="hasMore" v-on:loadMore="loadMore" />
        </section>
        <section class="footer container">
          <app-footer />
        </section>
      </div>
      <LazyItemWrapper :loadAfterPageLoaded="true">
        <DfpST :props="props">
          <vue-dfp :is="props.vueDfp" :config="props.config" pos="MBST" slot="dfpST" :size="get($store, 'getters.adSize')" />
        </DfpST>
      </LazyItemWrapper>           
    </template>
  </vue-dfp-provider>
</template>

<script>

import { DFP_ID, DFP_UNITS, DFP_OPTIONS, DFP_SIZE_MAPPING } from '../constants'
import { FB_APP_ID, FB_PAGE_ID } from '../constants'
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_OGIMAGE, SITE_TITLE, SITE_URL } from '../constants'
import { adtracker } from 'src/util/adtracking'
import { currEnv, unLockJS } from '../util/comm'
import { get } from 'lodash'
import { getRole } from '../util/mmABRoleAssign'
import ArticleList from '../components/ArticleList.vue'
import Cookie from 'vue-cookie'
import Footer from '../components/Footer.vue'
import Header from '../components/Header.vue'
import HeaderR from '../components/HeaderR.vue'
import DfpST from '../components/DfpST.vue'
import LazyItemWrapper from 'src/components/common/LazyItemWrapper.vue'
import Loading from '../components/Loading.vue'
import More from '../components/More.vue'
import VueDfpProvider from 'plate-vue-dfp/DfpProvider.vue'
import titleMetaMixin from '../util/mixinTitleMeta'

const MAXRESULT = 12
const PAGE = 1

const fetchCommonData = (store) => {
  return store.dispatch('FETCH_COMMONDATA', { 'endpoints': [ 'sections', 'topics' ] })
}

const fetchSearch = (store, params) => store.dispatch('FETCH_SEARCH', { params, })

const fetchData = (store, route) => {
  return Promise.all([
    fetchCommonData(store),
    fetchSearch(store, {
      page: PAGE,
      max_results: MAXRESULT,
      keyword: route.params.keyword,
      where: {
        section: route.query.section,
        category: route.query.category
      }
    }),
    fetchPartners(store)
  ])
}

const fetchEvent = (store, eventType = 'embedded') => {
  return store.dispatch('FETCH_EVENT', {
    params: {
      'max_results': 1,
      'where': {
        isFeatured: true,
        eventType: eventType
      }
    }
  })
}

const fetchPartners = (store) => {
  const page = get(store, 'state.partners.meta.page', 0) + 1
  return store.dispatch('FETCH_PARTNERS', {
    params: {
      max_results: 25,
      page: page
    }
  }).then(() => {
    if (get(store.state, 'partners.items.length') < get(store, 'state.partners.meta.total')) {
      fetchPartners(store)
    }
  })
}

export default {
  name: 'search-view',
  components: {
    'app-footer': Footer,
    'app-header': Header,
    'article-list': ArticleList,
    'loading': Loading,
    'more': More,
    'vue-dfp-provider': VueDfpProvider,
    DfpST,
    LazyItemWrapper,
    HeaderR
  },
  asyncData ({ store, route }) {
    return fetchData(store, route)
  },
  mixins: [ titleMetaMixin ],
  metaSet () {
    const title = (this.title) ? `${this.title} - ${SITE_TITLE}` : SITE_TITLE
    const ogUrl = `${SITE_URL}${this.$route.fullPath}`
    const relUrl = `${SITE_URL}${this.$route.fullPath}`
    return {
      url: relUrl,
      title: title,
      meta: `
        <meta name="robots" content="index">
        <meta name="keywords" content="${SITE_KEYWORDS}">
        <meta name="description" content="${SITE_DESCRIPTION}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${SITE_DESCRIPTION}">
        <meta name="twitter:image" content="${SITE_OGIMAGE}">
        <meta property="fb:app_id" content="${FB_APP_ID}">
        <meta property="fb:pages" content="${FB_PAGE_ID}">
        <meta property="og:site_name" content="${SITE_TITLE}">
        <meta property="og:locale" content="zh_TW">
        <meta property="og:type" content="article">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${SITE_DESCRIPTION}">
        <meta property="og:url" content="${ogUrl}">
        <meta property="og:image" content="${SITE_OGIMAGE}">
      ` // <meta name="mm-opt" content="">
    }
  },
  data () {
    return {
      abIndicator: 'A',
      commonData: this.$store.state.commonData,
      dfpid: DFP_ID,
      dfpHeaderLogoLoaded: false,
      dfpMode: 'prod',
      dfpUnits: DFP_UNITS,
      isVponSDKLoaded: false,
      loading: false,
      page: PAGE,
      showDfpCoverAdFlag: false,
      showDfpCoverAd2Flag: false,
      showDfpCoverAdVponFlag: false,
      showDfpHeaderLogo: false,
      viewport: undefined
    }
  },
  computed: {
    articles () {
      return get(this.$store, 'getters.searchResultNormalized', [])
    },
    eventLogo () {
      return get(this.$store.state.eventLogo, 'items.0')
    },
    hasMore () {
      return get(this.articles, 'length', 0) < get(this.$store, 'getters.searchResultTotalCount', 0)
    },
    title () {
      return this.$route.params.keyword
    },
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
          if (elSessionId !== this.sessionId) { return }

          const adDisplayStatus = dfpCover.currentStyle ? dfpCover.currentStyle.display : window.getComputedStyle(dfpCover, null).display

          switch (position) {
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
    }
  },
  methods: {
    get,
    checkIfLockJS () {
      unLockJS()
    },
    getMmid () {
      const mmid = Cookie.get('mmid')
      let assisgnedRole = get(this.$route, 'query.ab')
      if (assisgnedRole) {
        assisgnedRole = assisgnedRole.toUpperCase()
      }
      const role = getRole({ mmid, distribution: [
        { id: 'A', weight: 50 },
        { id: 'B', weight: 50 } ]
      })
      return assisgnedRole || role
    },
    loadMore () {
      this.page += 1
      this.loading = true
      fetchSearch(this.$store, {
        page: this.page,
        max_results: MAXRESULT,
        keyword: this.$route.params.keyword,
        where: {
          section: this.$route.query.section,
          category: this.$route.query.category
        }
      }).then(() => {
        this.loading = false
      })
    },
    updateViewport () {
      if (process.env.VUE_ENV === 'client') {
        this.viewport = document.querySelector('body').offsetWidth
      }
    },
    updateSysStage () {
      this.dfpMode = currEnv()
    }
  },
  beforeMount () {
    fetchEvent(this.$store, 'logo') 
  },
  mounted () {
    this.checkIfLockJS()
    this.updateViewport()
    window.addEventListener('resize', () => {
      this.updateViewport()
    })
    this.updateSysStage()
    this.abIndicator = this.getMmid()
    window.ga('set', 'contentGroup1', '')
    window.ga('set', 'contentGroup2', '')
    // window.ga('set', 'contentGroup3', '')
    window.ga('set', 'contentGroup3', `list${this.abIndicator}`)
    window.ga('send', 'pageview', { title: `${this.title} - ${SITE_TITLE}`, location: document.location.href })
  },
  updated () {
    this.updateSysStage()
  },
  watch: {
    title: function () {
      if (process.env.VUE_ENV === 'client') {
        window.ga('send', 'pageview', { title: `${this.title} - ${SITE_TITLE}`, location: document.location.href })
        this.$forceUpdate()
      }
    }
  }
}
</script>

<style lang="stylus" scoped>

.search
  &-title
    &.container
      position: relative
      align-items: center
      flex-direction row
      margin-top 40px
      padding 0 2em
    &__text
        font-size 3rem
    &__colorBlock
      flex-grow 1
      height 10px
      margin-left: 10px
      background linear-gradient(to right, #bcbcbc 0%, rgba(242, 242, 242, 1) 70%, rgba(242, 242, 242, 1) 100%)

@media (min-width: 600px)
  .search
    &-title
      &.container
        padding-left 10px
</style>
