<template>
  <header :class="[{ scrolled: isScrolled }, 'header']">
    <section class="header__logo-layer">
      <button class="btn--menu" @click="openSidebar = true"><img src="/assets/mirrormedia/icon/hamburger@2x.png" alt="" @click="sendGaClickEvent('header', 'menu open')"></button>
      <!-- logo -->
      <router-link v-show="!isScrolled" :to="'/'" class="logo" @click.native="sendGaClickEvent('header', 'logo')"><img src="/assets/mirrormedia/logo.svg" :alt="SITE_TITLE"></router-link>
      <router-link v-show="isScrolled" :to="'/'" class="logo" @click.native="sendGaClickEvent('header', 'logo')"><img src="/assets/mirrormedia/icon/logo@2x.png" :alt="SITE_TITLE"></router-link>
      <a v-if="logoFromEvent" v-show="!isScrolled && !showDfpHeaderLogo && dfpHeaderLogoLoaded" :href="get(logoFromEvent, 'link', '/')" class="logo event" target="_blank" @click.native="sendGaClickEvent('header', 'logo event')">
        <LazyImage :src="get(logoFromEvent, 'image.image.resizedTargets.mobile.url')" />
      </a>
      <div class="logo dfp">
        <vue-dfp :is="props.vueDfp" v-if="props" v-show="!isScrolled" ref="logoDfp" :config="props.config" :dfpId="props.dfpId" :dfpUnits="props.dfpUnits" :section="props.section" pos="LOGO" @click.native="sendGaClickEvent('header', 'logo dfp')" />
      </div>
      <!-- search and more -->
      <div :class="{ open: openMore }" class="more" v-click-outside="handleClickMoreOutside">
        <button class="btn--more" @click="openMore = true"><img src="/assets/mirrormedia/icon/more_grey@2x.png" alt="" @click="sendGaClickEvent('header', 'more open')"></button>
        <div class="others">
          <a :href="SOCIAL_LINK.SUBSCRIBE" target="_blank" @click="sendGaClickEvent('header', 'more subscribe')" v-text="$t('HEADER.SUBSCRIBE')"></a>
          <a :href="SOCIAL_LINK.MAGAZINE" target="_blank" @click="sendGaClickEvent('header', 'more magazine')" v-text="$t('HEADER.MAGAZINE')"></a>
          <a :href="SOCIAL_LINK.AUTH" target="_blank" @click="sendGaClickEvent('header', 'more auth')" v-text="$t('HEADER.AUTH')"></a>
          <a :href="SOCIAL_LINK.AD" target="_blank" @click="sendGaClickEvent('header', 'more ad')" v-text="$t('HEADER.AD')"></a>
          <a href="/category/campaign" target="_blank" @click="sendGaClickEvent('header', 'more campaign')" v-text="$t('HEADER.CAMPAIGN')"></a>
          <a :href="SOCIAL_LINK.DOWNLOADAPP" target="_blank" @click="sendGaClickEvent('header', 'more download')" v-text="$t('HEADER.DOWNLOADAPP')"></a>
        </div>     
      </div>
      <SearchNav
        :sections="sections"
        :isScrolled="isScrolled"
        class="search-nav"
      />
      <ShareLight class="share"/>
    </section>
    <!-- scrollable header -->
    <section v-if="mounted" class="header__section-layer">
      <div>
        <router-link
          :class="{ active: activeSection === 'home' }"
          to="/"
          @click.native="sendGaClickEvent('header', 'section home out')">首頁
        </router-link>
        <template v-for="section in activeSections">
          <a
            v-if="section.name === 'videohub'"
            :key="`section-layer-${section.id}`"
            :class="{ active: activeSection === section.name }"
            href="/section/videohub"
            @click="sendGaClickEvent('header', 'section videohub out')"
            v-text="section.title">
          </a>
          <router-link
            v-else
            :key="`section-layer-${section.id}`"
            :class="{ active: activeSection === section.name }"
            :to="`/section/${section.name}`"
            @click.native="sendGaClickEvent('header', `section ${section.name} out`)"
            v-text="section.title">
          </router-link>
        </template>
      </div>
    </section>
    <HeaderSidebar :class="{ open: openSidebar }" :partners="partners" :sections="sections" :topics="topics" class="header__sidebar" @closeSidebar="openSidebar = false" />
  </header>
</template>
<script>
import HeaderSearchBar from 'src/components/header/HeaderSearchBar.vue'
import HeaderSidebar from 'src/components/header/HeaderSidebar.vue'
import LazyImage from 'src/components/common/LazyImage.vue'
import LazyItemWrapper from 'src/components/common/LazyItemWrapper.vue'
import ShareLight from 'src/components/share/ShareLight.vue'
import SearchNav from '../components/searchNav/SearchNav.vue'
import { SECTION_MAP, SITE_TITLE, SOCIAL_LINK } from 'src/constants/index'
import { get, } from 'lodash'
import { sendGaClickEvent } from 'src/util/comm'

export default {
  naem: 'AppHeader',
  components: {
    HeaderSearchBar,
    HeaderSidebar,
    LazyImage,
    LazyItemWrapper,
    ShareLight,
    SearchNav
  },
  directives: {
    'click-outside': {
      bind (el, binding, vnode) {
        el.clickOutsideEvent = function (event) {
          if (!(el == event.target || el.contains(event.target))) {
            vnode.context[binding.expression](event)
          }
        }
        document.body.addEventListener('click', el.clickOutsideEvent)
      },
      unbind (el) {
        document.body.removeEventListener('click', el.clickOutsideEvent)
      }
    }
  },
  props: {
    activeSection: {
      type: String
    },
    dfpHeaderLogoLoaded: {
      type: Boolean
    },
    props: {
      type: Object
    },
    showDfpHeaderLogo: {
      type: Boolean
    }
  },
  data () {
    return {
      SITE_TITLE,
      SOCIAL_LINK,
      // hasLogoDfp: false,
      isScrolled: false,
      keyword: '',
      mounted: false,
      openMore: false,
      openSearchBar: false,
      openSidebar: false
    }
  },
  computed: {
    activeSections () {
      return this.sections.filter(section => section.isFeatured && section.id && section.name)
    },
    isMobile () {
      return this.$store.state.viewport.width < 1200
    },
    logoFromEvent () {
      if (new Date() >= new Date(get(this.$store, 'state.eventLogo.items.0.startDate'))
        && new Date() < new Date(get(this.$store, 'state.eventLogo.items.0.endDate'))) {
          return get(this.$store, 'state.eventLogo.items.0')
      }
      return undefined
    },
    partners () {
      return get(this.$store, 'state.commonData.partners.items') || []
    },
    sections () {
      const sections = get(this.$store, 'state.commonData.sections.items') || []
      return sections.filter(section => section.isFeatured).sort((a, b) => a.sortOrder - b.sortOrder)
    },
    topics () {
      const topics = get(this.$store, 'state.commonData.topics.items') || []
      return topics.filter(topic => topic.isFeatured).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 7)
    }
  },
  beforeMount () {
    window.addEventListener('scroll', this.handleScroll)
  },
  mounted () {
    this.mounted = true
    // const logoDfp = document.querySelector('.logo.dfp')
    // if (logoDfp) {
    //   const logoDfpDisplay = logoDfp.style.display || window.getComputedStyle(logoDfp , null ).display
    //   logoDfpDisplay === 'none' ? this.hasLogoDfp = false : this.hasLogoDfp = true
    // }
  },
  beforeDestroy () {
    window.removeEventListener('scroll', this.handleScroll)
  },
  watch: {
    '$route.fullPath' () {
      this.openSidebar = false
      this.openSearchBar = false
    }
  },
  methods: {
    get,
    getColor (section) {
      return get(SECTION_MAP, [ section.id, 'bgcolor' ]) 
    },
    handleScroll () {
      const top = window.pageYOffset || document.documentElement.scrollTop
      top > 90 ? this.isScrolled = true : this.isScrolled = false
    },
    handleSearchBtn () {
      if (this.isMobile) {
        this.openSearchBar = true
      } else {
        this.search(this.keyword)
      }
    },
    handleClickMoreOutside () {
      this.openMore = false
    },
    search (keyword) {
      if (keyword) {
        this.openSearchBar = false
        this.$router.push(`/search/${keyword.replace(/\s+/g, ',')}`)
      }
    },
    sendGaClickEvent
  }
}
</script>
<style lang="stylus" scoped>

.header
  position relative
  &__logo-layer
    display flex
    align-items center
    height 90px
    padding 0 5%
    background-color #f5f5f5
    clear both // IE
    button
      padding 0 8px // IE
      padding 0 .5em
      background-color transparent
      border 0
      &:first-child
        margin 0 auto 0 0
      &:last-child
        margin 0 0 0 auto
      img
        width 100%
        height 100%
        object-fit contain
        object-position center center
    .btn--menu
      order 0
      width 40px
      height 40px
    .logo
      order 1
      display inline-block
      width 95px
      height 50px
      overflow hidden
      & + .logo
        margin-left 5px
      &.dfp
        .ad-container
          margin-top 0
      img
        width 100%
        height 100%
        object-fit contain
        object-position center center
    .search
      order 2
      display none
      float right // IE
    .btn--search
      order 3
      position relative
      top 3.5px
      width 45px
      height 45px
      margin 0 0 0 auto
      float right // IE
    .more
      order 4
      display none
      float right // IE
      .others
        display none
    .btn--more
      display none
    .share
      display none
  &__section-layer
    width 100%
    display flex
    height 28px
    background-color #f5f5f5
    overflow hidden
    white-space nowrap
    box-shadow 0px 2px 1px rgba(0,0,0,.2)
    > div
      display flex
      height 48px
      margin 0 auto
      overflow-x auto
      &::-webkit-scrollbar
        display none
    a
      position relative
      display block
      padding .5em .8em calc(20px + .4em)
      color #808080
      font-size .875rem
      &::after
        content ''
        position absolute
        left .8em
        bottom 20px
        width calc(100% - 1.6em)
        height 3px
      &.active
        color #34495e
        &::after
          background-color #34495e

  &__sidebar
    transform translateX(-100%)
    transition transform .5s ease
    &.open
      transform translateX(0)
  &__search-bar
    transform translateY(-100%)
    transition transform .5s ease
    &.open
      transform translateY(0)

.search-nav
  order 1
  margin 0 0 0 auto

@media (max-width: 1199px)
  .header.scrolled
    height 90px
    .header__logo-layer
      position fixed
      top 0
      left 0
      right 0
      z-index 501
      height 50px
      padding 0 2em
      background-color #f5f5f5
      button
        padding 0
      .logo
        width 30px
        height 30px
        margin 0 auto 0 10px
        &.dfp, &.event
          display none
      .share
        order 4
        display flex
        margin-left 20px
        >>> button
          width 30px
          height 30px
      .btn--menu
        width 30px
        height 30px
        margin 0
      .btn--search
        top 0
        width 30px
        height 30px
        margin 0
    .header__section-layer
      position fixed
      top 50px
      z-index 500

@media (max-width: 599px)
  .header.scrolled
    .header__logo-layer
      padding 0 5%
  
</style>
