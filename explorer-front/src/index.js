import VueTranslate from 'vue-translate-plugin';
import { EventBus } from './events.js';
import { jsonStrings } from './l10nstrings.js';

var api = require("@/assets/api");
var appConfig = require("@/assets/app-config");

var Vue = require("vue").default,
	VueRouter = require("vue-router").default,
	vApp = {},
	vAppConfig = require("@/assets/app-config"),
	vRouter = new VueRouter({ routes: require("@/assets/routes") }),
	gaPage = require('vue-analytics').page;

// Expose jQuery to the global object
const jQuery = require('jquery');
window.jQuery = window.$ = jQuery;

require("bootstrap");
require("bootstrap/dist/css/bootstrap.min.css");
require("font-awesome/css/font-awesome.min.css");
require("./index.css");

Vue.use(VueTranslate);

function isIE() {
	if (!!window.ActiveXObject || "ActiveXObject" in window)
		return true;
	else
		return false;
}
window.isIE = isIE;

const isProd = process.env.NODE_ENV === 'production';
const VueAnalytics = require('vue-analytics').default;
Vue.use(VueAnalytics, {
	id: 'UA-101203737-4',
	customResourceURL: 'https://www.google-analytics.com/analytics.js',
	debug: {
		enabled: !isProd,
		sendHitTask: isProd
	}
});

Vue.config.productionTip = false;
Vue.use(VueRouter);
vRouter.beforeEach(onBeforeEach);
vRouter.afterEach(onAfterEach);

Number.prototype.pad = function (size) {
	var s = String(this);
	while (s.length < (size || 2)) { s = "0" + s; }
	return s;
}

String.prototype.shortAmount = function () {
	let dot_index = this.indexOf('.');
	if (dot_index === -1) return this + '.0000';
	if (this.length - 1 - dot_index > 4) {
		return this.slice(0, dot_index + 4 + 1);
	} else if (this.length - 1 - dot_index < 4) {
		return this.padEnd(5 + dot_index, '0');
	}
	return this;
}

String.prototype.padDecimal = function () {
	let dot_index = this.indexOf('.');
	if (dot_index === -1) return this + '.0000';
	if (this.length - 1 - dot_index > 4) {
		return this;
	} else if (this.length - 1 - dot_index < 4) {
		return this.padEnd(5 + dot_index, '0');
	}
	return this;
}

String.prototype.shortHash = function () {
	if (this.length > 12) {
		return this.slice(0, 6) + '...' + this.slice(-6);
	}
	return this;
}

Date.prototype.getWeekNumber = function () {
	var d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
	var dayNum = d.getUTCDay() || 7;
	d.setUTCDate(d.getUTCDate() + 4 - dayNum);
	var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
};

vApp = new Vue({
	components: {
		//"vue-popmsg": require("@/components/vue-popmsg").default,
		"vue-footer": require("@/components/vue-footer").default,
		"vue-header": require("@/components/vue-header").default,
		"vue-modal": require("@/components/vue-modal").default
	},
	data: {
		timestamp: Date.now(),
		showModalLoading: false,
		showAtpAds: true,
		mainnetDipStarted: true,
		mainnetGotDipWinners: true,
		testnetDipStarted: true,
		testnetGotDipWinners: true
	},
	el: ".vue",
	router: vRouter

});

Vue.prototype.$selectedLanguage = "en_US";

setInterval(() => {
	vApp.timestamp = Date.now();
}, 1000);

////////////////////////////////////////////////////////////
//
// API PREFIX
//
////////////////////////////////////////////////////////////

function onBeforeEach(to, from, next) {
	window.scrollTo(0, 0);

	vApp.showModalLoading = false;

	var apiPrefix, first, path;

	for (first in vAppConfig.apiPrefixes) break;

	if (to.name == "*") {
		path = (from.params.api ? "/" + from.params.api : "") + "/404";
	}
	else if (to.params.api) {
		if (to.params.api in vAppConfig.apiPrefixes) {
			if (to.params.api == first) {
				// mainnet/xxx -> /xxx
				to.params.api = undefined;
				path = vRouter.resolve({ params: to.params }, to).resolved.fullPath;
			}
			else {
				apiPrefix = vAppConfig.apiPrefixes[to.params.api].url;
			}
		}
		else {
			path = (from.params.api ? "/" + from.params.api : "") + "/404";
		}
	}
	else {
		apiPrefix = vAppConfig.apiPrefixes[first].url;
	}

	sessionStorage.apiPrefix = apiPrefix;
	next(path);
}

function onAfterEach(to, from) {
	if (to.meta && to.meta.uaview) {
		gaPage(to.meta.uaview);
	}
}

// Localization bar
var myComp = Vue.extend({
	template:	`<div>
						<a class="nav-link" href=# id=language-selector role=button data-toggle=dropdown aria-haspopup=true aria-expanded=false>
							{{ t('Languages') }}
							<img src=/static/img/icon_arrow_down.png width=12 alt="">
						</a>
						<div class=dropdown-menu aria-labelledby=language-selector>
							<div>
								<a href="#" class="dropdown-item" v-on:click.prevent=translateToEnglish()><img src=/static/img/icon-engflag.png width=12 alt=""> {{ t('English') }}</a>
								<a href="#" class="dropdown-item" v-on:click.prevent=translateToSpanish()><img src=/static/img/icon-espflag.png width=12 alt=""> {{ t('Spanish') }}</a>
							</div>
						</div>
					</div>`,
	locales: {
		es_ES: {
			'Languages': 'Idiomas',
			'English': 'Inglés',
			'Spanish': 'Español'
		},
		en_US: {
			'Languages': 'Languages',
			'English': 'English',
			'Spanish': 'Spanish'
		}
	},
	methods: {
		translateToSpanish() {
			Vue.prototype.$selectedLanguage = "es_ES";
			this.$translate.setLang(Vue.prototype.$selectedLanguage);
			EventBus.$emit('changeLanguage');

		},
		translateToEnglish() {
			Vue.prototype.$selectedLanguage = "en_US";
			this.$translate.setLang(Vue.prototype.$selectedLanguage);
			EventBus.$emit('changeLanguage');
		},
		initializeApp() {
			EventBus.$emit('changeLanguage');
			clearInterval(this.longIntervalID);
		}
	},
	mounted() {
		this.longIntervalID = setInterval(() => {
			this.initializeApp();
		}, 1500);
	}
});

var header0 = new Vue({
	el: '#lang-sel',
	components: {myComp},
	template: `<div><my-comp></my-comp></div>`
});