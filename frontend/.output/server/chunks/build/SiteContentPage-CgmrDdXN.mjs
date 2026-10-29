globalThis.__timing__.logStart('Load chunks/build/SiteContentPage-CgmrDdXN');import { c as useRoute, q as useStorefrontPanels, x as useStorefrontContent, N as NuxtLink, y as siteContentPhoneHref, z as safeSiteContentUrl, A as useHomeLocale, u as useHead, k as storefrontProductImage, f as useRuntimeConfig, B as defaultBusinessPreview } from '../virtual/entry.mjs';
import { _ as _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default, u as useFetch } from './fetch-Bp2XUQ0E.mjs';
import { _ as _virtual_public__2Fsarkisian_logo_default } from './_virtual_public-Bnta_Oua.mjs';
import { defineComponent, computed, withAsyncContext, mergeProps, unref, withCtx, createTextVNode, createVNode, toDisplayString, resolveDynamicComponent, watch, reactive, ref, nextTick, useId, useSSRContext } from 'vue';
import { p as publicAssetsURL } from '../routes/renderer.mjs';
import { ssrRenderComponent, ssrRenderAttrs, ssrInterpolate, ssrRenderAttr, ssrRenderList, ssrRenderClass, ssrRenderVNode, ssrIncludeBooleanAttr, ssrLooseContain, ssrRenderStyle, ssrRenderDynamicAttr } from 'vue/server-renderer';
import { ArrowRight, UserRound, Phone, Mail, CalendarDays, Check, Link2, ShoppingBag, Users, ArrowDown, Gift, Wallet, Building2, ArrowUpRight, ShieldCheck, ChartNoAxesCombined, Link, Truck, Package, Music2, ChevronLeft, ChevronRight, PenLine, Heart, ThumbsUp, Signal, Wifi, X, RotateCcw, Zap, Sparkles, Play, Pause, Coffee, Minus, Plus } from '@lucide/vue';

// components/storefront/SiteAboutPage.vue?vue&type=script&setup=true&lang.ts
var SiteAboutPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteAboutPage",
	__ssrInlineRender: true,
	props: { page: {} },
	setup(__props) {
		const props = __props;
		const { content, storefrontMediaUrl } = useStorefrontContent();
		const { t, english } = useHomeLocale();
		useHead(() => ({ htmlAttrs: { lang: english.value ? "en" : "ru" } }));
		const biography = computed(() => props.page.blocks?.find((block) => block.kind === "biography"));
		const founderCopy = computed(() => String(biography.value?.body || props.page.lead || "").split(/\n+/).filter(Boolean));
		const founderName = computed(() => {
			const words = String(biography.value?.title || "Светлана Саркисян").trim().split(/\s+/);
			return [words.shift(), words.join(" ")];
		});
		const portrait = computed(() => {
			const custom = biography.value?.images?.[0];
			return custom && custom !== "/storefront/svetlana-portrait.png" && safeSiteContentUrl(custom, true) ? storefrontMediaUrl(custom) : "/storefront/home/svetlana-hero.png";
		});
		const networks = [
			{
				key: "vk",
				label: "ВКонтакте"
			},
			{
				key: "telegram",
				label: "Telegram"
			},
			{
				key: "instagram",
				label: "Instagram"
			},
			{
				key: "youtube",
				label: "YouTube"
			},
			{
				key: "tiktok",
				label: "TikTok"
			}
		];
		const founderSocials = computed(() => networks.map((network) => ({
			...network,
			url: biography.value?.socials?.[network.key]
		})).filter((network) => network.url && /^https:\/\//i.test(network.url) && safeSiteContentUrl(network.url)));
		const brandSocials = computed(() => content.value.socialLinks.filter((social) => social.isActive !== false && /^https:\/\//i.test(social.url) && safeSiteContentUrl(social.url)));
		const blocks = computed(() => (props.page.blocks || []).filter((block) => block.kind !== "biography"));
		const paragraphs = (body) => String(body || "").split(/\n+/).filter(Boolean);
		const introTitle = computed(() => String(props.page.title || "").split(/(?<=\.)\s+/).map((part) => part.replace(/\.$/, "")));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sa-page" }, _attrs))}><header class="sa-hero sh-container"><h1><span class="sb-visually-hidden">${ssrInterpolate(unref(t)("О бренде"))} SARKISIAN</span><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fhome_2Fhero_wordmark_default)} alt="" width="1412" height="196" fetchpriority="high"></h1><div class="sa-hero-copy"><p>${ssrInterpolate(unref(t)("Премиальный бренд для мастеров маникюра, который понимает профессию изнутри."))}<br>${ssrInterpolate(unref(t)("Материалы, которые помогают работать быстрее и увереннее"))}</p><span>${ssrInterpolate(unref(t)("От мастера — к мастерам"))}</span></div></header><section class="sa-intro sh-container" aria-labelledby="about-intro-title"><div class="sa-intro-media sh-media-placeholder" aria-hidden="true"></div><div class="sa-intro-copy"><h2 id="about-intro-title"><!--[-->`);
			ssrRenderList(unref(introTitle), (part) => {
				_push(`<span>${ssrInterpolate(unref(t)(part))}</span>`);
			});
			_push(`<!--]--></h2><div><p>${ssrInterpolate(unref(t)(__props.page.lead))}</p><p>${ssrInterpolate(unref(t)(__props.page.lead))}</p></div></div><p class="sa-section-label" aria-hidden="true">${ssrInterpolate(unref(t)(__props.page.eyebrow || "О бренде"))}</p></section><section class="sa-founder sh-container" aria-labelledby="about-founder-title"><div class="sa-founder-stage"><h2 id="about-founder-title"><span>${ssrInterpolate(unref(t)(unref(founderName)[0] || ""))}</span><span>${ssrInterpolate(unref(t)(unref(founderName)[1]))}</span></h2><img class="sa-founder-portrait"${ssrRenderAttr("src", unref(portrait))}${ssrRenderAttr("alt", unref(biography)?.title || "Светлана Саркисян")} width="853" height="1280" loading="lazy"><span class="sa-role sa-role-founder">${ssrInterpolate(unref(t)("Основательница"))}</span><span class="sa-role sa-role-blogger">${ssrInterpolate(unref(t)("Блогер"))}</span><span class="sa-role sa-role-master">${ssrInterpolate(unref(t)("Мастер маникюра"))}</span><p class="sa-founder-copy sa-founder-copy-left">${ssrInterpolate(unref(t)(unref(founderCopy)[0] || __props.page.lead))}</p><div class="sa-founder-copy sa-founder-copy-right"><!--[-->`);
			ssrRenderList(unref(founderCopy).slice(2), (paragraph, index) => {
				_push(`<p>${ssrInterpolate(unref(t)(paragraph))}</p>`);
			});
			_push(`<!--]--></div><p class="sa-founder-summary">${ssrInterpolate(unref(t)(unref(founderCopy)[1] || __props.page.lead))}</p></div><div class="sa-founder-footer">`);
			if (unref(founderSocials).length) {
				_push(`<nav class="sa-founder-socials" aria-label="Личные соцсети Светланы Саркисян"><!--[-->`);
				ssrRenderList(unref(founderSocials), (social) => {
					_push(`<a${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer">${ssrInterpolate(social.label)}<span class="sb-visually-hidden"> — ${ssrInterpolate(unref(biography)?.title || "Светлана Саркисян")}</span></a>`);
				});
				_push(`<!--]--></nav>`);
			} else _push(`<!---->`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/catalog",
				class: "sb-design-button"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`${ssrInterpolate(unref(t)("Заказать"))}`);
					else return [createTextVNode(toDisplayString(unref(t)("Заказать")), 1)];
				}),
				_: 1
			}, _parent));
			_push(`</div></section>`);
			if (unref(brandSocials).length) {
				_push(`<nav id="brand-socials" class="sa-brand-socials sh-container"${ssrRenderAttr("aria-label", unref(t)("Соцсети бренда"))}><!--[-->`);
				ssrRenderList(unref(brandSocials), (social) => {
					_push(`<a${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer"><span aria-hidden="true">+</span>${ssrInterpolate(social.name)}</a>`);
				});
				_push(`<!--]--><span aria-hidden="true">+</span></nav>`);
			} else _push(`<!---->`);
			_push(`<div class="sa-values sh-container"><!--[-->`);
			ssrRenderList(unref(blocks), (block) => {
				_push(`<section${ssrRenderAttr("id", block.id)} class="sa-value"><h2>${ssrInterpolate(unref(t)(block.title))}</h2><!--[-->`);
				ssrRenderList(paragraphs(block.body), (paragraph, index) => {
					_push(`<p>${ssrInterpolate(unref(t)(paragraph))}</p>`);
				});
				_push(`<!--]-->`);
				if (block.buttonLabel && unref(safeSiteContentUrl)(block.buttonUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
					to: block.buttonUrl,
					class: "sb-design-button"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${ssrInterpolate(unref(t)(block.buttonLabel))}`);
						else return [createTextVNode(toDisplayString(unref(t)(block.buttonLabel)), 1)];
					}),
					_: 2
				}, _parent));
				else _push(`<!---->`);
				_push(`</section>`);
			});
			_push(`<!--]-->`);
			if (unref(brandSocials).length) _push(`<a class="sa-socials-button sb-design-button" href="#brand-socials">${ssrInterpolate(unref(t)("Соцсети"))}</a>`);
			else _push(`<!---->`);
			_push(`</div></article>`);
		};
	}
});
// components/storefront/SiteAboutPage.vue
var _sfc_setup$14 = SiteAboutPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteAboutPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteAboutPage.vue");
	return _sfc_setup$14 ? _sfc_setup$14(props, ctx) : void 0;
};
var SiteAboutPage_default = Object.assign(SiteAboutPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteAboutPage" });
// components/storefront/SiteClubHub.vue?vue&type=script&setup=true&lang.ts
var SiteClubHub_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteClubHub",
	__ssrInlineRender: true,
	props: { page: {} },
	setup(__props) {
		const { siteContent } = useStorefrontContent();
		useStorefrontPanels();
		const props = __props;
		const pageBlocks = computed(() => Object.fromEntries((props.page?.blocks || []).map((block) => [block.id, block])));
		const paragraphs = (body) => String(body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
		const heroTitle = computed(() => {
			const parts = String(props.page?.title || "Один клуб. Выберите свой формат.").split(/(?<=\.)\s+/);
			return {
				main: parts[0],
				accent: parts.slice(1).join(" ")
			};
		});
		const contentBlock = (id) => pageBlocks.value[id];
		const fromPage = (id, fallback) => {
			const block = contentBlock(id);
			if (!block) return fallback;
			const lines = paragraphs(block.body);
			return {
				...fallback,
				title: block.title || fallback.title,
				body: lines[0] || fallback.body,
				benefits: lines.slice(1, 4),
				url: block.buttonUrl || fallback.url,
				label: block.buttonLabel || fallback.label
			};
		};
		const directions = computed(() => {
			const home = siteContent.value.home;
			return [
				fromPage("buyers", {
					key: "b2c",
					eyebrow: "ДЛЯ МАСТЕРОВ И ПОКУПАТЕЛЕЙ",
					title: home.club.title,
					accent: home.club.accent,
					body: "Покупайте материалы для работы, получайте бонусы и храните всю историю участия в одном личном кабинете.",
					benefits: home.club.benefits.map((item) => item.text).slice(0, 3),
					url: "/club/referrals",
					label: "Как работает клуб",
					icon: Gift,
					tone: "light"
				}),
				fromPage("business", {
					key: "b2b",
					eyebrow: "ДЛЯ САЛОНОВ И БИЗНЕСА",
					title: home.business.title,
					accent: home.business.accent,
					body: home.business.body,
					benefits: home.business.visualLines.slice(0, 3),
					url: "/business",
					label: "Решения для бизнеса",
					icon: Building2,
					tone: "dark"
				}),
				fromPage("bloggers", {
					key: "bloggers",
					eyebrow: "ДЛЯ БЛОГЕРОВ И АВТОРОВ",
					title: home.bloggers.title,
					accent: home.bloggers.accent,
					body: home.bloggers.body,
					benefits: home.bloggers.visualLines.slice(0, 3),
					url: "/partnerships",
					label: "Условия для авторов",
					icon: PenLine,
					tone: "rose"
				})
			];
		});
		const directionsBlock = computed(() => contentBlock("directions"));
		const footerBlock = computed(() => contentBlock("footer"));
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sb-club-hub" }, _attrs))}><nav class="sb-breadcrumbs" aria-label="Навигационная цепочка">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Главная`);
					else return [createTextVNode("Главная")];
				}),
				_: 1
			}, _parent));
			_push(`<span>/</span><span>О клубе</span></nav><header class="sb-club-hub__hero"><div><p class="sb-kicker">${ssrInterpolate(props.page?.eyebrow || "SARKISIAN CLUB")}</p><h1>${ssrInterpolate(unref(heroTitle).main)}<br><em>${ssrInterpolate(unref(heroTitle).accent)}</em></h1><p class="sb-club-hub__lead">${ssrInterpolate(props.page?.lead || "Для мастеров, салонов и авторов: бонусы, удобные закупки и понятное партнёрство в одном пространстве.")}</p><div class="sb-club-hub__actions"><button class="sb-primary" type="button">${ssrInterpolate(unref(siteContent).home.club.joinLabel)} `);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
			_push(`</button>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				class: "sb-club-hub__account",
				to: "/account"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(ssrRenderComponent(unref(UserRound), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
						_push(`<span${_scopeId}>Мой кабинет</span>`);
					} else return [createVNode(unref(UserRound), {
						size: 18,
						"aria-hidden": "true"
					}), createVNode("span", null, "Мой кабинет")];
				}),
				_: 1
			}, _parent));
			_push(`</div></div><div class="sb-club-hub__signal" aria-hidden="true"><span>01</span><i></i><span>03</span><small>Покупки · бизнес · авторы</small></div></header><section class="sb-club-hub__directions" aria-labelledby="club-directions-title"><div class="sb-club-hub__section-head"><p class="sb-kicker">ВЫБЕРИТЕ СВОЙ ФОРМАТ</p><h2 id="club-directions-title">${ssrInterpolate(unref(directionsBlock)?.title || "Клуб подстраивается под вашу работу.")}</h2>`);
			if (unref(directionsBlock)?.body) _push(`<p>${ssrInterpolate(unref(directionsBlock).body)}</p>`);
			else _push(`<!---->`);
			_push(`</div><div class="sb-club-hub__grid"><!--[-->`);
			ssrRenderList(unref(directions), (direction) => {
				_push(`<div class="${ssrRenderClass([`is-${direction.tone}`, "sb-club-direction"])}"><div class="sb-club-direction__top">`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(direction.icon), { size: 21 }, null), _parent);
				_push(`<span>${ssrInterpolate(direction.eyebrow)}</span></div><h3>${ssrInterpolate(direction.title)} <em>${ssrInterpolate(direction.accent)}</em></h3><p>${ssrInterpolate(direction.body)}</p><ul><!--[-->`);
				ssrRenderList(direction.benefits, (benefit) => {
					_push(`<li>${ssrInterpolate(benefit)}</li>`);
				});
				_push(`<!--]--></ul>`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: direction.url }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(direction.label)} `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(direction.label) + " ", 1), createVNode(unref(ArrowRight), { size: 17 })];
					}),
					_: 2
				}, _parent));
				_push(`</div>`);
			});
			_push(`<!--]--></div></section><footer class="sb-club-hub__footer"><div><p class="sb-kicker">SARKISIAN CLUB</p><h2>${ssrInterpolate(unref(footerBlock)?.title || "Выберите направление, а дальше мы поможем.")}</h2>`);
			if (unref(footerBlock)?.body) _push(`<p>${ssrInterpolate(unref(footerBlock).body)}</p>`);
			else _push(`<!---->`);
			_push(`</div>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				class: "sb-primary",
				to: unref(footerBlock)?.buttonUrl || "/contacts"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(footerBlock)?.buttonLabel || "Задать вопрос")} `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(footerBlock)?.buttonLabel || "Задать вопрос") + " ", 1), createVNode(unref(ArrowRight), { size: 18 })];
				}),
				_: 1
			}, _parent));
			_push(`</footer></article>`);
		};
	}
});
// components/storefront/SiteClubHub.vue
var _sfc_setup$13 = SiteClubHub_vue_vue_type_script_setup_true_lang_default.setup;
SiteClubHub_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteClubHub.vue");
	return _sfc_setup$13 ? _sfc_setup$13(props, ctx) : void 0;
};
var SiteClubHub_default = Object.assign(SiteClubHub_vue_vue_type_script_setup_true_lang_default, { __name: "SiteClubHub" });
// components/storefront/SiteBusinessPage.vue?vue&type=script&setup=true&lang.ts
var SiteBusinessPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteBusinessPage",
	__ssrInlineRender: true,
	props: { page: {} },
	setup(__props) {
		const route = useRoute();
		useStorefrontPanels();
		watch(() => route.query.registration, (value) => {}, { immediate: true });
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sh-container sb-business-page sb-business-page--crm" }, _attrs))}><header class="sb-business-hero sb-business-crm-hero"><h1>Салон работает.<em>Запись под контролем.</em></h1><div class="sb-business-hero__bottom"><div class="sb-business-hero__copy"><p class="sb-business-hero__lead">CRM собирает расписание, клиентов и онлайн-запись в одном кабинете. А профессиональные материалы SARKISIAN вы заказываете там же — по персональной цене своей компании.</p><div class="sb-business-hero__actions"><button type="button" class="sb-design-button">Подключить кабинет `);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b-login",
				class: "sb-business-hero__login"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Уже с нами? Войти `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 16,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode("Уже с нами? Войти "), createVNode(unref(ArrowRight), {
						size: 16,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div></div><div class="sb-business-hero__preview" aria-label="Записи клиентов появляются в расписании салона"><div class="sb-business-crm-demo"><div class="sb-business-crm-demo-top"><span>РАСПИСАНИЕ</span>`);
			_push(ssrRenderComponent(unref(CalendarDays), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>ПОНЕДЕЛЬНИК</span></div><div class="sb-business-crm-demo-rows"><div><time>09:00</time><span><strong>Маникюр с покрытием</strong><small>Анна · запись подтверждена</small></span>`);
			_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
			_push(`</div><div><time>10:30</time><span><strong>Укрепление и коррекция</strong><small>Мария · новая запись</small></span>`);
			_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
			_push(`</div><div class="is-free"><time>12:00</time><span><strong>Свободное время</strong><small>Клиент может записаться онлайн</small></span>`);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
			_push(`</div></div><span class="sb-business-crm-demo-word" aria-hidden="true">ПЛАН</span></div></div></div></header><section class="sb-business-crm-promise" aria-label="Возможности кабинета"><p>Один кабинет —<br>три задачи салона</p><span>`);
			_push(ssrRenderComponent(unref(CalendarDays), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`Записи и клиенты</span><span>`);
			_push(ssrRenderComponent(unref(Link2), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`Онлайн-запись</span><span>`);
			_push(ssrRenderComponent(unref(ShoppingBag), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`Заказы SARKISIAN</span></section><section id="salon" class="sb-business-crm-section sb-business-crm-salon"><div class="sb-business-crm-heading"><h2>Вы занимаетесь салоном.<em>CRM держит всё в порядке.</em></h2><p>Рабочий день, команда и клиенты — перед глазами. Записи не теряются в переписках, а история визитов остаётся рядом с карточкой клиента.</p></div><div class="sb-business-crm-flow" aria-label="Рабочий процесс салона"><div>`);
			_push(ssrRenderComponent(unref(CalendarDays), {
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<strong>Расписание</strong><small>Кто и когда работает</small></div>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<div>`);
			_push(ssrRenderComponent(unref(Users), {
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<strong>Клиенты</strong><small>Контакты и история визитов</small></div>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<div>`);
			_push(ssrRenderComponent(unref(Check), {
				size: 20,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<strong>Повторные визиты</strong><small>Вся история в одном кабинете</small></div></div></section><section id="booking" class="sb-business-crm-booking"><div class="sb-business-crm-booking-title"><h2>Клиент выбирает время.<br><em>Вы получаете запись.</em></h2></div><div class="sb-business-crm-booking-info"><p>Покажите свободные окна на своей странице записи или добавьте форму на сайт. Клиент сам выберет услугу и удобное время — запись появится в расписании салона.</p><div class="sb-business-crm-booking-steps" aria-label="Как клиент записывается"><span>Ваша ссылка</span>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Услуга</span>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Время</span></div><button type="button" class="sb-business-crm-text-link">Настроить онлайн-запись `);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
			_push(`</button></div><div class="sb-business-crm-booking-word" aria-hidden="true">ЗАПИСЬ</div></section><section id="purchases" class="sb-business-crm-purchases"><div class="sb-business-crm-purchases-art" aria-hidden="true"><span>S</span><i></i><i></i><i></i></div><div class="sb-business-crm-purchases-copy"><h2>Материалы SARKISIAN.<em>По цене вашей компании.</em></h2><p>Откройте каталог для бизнеса, выберите нужное и оформите заказ в кабинете. Персональная скидка уже учтена в цене товаров.</p><div class="sb-business-crm-purchase-detail">`);
			_push(ssrRenderComponent(unref(ShoppingBag), {
				size: 19,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>Каталог, ваши цены и статусы заказов — в одном месте</span></div></div></section><footer class="sb-business-crm-end"><h2>Пора навести порядок<br>в записи салона?</h2><div><button type="button" class="sb-design-button">Подключить кабинет `);
			_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
			_push(`</button>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/b2b-login",
				class: "sb-business-crm-text-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Войти в кабинет `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("Войти в кабинет "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</div></footer></article>`);
		};
	}
});
// components/storefront/SiteBusinessPage.vue
var _sfc_setup$12 = SiteBusinessPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteBusinessPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteBusinessPage.vue");
	return _sfc_setup$12 ? _sfc_setup$12(props, ctx) : void 0;
};
var SiteBusinessPage_default = Object.assign(SiteBusinessPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteBusinessPage" });
// components/storefront/SiteBusinessPreview.vue?vue&type=script&setup=true&lang.ts
var SiteBusinessPreview_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteBusinessPreview",
	__ssrInlineRender: true,
	props: { block: {} },
	setup(__props) {
		const props = __props;
		const { storefrontMediaUrl } = useStorefrontContent();
		const preview = computed(() => props.block.preview || defaultBusinessPreview);
		const active = ref("salon");
		const quantity = ref(2);
		const tabs = computed(() => [{
			id: "salon",
			label: preview.value.salonTitle,
			icon: CalendarDays
		}, {
			id: "purchases",
			label: preview.value.purchasesTitle,
			icon: ShoppingBag
		}]);
		const uid = useId();
		const number = (value) => value.toLocaleString("ru-RU");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				class: "sb-business-preview",
				role: "region",
				"aria-label": "Демонстрация B2B-кабинета"
			}, _attrs))}><header class="sb-business-preview__head"><div><span>${ssrInterpolate(__props.block.visualLabel)}</span><h3>${ssrInterpolate(__props.block.visualTitle)}</h3></div><span class="sb-business-preview__demo"><i aria-hidden="true"></i>${ssrInterpolate(unref(preview).demoLabel)}</span></header><div class="sb-business-preview__tabs" role="tablist" aria-label="Пространства B2B-кабинета"><!--[-->`);
			ssrRenderList(unref(tabs), (tab, index) => {
				_push(`<button${ssrRenderAttr("id", `${unref(uid)}-${tab.id}-tab`)} type="button" role="tab"${ssrRenderAttr("aria-selected", unref(active) === tab.id)}${ssrRenderAttr("aria-controls", `${unref(uid)}-${tab.id}-panel`)}${ssrRenderAttr("tabindex", unref(active) === tab.id ? 0 : -1)}>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(tab.icon), {
					size: 17,
					"aria-hidden": "true"
				}, null), _parent);
				_push(`${ssrInterpolate(tab.label)}</button>`);
			});
			_push(`<!--]--></div><div class="sb-business-preview__panels"><section${ssrRenderAttr("id", `${unref(uid)}-salon-panel`)} class="sb-business-preview__panel" role="tabpanel"${ssrRenderAttr("aria-labelledby", `${unref(uid)}-salon-tab`)}${ssrRenderDynamicAttr("hidden", unref(active) !== "salon")}${ssrRenderAttr("aria-hidden", unref(active) !== "salon")}${ssrIncludeBooleanAttr(unref(active) !== "salon") ? " inert" : ""}${ssrRenderAttr("tabindex", unref(active) === "salon" ? 0 : -1)}><div class="sb-business-preview__section-title"><h4>${ssrInterpolate(unref(preview).scheduleTitle)}</h4>`);
			_push(ssrRenderComponent(unref(CalendarDays), {
				size: 17,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</div><ol class="sb-business-preview__schedule"><li><time>09:00<span>10:30</span></time><div><strong>${ssrInterpolate(unref(preview).appointmentTitle)}</strong><span>${ssrInterpolate(unref(preview).appointmentDetail)}</span></div>`);
			_push(ssrRenderComponent(unref(Check), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</li><li class="is-break"><time>10:30<span>11:00</span></time><div>`);
			_push(ssrRenderComponent(unref(Coffee), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<strong>${ssrInterpolate(unref(preview).breakTitle)}</strong></div></li><li><time>11:00<span>12:00</span></time><div><strong>${ssrInterpolate(unref(preview).secondAppointmentTitle)}</strong><span>${ssrInterpolate(unref(preview).secondAppointmentDetail)}</span></div>`);
			_push(ssrRenderComponent(unref(Check), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</li></ol><div class="sb-business-preview__widget"><div><strong>${ssrInterpolate(unref(preview).widgetTitle)}</strong><span>${ssrInterpolate(__props.block.visualLines[2])}</span></div><span class="sb-business-preview__widget-action">${ssrInterpolate(unref(preview).widgetAction)} `);
			_push(ssrRenderComponent(unref(ArrowUpRight), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</span></div></section><section${ssrRenderAttr("id", `${unref(uid)}-purchases-panel`)} class="sb-business-preview__panel" role="tabpanel"${ssrRenderAttr("aria-labelledby", `${unref(uid)}-purchases-tab`)}${ssrRenderDynamicAttr("hidden", unref(active) !== "purchases")}${ssrRenderAttr("aria-hidden", unref(active) !== "purchases")}${ssrIncludeBooleanAttr(unref(active) !== "purchases") ? " inert" : ""}${ssrRenderAttr("tabindex", unref(active) === "purchases" ? 0 : -1)}><div class="sb-business-preview__section-title"><h4>${ssrInterpolate(unref(preview).orderTitle)}</h4>`);
			_push(ssrRenderComponent(unref(Package), {
				size: 17,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</div><div class="sb-business-preview__product">`);
			if (unref(safeSiteContentUrl)(unref(preview).productImageUrl, true) && unref(preview).productImageUrl) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(preview).productImageUrl))} alt="" loading="lazy" decoding="async">`);
			else _push(ssrRenderComponent(unref(ShoppingBag), {
				size: 44,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<div><strong>${ssrInterpolate(unref(preview).productTitle)}</strong><span>${ssrInterpolate(unref(preview).productDetail)}</span><small>${ssrInterpolate(unref(preview).productCaption)}</small><b>${ssrInterpolate(number(unref(preview).productPrice))} ₽</b></div></div><div class="sb-business-preview__quantity"><span>Количество</span><div><button type="button" aria-label="Уменьшить количество в примере"${ssrIncludeBooleanAttr(unref(quantity) <= 1) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Minus), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button><output aria-label="Количество в примере" aria-live="polite">${ssrInterpolate(unref(quantity))}</output><button type="button" aria-label="Увеличить количество в примере"${ssrIncludeBooleanAttr(unref(quantity) >= 9) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(Plus), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</button></div></div><div class="sb-business-preview__total"><span>Итого в примере</span><strong aria-live="polite">${ssrInterpolate(number(unref(preview).productPrice * unref(quantity)))} ₽</strong></div><div class="sb-business-preview__delivery">`);
			_push(ssrRenderComponent(unref(Package), {
				size: 18,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>${ssrInterpolate(unref(preview).orderBody)}</span>`);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</div></section></div><footer class="sb-business-preview__footer">`);
			_push(ssrRenderComponent(unref(Check), {
				size: 14,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`<span>${ssrInterpolate(__props.block.visualLines[unref(active) === "salon" ? 1 : 0])}</span></footer></div>`);
		};
	}
});
// components/storefront/SiteBusinessPreview.vue
var _sfc_setup$11 = SiteBusinessPreview_vue_vue_type_script_setup_true_lang_default.setup;
SiteBusinessPreview_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteBusinessPreview.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
var SiteBusinessPreview_default = Object.assign(SiteBusinessPreview_vue_vue_type_script_setup_true_lang_default, { __name: "SiteBusinessPreview" });
// composables/useStorefrontCardTilt.ts
/** Gentle, mouse-only card motion. Pointer updates never enter Vue reactivity. */
function useStorefrontCardTilt() {
	const maxAngle = 3;
	let element = null;
	let rect = null;
	let frame = null;
	let pointerX = 0;
	let pointerY = 0;
	const enabled = () => Boolean(void 0);
	function reset() {
		if (frame !== null) cancelAnimationFrame(frame);
		frame = null;
		if (element) {
			element.classList.remove("is-card-tilting");
			element.style.setProperty("--sb-card-tilt-x", "0deg");
			element.style.setProperty("--sb-card-tilt-y", "0deg");
		}
		element = null;
		rect = null;
	}
	function paint() {
		frame = null;
		if (!enabled() || !element || !rect) {
			reset();
			return;
		}
		const clamp = (value) => Math.max(-1, Math.min(1, value));
		const x = -clamp((pointerY - rect.top) / rect.height * 2 - 1) * maxAngle;
		const y = clamp((pointerX - rect.left) / rect.width * 2 - 1) * maxAngle;
		element.style.setProperty("--sb-card-tilt-x", `${x.toFixed(3)}deg`);
		element.style.setProperty("--sb-card-tilt-y", `${y.toFixed(3)}deg`);
	}
	function queue(event) {
		pointerX = event.clientX;
		pointerY = event.clientY;
		if (frame === null) frame = requestAnimationFrame(paint);
	}
	function onPointerEnter(event) {
		reset();
		if (!enabled() || event.pointerType !== "mouse" || !(event.currentTarget instanceof HTMLElement)) return;
		const bounds = event.currentTarget.getBoundingClientRect();
		if (bounds.width <= 0 || bounds.height <= 0) return;
		element = event.currentTarget;
		rect = bounds;
		element.classList.add("is-card-tilting");
		queue(event);
	}
	function onPointerMove(event) {
		if (!enabled() || event.pointerType !== "mouse") {
			reset();
			return;
		}
		if (event.currentTarget === element && rect) queue(event);
	}
	return {
		onPointerEnter,
		onPointerMove,
		onPointerLeave: reset,
		onPointerCancel: reset
	};
}
// composables/useCreatorReactions.ts
/** Decorative mouse-only waves. Leaving stops emission, not existing animations. */
function useCreatorReactions(enabled) {
	const particles = ref([]);
	let timer;
	const expiry = /* @__PURE__ */ new Map();
	const allowed = () => enabled() && void 0;
	function finish(id) {
		const timeout = expiry.get(id);
		if (timeout) clearTimeout(timeout);
		expiry.delete(id);
		particles.value = particles.value.filter((particle) => particle.id !== id);
	}
	function start(event) {
		if (timer || event.pointerType !== "mouse" || !allowed()) return;
	}
	function stop() {
		if (timer) clearInterval(timer);
		timer = void 0;
	}
	return {
		particles,
		start,
		stop,
		finish
	};
}
// components/storefront/SitePartnershipBlock.vue?vue&type=script&setup=true&lang.ts
var SitePartnershipBlock_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePartnershipBlock",
	__ssrInlineRender: true,
	props: {
		block: {},
		kind: {},
		headingTag: {}
	},
	setup(__props) {
		const props = __props;
		const { storefrontMediaUrl } = useStorefrontContent();
		const { particles } = useCreatorReactions(() => props.kind === "bloggers" && props.headingTag !== "h1");
		const video = ref(null);
		const paused = ref(true);
		const deviceTime = ref("--:--");
		const videoFailed = ref(false);
		const videoUrl = computed(() => safeSiteContentUrl(props.block.visualVideoUrl, true) ? storefrontMediaUrl(props.block.visualVideoUrl) : "");
		let observer;
		let inView = false;
		function syncPlayback() {
			if (!video.value) return;
			if (inView && !(void 0).hidden && true) video.value.play().catch(() => {
				paused.value = true;
			});
			else video.value.pause();
		}
		function observeVideo() {
			observer?.disconnect();
			if (!video.value) return;
			observer = new IntersectionObserver((entries) => {
				inView = entries[0].isIntersecting;
				syncPlayback();
			}, { threshold: .15 });
			observer.observe(video.value);
		}
		watch(videoUrl, async () => {
			videoFailed.value = false;
			await nextTick();
			observeVideo();
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SiteBusinessPreview = SiteBusinessPreview_default;
			_push(`<section${ssrRenderAttrs(mergeProps({ class: ["sb-home-partnership", [
				"sb-home-partnership--" + __props.block.theme,
				"sb-home-partnership--" + __props.kind,
				{ "sb-home-partnership--workspace": __props.kind === "business" && __props.headingTag !== "h1" }
			]] }, _attrs))}>`);
			if (__props.block.eyebrow || __props.block.title || __props.block.accent || __props.block.body || __props.block.buttonLabel) {
				_push(`<div class="sb-home-partnership__copy"><p class="sb-kicker">${ssrInterpolate(__props.block.eyebrow)}</p>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(__props.headingTag || "h2"), { class: "sb-partnership-heading" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`${ssrInterpolate(__props.block.title)} <em${_scopeId}>${ssrInterpolate(__props.block.accent)}</em>`);
						else return [createTextVNode(toDisplayString(__props.block.title) + " ", 1), createVNode("em", null, toDisplayString(__props.block.accent), 1)];
					}),
					_: 1
				}), _parent);
				_push(`<p class="sb-home-partnership__body">${ssrInterpolate(__props.block.body)}</p>`);
				if (__props.block.buttonLabel && unref(safeSiteContentUrl)(__props.block.url)) _push(ssrRenderComponent(_component_NuxtLink, {
					to: __props.block.url === "/partnerships#referral" || __props.block.url === "/club#referral" ? "/club/referrals" : __props.block.url,
					class: "sb-partnership-button sb-liquid-primary"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(__props.block.buttonLabel)} `);
							_push(ssrRenderComponent(unref(ArrowRight), {
								size: 18,
								"aria-hidden": "true"
							}, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(__props.block.buttonLabel) + " ", 1), createVNode(unref(ArrowRight), {
							size: 18,
							"aria-hidden": "true"
						})];
					}),
					_: 1
				}, _parent));
				else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			if (__props.kind === "bloggers") {
				_push(`<div class="sb-creator-art"><div class="sb-creator-reactions" aria-hidden="true"><!--[-->`);
				ssrRenderList(unref(particles), (particle) => {
					_push(`<span class="${ssrRenderClass(["is-" + particle.kind, "sb-creator-reaction"])}" style="${ssrRenderStyle({
						left: particle.left + "%",
						"--reaction-size": particle.size + "px",
						"--reaction-duration": particle.duration + "s",
						"--reaction-delay": particle.delay + "s",
						"--reaction-drift": particle.drift + "px"
					})}">`);
					ssrRenderVNode(_push, createVNode(resolveDynamicComponent(particle.kind === "heart" ? unref(Heart) : unref(ThumbsUp)), null, null), _parent);
					_push(`</span>`);
				});
				_push(`<!--]--></div><div class="sb-creator-phone sb-card-tilt" role="group" aria-label="Макет iPhone с экраном записи TikTok"><div class="sb-creator-phone__screen" aria-hidden="true">`);
				if (unref(safeSiteContentUrl)(__props.block.visualImageUrl, true)) _push(`<img${ssrRenderAttr("src", unref(storefrontMediaUrl)(__props.block.visualImageUrl))} alt="" loading="lazy" decoding="async">`);
				else _push(`<!---->`);
				if (unref(videoUrl) && !unref(videoFailed)) _push(`<video${ssrRenderAttr("src", unref(videoUrl))}${ssrRenderAttr("poster", unref(storefrontMediaUrl)(__props.block.visualImageUrl))} muted loop playsinline preload="none"></video>`);
				else _push(`<!---->`);
				_push(`<div class="sb-creator-phone__shade"></div><div class="sb-creator-phone__status"><span>${ssrInterpolate(unref(deviceTime))}</span><span>`);
				_push(ssrRenderComponent(unref(Signal), { size: 12 }, null, _parent));
				_push(ssrRenderComponent(unref(Wifi), { size: 12 }, null, _parent));
				_push(`<i></i></span></div><div class="sb-creator-phone__island"></div><div class="sb-creator-phone__top">`);
				_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
				_push(`<span>`);
				_push(ssrRenderComponent(unref(Music2), { size: 13 }, null, _parent));
				_push(` TikTok</span><span class="sb-creator-phone__live"><i></i>00:12</span></div><div class="sb-creator-phone__progress"><i></i></div><div class="sb-creator-phone__tools">`);
				_push(ssrRenderComponent(unref(RotateCcw), { size: 21 }, null, _parent));
				_push(ssrRenderComponent(unref(Zap), { size: 21 }, null, _parent));
				_push(ssrRenderComponent(unref(Sparkles), { size: 21 }, null, _parent));
				_push(`</div>`);
				if (!unref(videoUrl) || unref(videoFailed)) _push(`<div class="sb-creator-phone__controls"><i class="sb-creator-phone__shutter"><i></i></i></div>`);
				else _push(`<!---->`);
				_push(`<div class="sb-creator-phone__home"></div></div>`);
				if (unref(videoUrl) && !unref(videoFailed)) {
					_push(`<button type="button" class="sb-creator-phone__playback"${ssrRenderAttr("aria-label", unref(paused) ? "Воспроизвести видео" : "Приостановить видео")}>`);
					if (unref(paused)) _push(ssrRenderComponent(unref(Play), {
						size: 22,
						"aria-hidden": "true"
					}, null, _parent));
					else _push(ssrRenderComponent(unref(Pause), {
						size: 22,
						"aria-hidden": "true"
					}, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</div></div>`);
			} else if (__props.kind === "business" && __props.headingTag !== "h1") _push(ssrRenderComponent(_component_SiteBusinessPreview, { block: __props.block }, null, _parent));
			else {
				_push(`<div class="${ssrRenderClass(["sb-partnership-art--" + __props.kind, "sb-partnership-art"])}">`);
				if (__props.kind === "referral") {
					_push(`<div class="sb-referral-card-back" aria-hidden="true">`);
					_push(ssrRenderComponent(unref(Gift), { size: 26 }, null, _parent));
					_push(`<span>${ssrInterpolate(__props.block.visualLabel)}</span><i></i><i></i></div>`);
				} else _push(`<!---->`);
				_push(`<div class="sb-partnership-art__card"><div class="sb-partnership-art__head"><span>${ssrInterpolate(__props.block.visualLabel)}</span>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(__props.kind === "business" ? unref(Building2) : unref(Gift)), {
					size: 20,
					"aria-hidden": "true"
				}, null), _parent);
				_push(`</div><h3>${ssrInterpolate(__props.block.visualTitle)}</h3><ol><!--[-->`);
				ssrRenderList(__props.block.visualLines, (line, index) => {
					_push(`<li><i aria-hidden="true">`);
					_push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					_push(`</i><span>${ssrInterpolate(line)}</span></li>`);
				});
				_push(`<!--]--></ol>`);
				if (__props.kind === "business") {
					_push(`<div class="sb-business-calendar" aria-hidden="true">`);
					_push(ssrRenderComponent(unref(CalendarDays), { size: 18 }, null, _parent));
					_push(`<div><!--[-->`);
					ssrRenderList(7, (day) => {
						_push(`<span></span>`);
					});
					_push(`<!--]--><!--[-->`);
					ssrRenderList(14, (slot) => {
						_push(`<i></i>`);
					});
					_push(`<!--]--></div></div>`);
				} else _push(`<!---->`);
				_push(`</div></div>`);
			}
			_push(`</section>`);
		};
	}
});
// components/storefront/SitePartnershipBlock.vue
var _sfc_setup$10 = SitePartnershipBlock_vue_vue_type_script_setup_true_lang_default.setup;
SitePartnershipBlock_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePartnershipBlock.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var SitePartnershipBlock_default = Object.assign(SitePartnershipBlock_vue_vue_type_script_setup_true_lang_default, { __name: "SitePartnershipBlock" });
// components/storefront/SiteBloggersPage.vue?vue&type=script&setup=true&lang.ts
var SiteBloggersPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteBloggersPage",
	__ssrInlineRender: true,
	props: { page: {} },
	setup(__props) {
		const props = __props;
		const { siteContent } = useStorefrontContent();
		const blocks = computed(() => Array.isArray(props.page.blocks) ? props.page.blocks : []);
		const block = (id) => blocks.value.find((item) => item.id === id) || {};
		const hero = computed(() => block("cover"));
		const author = computed(() => block("bloggers"));
		const payout = computed(() => block("rewards"));
		const salon = computed(() => block("business-reward"));
		const steps = computed(() => block("creator-start"));
		const contact = computed(() => block("together"));
		const creatorPhoneBlock = computed(() => ({
			...siteContent.value.home.bloggers,
			eyebrow: "",
			title: "",
			accent: "",
			body: "",
			buttonLabel: "",
			url: "",
			visualLabel: "",
			visualTitle: "",
			visualLines: [],
			theme: "dark"
		}));
		const faqs = computed(() => blocks.value.filter((item) => item.kind === "faq"));
		const lines = (value) => String(value || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SitePartnershipBlock = SitePartnershipBlock_default;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sb-cooperation-page" }, _attrs))}><header class="sc-hero sh-container"><div class="sc-hero__main"><h1>${ssrInterpolate(__props.page.title || "Сотрудничество с SARKISIAN")}</h1><div class="sc-hero__intro"><p>${ssrInterpolate(__props.page.lead || "Выберите формат: делитесь рекомендациями, создавайте контент или подключите инструменты для своего салона.")}</p><a href="#formats" class="sc-text-link">Выбрать формат `);
			_push(ssrRenderComponent(unref(ArrowDown), {
				size: 17,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</a></div></div><div class="sc-hero__rail" aria-label="Форматы сотрудничества"><a href="#customers">Покупателям `);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</a><a href="#authors">Авторам и блогерам `);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</a><a href="#salons">Салонам `);
			_push(ssrRenderComponent(unref(ArrowRight), {
				size: 16,
				"aria-hidden": "true"
			}, null, _parent));
			_push(`</a></div></header><section id="formats" class="sc-formats sh-container" aria-label="Форматы сотрудничества"><div id="customers" class="sc-format sc-format--customer"><div class="sc-format__copy"><h2>${ssrInterpolate(block("referral").title || "Рекомендуйте любимые продукты")}</h2><p class="sc-format__lead">${ssrInterpolate(lines(block("referral").body)[0] || "Расскажите друзьям о материалах SARKISIAN и приглашайте их за покупками по своей ссылке.")}</p><p class="sc-format__detail">${ssrInterpolate(lines(block("referral").body)[1] || "За подходящие заказы начисляются бонусы программы. Их можно использовать при следующих покупках на сайте.")}</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: block("referral").buttonUrl || "/club/referrals",
				class: "sc-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(block("referral").buttonLabel || "Как работает программа")} `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 17,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(block("referral").buttonLabel || "Как работает программа") + " ", 1), createVNode(unref(ArrowRight), {
						size: 17,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="sc-format__visual sc-customer-visual" aria-hidden="true"><div class="sc-orbit sc-orbit--one"></div><div class="sc-orbit sc-orbit--two"></div><div class="sc-note">`);
			_push(ssrRenderComponent(unref(Gift), { size: 22 }, null, _parent));
			_push(`<span>Рекомендация<br>другу</span></div><div class="sc-customer-visual__link">`);
			_push(ssrRenderComponent(unref(Link2), { size: 19 }, null, _parent));
			_push(`<span>Ваша ссылка</span><i></i><i></i><i></i></div><div class="sc-customer-visual__bonus">Бонусы<br><small>за покупки друзей</small></div></div></div><div id="authors" class="sc-format sc-format--author"><div class="sc-format__copy"><h2>${ssrInterpolate(unref(author).title || "Создавайте контент — получайте вознаграждение")}</h2><p class="sc-format__lead">${ssrInterpolate(lines(unref(author).body)[0] || "Рассказывайте о продуктах и своём опыте. После одобрения заявки вы получите персональную ссылку и условия партнёрства.")}</p><div class="sc-author-payouts"><div><span class="sc-payout-icon">`);
			_push(ssrRenderComponent(unref(Wallet), { size: 18 }, null, _parent));
			_push(`</span><p><b>Процент с покупок</b><small>${ssrInterpolate(lines(unref(payout).body)[0] || "Вознаграждение за подходящие розничные заказы, оформленные по вашей ссылке.")}</small></p></div><div><span class="sc-payout-icon">`);
			_push(ssrRenderComponent(unref(Building2), { size: 18 }, null, _parent));
			_push(`</span><p><b>Фиксированная сумма за салон</b><small>${ssrInterpolate(lines(unref(salon).body)[0] || "Отдельное вознаграждение за привлечённый салон после проверки и подключения.")}</small></p></div></div><p class="sc-format__detail">Денежное вознаграждение оформляется по договору. Для выплат понадобится статус самозанятого или ИП; документы и начисления доступны в кабинете партнёра.</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/account?tab=bloggers",
				class: "sc-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(hero).buttonLabel || "Подать заявку автору")} `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 17,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(hero).buttonLabel || "Подать заявку автору") + " ", 1), createVNode(unref(ArrowRight), {
						size: 17,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="sc-format__visual sc-author-visual">`);
			_push(ssrRenderComponent(_component_SitePartnershipBlock, {
				block: unref(creatorPhoneBlock),
				kind: "bloggers",
				"heading-tag": "h2"
			}, null, _parent));
			_push(`</div></div><div id="salons" class="sc-format sc-format--salon"><div class="sc-format__copy"><h2>Запись, клиенты и закупки — в одном кабинете</h2><p class="sc-format__lead">Подключите CRM SARKISIAN: ведите расписание и базу клиентов, откройте онлайн-запись через отдельную страницу или виджет на своём сайте.</p><p class="sc-format__detail">В том же кабинете можно заказывать продукцию SARKISIAN по персональным условиям для бизнеса.</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				to: "/business",
				class: "sc-link"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Посмотреть возможности для бизнеса `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 17,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode("Посмотреть возможности для бизнеса "), createVNode(unref(ArrowRight), {
						size: 17,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="sc-format__visual sc-salon-visual" aria-hidden="true"><div class="sc-salon-visual__head"><span class="sc-salon-mark">S</span><div><b>Мой салон</b><small>РАСПИСАНИЕ · СЕГОДНЯ</small></div><span class="sc-salon-date">КАЛЕНДАРЬ</span></div><div class="sc-salon-visual__row"><span>09:00</span><div><b>Маникюр с покрытием</b><small>Запись подтверждена</small></div><i></i></div><div class="sc-salon-visual__row"><span>11:00</span><div><b>Укрепление и коррекция</b><small>Следующий клиент</small></div><i></i></div><div class="sc-salon-visual__footer">Клиенты, расписание и заказы — в одном кабинете</div></div></div></section>`);
			if (unref(steps)) {
				_push(`<section class="sc-steps sh-container"><div class="sc-steps__heading"><h2>${ssrInterpolate(unref(steps).title || "Понятный путь от заявки до работы")}</h2></div><div class="sc-steps__list"><!--[-->`);
				ssrRenderList(lines(unref(steps).body), (line, index) => {
					_push(`<div><span>${ssrInterpolate([
						"Заявка",
						"Согласование",
						"Работа и выплаты"
					][index] || `Шаг ${index + 1}`)}</span><p>${ssrInterpolate(line)}</p></div>`);
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			if (unref(faqs).length) {
				_push(`<section class="sc-faq sh-container"><div><h2>Вопросы и ответы</h2></div><div class="sc-faq__items"><!--[-->`);
				ssrRenderList(unref(faqs), (item) => {
					_push(`<details${ssrRenderAttr("id", item.id)}><summary>${ssrInterpolate(item.title)}<span>+</span></summary><!--[-->`);
					ssrRenderList(lines(item.body), (line, index) => {
						_push(`<p>${ssrInterpolate(line)}</p>`);
					});
					_push(`<!--]--></details>`);
				});
				_push(`<!--]--></div></section>`);
			} else _push(`<!---->`);
			if (unref(contact)) {
				_push(`<footer class="sc-contact sh-container"><div><h2>${ssrInterpolate(unref(contact).title || "Обсудим подходящий формат?")}</h2><p>${ssrInterpolate(lines(unref(contact).body)[0] || "Оставьте заявку — мы уточним детали и расскажем о следующих шагах.")}</p></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: unref(contact).buttonUrl || "/account?tab=bloggers",
					class: "sc-contact__button"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(unref(contact).buttonLabel || "Оставить заявку")} `);
							_push(ssrRenderComponent(unref(ArrowRight), {
								size: 18,
								"aria-hidden": "true"
							}, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(unref(contact).buttonLabel || "Оставить заявку") + " ", 1), createVNode(unref(ArrowRight), {
							size: 18,
							"aria-hidden": "true"
						})];
					}),
					_: 1
				}, _parent));
				_push(`</footer>`);
			} else _push(`<!---->`);
			_push(`</article>`);
		};
	}
});
// components/storefront/SiteBloggersPage.vue
var _sfc_setup$9 = SiteBloggersPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteBloggersPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteBloggersPage.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
var SiteBloggersPage_default = Object.assign(SiteBloggersPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteBloggersPage" });
// \0virtual:public?%2Fstorefront%2Fsvetlana-creator-youtube.jpg
var _virtual_public__2Fstorefront_2Fsvetlana_creator_youtube_default = publicAssetsURL("/storefront/svetlana-creator-youtube.jpg");
// \0virtual:public?%2Fstorefront%2Fproducts%2Fgel-skorostnoy-011-30-ml.jpg
var _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_011_30_ml_default = publicAssetsURL("/storefront/products/gel-skorostnoy-011-30-ml.jpg");
// \0virtual:public?%2Fstorefront%2Fproducts%2Fnozhnitsy-pro-pravsha.jpg
var _virtual_public__2Fstorefront_2Fproducts_2Fnozhnitsy_pro_pravsha_default = publicAssetsURL("/storefront/products/nozhnitsy-pro-pravsha.jpg");
// \0virtual:public?%2Fstorefront%2Fproducts%2Fgel-skorostnoy-111-30-ml.jpg
var _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_111_30_ml_default = publicAssetsURL("/storefront/products/gel-skorostnoy-111-30-ml.jpg");
// \0virtual:public?%2Fstorefront%2Fproducts%2Fgel-skorostnoy-021-shimmer-30-ml.jpg
var _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_021_shimmer_30_ml_default = publicAssetsURL("/storefront/products/gel-skorostnoy-021-shimmer-30-ml.jpg");
// components/storefront/SiteClubReferralsPage.vue?vue&type=script&setup=true&lang.ts
var SiteClubReferralsPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteClubReferralsPage",
	__ssrInlineRender: true,
	props: { page: {} },
	setup(__props) {
		const props = __props;
		const referral = computed(() => (props.page.blocks || []).find((block) => block.id === "referral") || {});
		const paragraphs = computed(() => String(referral.value.body || "").split(/\n+/).filter(Boolean));
		const actionUrl = computed(() => safeSiteContentUrl(referral.value.buttonUrl) ? referral.value.buttonUrl : "/account?tab=referrals");
		const actionLabel = computed(() => referral.value.buttonLabel || "Моя ссылка и бонусы");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: "sb-referrals-page" }, _attrs))}><section class="sb-referrals-hero" aria-labelledby="referrals-title"><div class="sb-referrals-hero__intro"><h1 id="referrals-title"><span>SARK</span><span>ISIAN</span><span>CLUB</span></h1><p>${ssrInterpolate(__props.page.lead || "Рассказывайте друзьям о любимых материалах SARKISIAN и получайте бонусы за их покупки.")}</p></div><div class="sb-referrals-hero__aside"><span class="sb-referrals-rule"></span><p>Порекомендуйте то, чем сами работаете. Друзья оформят заказ по вашей ссылке, а бонусы появятся в личном кабинете.</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(actionLabel))} `);
						_push(ssrRenderComponent(unref(ArrowUpRight), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(actionLabel)) + " ", 1), createVNode(unref(ArrowUpRight), {
						size: 18,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><a class="sb-referrals-scroll" href="#how-it-works" aria-label="Как работает программа">`);
			_push(ssrRenderComponent(unref(ArrowDown), { size: 20 }, null, _parent));
			_push(`</a></section><section class="sb-referrals-manifesto" aria-label="Как работает клуб"><div class="sb-referrals-manifesto__line"><h2>ОДИН КЛУБ</h2><p>Для тех, кто выбирает SARKISIAN и делится находками с друзьями.</p></div><div class="sb-referrals-manifesto__line sb-referrals-manifesto__line--second"><h2>СВОЙ ФОРМАТ</h2><span>Личные покупки и рекомендации — в одном кабинете</span></div><div class="sb-referrals-benefits"><p>`);
			_push(ssrRenderComponent(unref(Link2), { size: 18 }, null, _parent));
			_push(` Ваша персональная ссылка</p><p>`);
			_push(ssrRenderComponent(unref(Gift), { size: 18 }, null, _parent));
			_push(` Бонусы за подходящие покупки</p><p>`);
			_push(ssrRenderComponent(unref(UserRound), { size: 18 }, null, _parent));
			_push(` Баланс и начисления в кабинете</p></div></section><section class="sb-referrals-brand" aria-label="SARKISIAN CLUB"><p>Покупайте любимое</p><h2><span>SARK</span><span>ISIAN</span><span>CLUB</span></h2><p>Получайте больше</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`О клубе `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("О клубе "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`Вступить в клуб `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("Вступить в клуб "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</section><section id="how-it-works" class="sb-referrals-story"><div class="sb-referrals-story__copy"><p class="sb-referrals-story__intro">Расскажите друзьям о SARKISIAN по персональной ссылке. За подходящие покупки приглашённых клиентов начисляются бонусы для следующих заказов на сайте.</p><p class="sb-referrals-story__lead">ОТ МАСТЕРА — ДРУЗЬЯМ</p>`);
			if (unref(paragraphs).length) {
				_push(`<div class="sb-referrals-story__body"><!--[-->`);
				ssrRenderList(unref(paragraphs), (text, index) => {
					_push(`<p>${ssrInterpolate(text)}</p>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<p class="sb-referrals-story__body">Отправьте друзьям персональную ссылку. Когда они оформят подходящий заказ, вам начислят бонусы для следующих покупок на сайте.</p>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				class: "sb-referrals-link",
				to: unref(actionUrl)
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(actionLabel))} `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(actionLabel)) + " ", 1), createVNode(unref(ArrowRight), {
						size: 18,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</div><div class="sb-referrals-media" aria-label="Любимые материалы SARKISIAN"><a href="/catalog" aria-label="Перейти в каталог SARKISIAN"><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fsvetlana_creator_youtube_default)} alt="Мастер рассказывает о любимых материалах SARKISIAN"></a><a href="/catalog" aria-label="Выбрать материалы SARKISIAN"><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_011_30_ml_default)} alt="Скоростной гель SARKISIAN"></a></div></section><section class="sb-referrals-how" aria-labelledby="referrals-how-title"><div class="sb-referrals-how__heading"><h2 id="referrals-how-title"><span>КЛУБ</span><span>ПОДСТРАИВАЕТСЯ</span><span>ПОД ВАШУ</span><span>РАБОТУ</span></h2><p>Делитесь тем, что сами выбираете для работы. А бонусы используйте для новых покупок.</p></div><div class="sb-referrals-how__gallery"><figure><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fproducts_2Fnozhnitsy_pro_pravsha_default)} alt="Ножницы SARKISIAN для профессионального маникюра">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`О клубе `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("О клубе "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</figure><figure><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_111_30_ml_default)} alt="Густой скоростной гель SARKISIAN">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`О клубе `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("О клубе "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</figure><figure><img${ssrRenderAttr("src", _virtual_public__2Fstorefront_2Fproducts_2Fgel_skorostnoy_021_shimmer_30_ml_default)} alt="Скоростной гель с шиммером SARKISIAN">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: unref(actionUrl) }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`О клубе `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode("О клубе "), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			_push(`</figure></div>`);
			_push(ssrRenderComponent(_component_NuxtLink, {
				class: "sb-referrals-link",
				to: unref(actionUrl)
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(actionLabel))} `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(actionLabel)) + " ", 1), createVNode(unref(ArrowRight), {
						size: 18,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			_push(`</section></article>`);
		};
	}
});
// components/storefront/SiteClubReferralsPage.vue
var _sfc_setup$8 = SiteClubReferralsPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteClubReferralsPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteClubReferralsPage.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var SiteClubReferralsPage_default = Object.assign(SiteClubReferralsPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteClubReferralsPage" });
// components/storefront/SitePartnershipScene.vue?vue&type=script&setup=true&lang.ts
var SitePartnershipScene_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePartnershipScene",
	__ssrInlineRender: true,
	props: {
		kind: {},
		products: {}
	},
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				class: ["sb-partnership-scene", "sb-partnership-scene--" + __props.kind],
				"aria-hidden": "true"
			}, _attrs))}>`);
			if (__props.kind === "purchases") {
				_push(`<!--[--><div class="sb-partnership-product-stage"><!--[-->`);
				ssrRenderList((__props.products || []).slice(0, 3), (product) => {
					_push(`<div class="sb-partnership-product-shot"><img${ssrRenderAttr("src", ("storefrontProductImage" in _ctx ? _ctx.storefrontProductImage : unref(storefrontProductImage))(product))} alt="" loading="lazy" decoding="async"></div>`);
				});
				_push(`<!--]-->`);
				if (!__props.products?.length) _push(ssrRenderComponent(unref(ShoppingBag), { size: 96 }, null, _parent));
				else _push(`<!---->`);
				_push(`</div><div class="sb-partnership-scene__floating">`);
				_push(ssrRenderComponent(unref(Package), { size: 22 }, null, _parent));
				_push(`<span>Заказ `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 12 }, null, _parent));
				_push(` Склад `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 12 }, null, _parent));
				_push(` Доставка</span></div><!--]-->`);
			} else if (__props.kind === "salon") {
				_push(`<!--[--><div class="sb-partnership-calendar"><div class="sb-partnership-calendar__head">`);
				_push(ssrRenderComponent(unref(CalendarDays), { size: 22 }, null, _parent));
				_push(`<strong>Мой салон</strong><span>Неделя</span></div><div class="sb-partnership-calendar__days"><!--[-->`);
				ssrRenderList([
					"Пн",
					"Вт",
					"Ср",
					"Чт",
					"Пт"
				], (day) => {
					_push(`<span>${ssrInterpolate(day)}</span>`);
				});
				_push(`<!--]--></div><div class="sb-partnership-calendar__grid"><!--[-->`);
				ssrRenderList(20, (cell) => {
					_push(`<i></i>`);
				});
				_push(`<!--]--><div class="sb-partnership-calendar__appointment"><span>Запись</span><b>09:00 — 10:30</b></div><div class="sb-partnership-calendar__break">Перерыв</div><div class="sb-partnership-calendar__second"><span>Запись</span><b>11:00 — 12:00</b></div></div></div><div class="sb-partnership-scene__floating">`);
				_push(ssrRenderComponent(unref(Users), { size: 22 }, null, _parent));
				_push(`<span>Команда · Клиенты · Онлайн-запись</span></div><!--]-->`);
			} else if (__props.kind === "creators") {
				_push(`<!--[--><div class="sb-partnership-link-card">`);
				_push(ssrRenderComponent(unref(Link), { size: 32 }, null, _parent));
				_push(`<span>SARKISIAN / ПАРТНЁР</span><div>sarkisianbrand.ru/r/•••••• `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
				_push(`</div><div class="sb-partnership-link-card__flow"><span>Ваш контент</span>`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent));
				_push(`<span>Ваша ссылка</span></div></div><div class="sb-partnership-scene__floating">`);
				_push(ssrRenderComponent(unref(ChartNoAxesCombined), { size: 22 }, null, _parent));
				_push(`<span>Переходы · Заказы · Начисления</span></div><!--]-->`);
			} else {
				_push(`<!--[--><div class="sb-partnership-business-card">`);
				_push(ssrRenderComponent(unref(Building2), { size: 42 }, null, _parent));
				_push(`<strong>SARKISIAN<br>для бизнеса</strong><div><span>`);
				_push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
				_push(` Регистрация</span><span>`);
				_push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
				_push(` Проверка</span><span>`);
				_push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
				_push(` Активация</span></div></div><div class="sb-partnership-scene__floating">`);
				_push(ssrRenderComponent(unref(Users), { size: 22 }, null, _parent));
				_push(`<span>Новый салон. Новые возможности.</span></div><!--]-->`);
			}
			_push(`</div>`);
		};
	}
});
// components/storefront/SitePartnershipScene.vue
var _sfc_setup$7 = SitePartnershipScene_vue_vue_type_script_setup_true_lang_default.setup;
SitePartnershipScene_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePartnershipScene.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SitePartnershipScene_default = Object.assign(SitePartnershipScene_vue_vue_type_script_setup_true_lang_default, { __name: "SitePartnershipScene" });
// components/storefront/SitePartnershipPage.vue?vue&type=script&setup=true&lang.ts
var SitePartnershipPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePartnershipPage",
	__ssrInlineRender: true,
	props: { page: {} },
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const { siteContent } = useStorefrontContent();
		const business = computed(() => props.page.slug === "business");
		const hero = computed(() => props.page.blocks?.find((block) => block.kind === "hero"));
		const blocks = computed(() => (props.page.blocks || []).filter((block) => block.kind !== "hero"));
		const features = computed(() => blocks.value.filter((block) => ![
			"faq",
			"action",
			"steps"
		].includes(block.kind)));
		const steps = computed(() => blocks.value.filter((block) => block.kind === "steps"));
		const faqs = computed(() => blocks.value.filter((block) => block.kind === "faq"));
		const actions = computed(() => blocks.value.filter((block) => block.kind === "action"));
		const config = useRuntimeConfig();
		const { data: productData } = ([__temp, __restore] = withAsyncContext(() => useFetch("/products", {
			baseURL: config.public.apiBase,
			query: { limit: 12 },
			immediate: business.value
		}, "$r9pOzjoaFB")), __temp = await __temp, __restore(), __temp);
		const sceneProducts = computed(() => (productData.value?.items || []).filter((p) => p.productType !== "GIFT_CARD" && storefrontProductImage(p)));
		const sceneKind = (index) => business.value ? index === 0 ? "purchases" : "salon" : index === 0 ? "creators" : "business-reward";
		const paragraphs = (body) => String(body || "").split(/\n+/).filter(Boolean);
		const icons = {
			business: Building2,
			calendar: CalendarDays,
			users: Users,
			gift: Gift,
			link: Link,
			chart: ChartNoAxesCombined,
			wallet: Wallet,
			shield: ShieldCheck
		};
		const hasLink = (label, url) => typeof label === "string" && !!label && safeSiteContentUrl(url);
		const heroBlock = computed(() => {
			const base = siteContent.value.home[business.value ? "business" : "bloggers"];
			const title = String(props.page.title || "").split("\n");
			return {
				...base,
				eyebrow: props.page.eyebrow,
				title: title[0],
				accent: title.slice(1).join(" "),
				body: props.page.lead,
				theme: business.value ? "light" : "dark",
				buttonLabel: hero.value?.buttonLabel || "",
				url: hero.value?.buttonUrl || "",
				visualLabel: hero.value?.title || base.visualLabel,
				visualTitle: base.visualTitle,
				visualLines: paragraphs(hero.value?.body || "").slice(0, 4)
			};
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			const _component_SitePartnershipBlock = SitePartnershipBlock_default;
			const _component_SitePartnershipScene = SitePartnershipScene_default;
			_push(`<article${ssrRenderAttrs(mergeProps({ class: ["sb-partnership-page", { "sb-partnership-page--business": unref(business) }] }, _attrs))}><nav class="sb-breadcrumbs" aria-label="Навигационная цепочка">`);
			_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) _push(`Главная`);
					else return [createTextVNode("Главная")];
				}),
				_: 1
			}, _parent));
			_push(`<span>/</span><span>${ssrInterpolate(unref(business) ? "Для бизнеса" : "Для блогеров")}</span></nav><header class="sb-partnership-cover">`);
			_push(ssrRenderComponent(_component_SitePartnershipBlock, {
				block: unref(heroBlock),
				kind: unref(business) ? "business" : "bloggers",
				"heading-tag": "h1"
			}, null, _parent));
			if (hasLink(unref(hero)?.secondaryLabel, unref(hero)?.secondaryUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
				to: unref(hero).secondaryUrl,
				class: "sb-partnership-text-link sb-partnership-cover__login"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(unref(hero).secondaryLabel)} `);
						_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(unref(hero).secondaryLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 16 })];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</header>`);
			if (__props.page.reviewRequired) _push(`<aside class="sb-review-notice" role="note">Информация требует утверждения перед публичным запуском.</aside>`);
			else _push(`<!---->`);
			_push(`<div class="sb-partnership-features"><!--[-->`);
			ssrRenderList(unref(features), (block, index) => {
				_push(`<section${ssrRenderAttr("id", block.id)} class="${ssrRenderClass([{
					"sb-partnership-feature--scene": index < 2,
					"sb-partnership-feature--dark": index === 1
				}, "sb-partnership-section sb-partnership-feature"])}"><div class="sb-partnership-feature__copy"><div class="sb-partnership-feature__mark" aria-hidden="true">`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(icons[block.icon] || unref(ShieldCheck)), { size: 24 }, null), _parent);
				_push(`<span>${ssrInterpolate(String(index + 1).padStart(2, "0"))}</span></div><h2>${ssrInterpolate(block.title)}</h2><div class="sb-partnership-section__body"><!--[-->`);
				ssrRenderList(paragraphs(block.body), (line, n) => {
					_push(`<p>${ssrInterpolate(line)}</p>`);
				});
				_push(`<!--]--></div>`);
				if (hasLink(block.buttonLabel, block.buttonUrl) || hasLink(block.secondaryLabel, block.secondaryUrl)) {
					_push(`<div class="sb-partnership-actions">`);
					if (hasLink(block.buttonLabel, block.buttonUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
						to: block.buttonUrl,
						class: "sb-partnership-text-link"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`${ssrInterpolate(block.buttonLabel)} `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
							} else return [createTextVNode(toDisplayString(block.buttonLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 16 })];
						}),
						_: 2
					}, _parent));
					else _push(`<!---->`);
					if (hasLink(block.secondaryLabel, block.secondaryUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
						to: block.secondaryUrl,
						class: "sb-partnership-text-link"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`${ssrInterpolate(block.secondaryLabel)} `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
							} else return [createTextVNode(toDisplayString(block.secondaryLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 16 })];
						}),
						_: 2
					}, _parent));
					else _push(`<!---->`);
					_push(`</div>`);
				} else _push(`<!---->`);
				_push(`</div>`);
				if (index < 2) _push(ssrRenderComponent(_component_SitePartnershipScene, {
					kind: sceneKind(index),
					products: unref(sceneProducts)
				}, null, _parent));
				else _push(`<!---->`);
				_push(`</section>`);
			});
			_push(`<!--]--></div><!--[-->`);
			ssrRenderList(unref(steps), (block) => {
				_push(`<section${ssrRenderAttr("id", block.id)} class="sb-partnership-section sb-partnership-process"><p class="sb-kicker">SARKISIAN</p><h2>${ssrInterpolate(block.title)}</h2><ol class="sb-partnership-steps"><!--[-->`);
				ssrRenderList(paragraphs(block.body), (line, index) => {
					_push(`<li><span aria-hidden="true">${ssrInterpolate(String(index + 1).padStart(2, "0"))}</span><p>${ssrInterpolate(line)}</p></li>`);
				});
				_push(`<!--]--></ol></section>`);
			});
			_push(`<!--]-->`);
			if (unref(faqs).length) {
				_push(`<div class="sb-partnership-faq"><h2>Вопросы и ответы</h2><div><!--[-->`);
				ssrRenderList(unref(faqs), (block) => {
					_push(`<section${ssrRenderAttr("id", block.id)} class="sb-partnership-section"><details><summary>${ssrInterpolate(block.title)}</summary><!--[-->`);
					ssrRenderList(paragraphs(block.body), (line, index) => {
						_push(`<p>${ssrInterpolate(line)}</p>`);
					});
					_push(`<!--]--></details></section>`);
				});
				_push(`<!--]--></div></div>`);
			} else _push(`<!---->`);
			_push(`<!--[-->`);
			ssrRenderList(unref(actions), (block) => {
				_push(`<section${ssrRenderAttr("id", block.id)} class="sb-partnership-section sb-partnership-end"><div><h2>${ssrInterpolate(block.title)}</h2><!--[-->`);
				ssrRenderList(paragraphs(block.body), (line, n) => {
					_push(`<p>${ssrInterpolate(line)}</p>`);
				});
				_push(`<!--]--></div><div class="sb-partnership-actions">`);
				if (hasLink(block.buttonLabel, block.buttonUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
					to: block.buttonUrl,
					class: "sb-partnership-button sb-liquid-primary"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(block.buttonLabel)} `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(block.buttonLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 18 })];
					}),
					_: 2
				}, _parent));
				else _push(`<!---->`);
				if (hasLink(block.secondaryLabel, block.secondaryUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
					to: block.secondaryUrl,
					class: "sb-partnership-text-link"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(block.secondaryLabel)} `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(block.secondaryLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 18 })];
					}),
					_: 2
				}, _parent));
				else _push(`<!---->`);
				_push(`</div></section>`);
			});
			_push(`<!--]--></article>`);
		};
	}
});
// components/storefront/SitePartnershipPage.vue
var _sfc_setup$6 = SitePartnershipPage_vue_vue_type_script_setup_true_lang_default.setup;
SitePartnershipPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePartnershipPage.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var SitePartnershipPage_default = Object.assign(SitePartnershipPage_vue_vue_type_script_setup_true_lang_default, { __name: "SitePartnershipPage" });
// components/storefront/SiteContactForm.vue?vue&type=script&setup=true&lang.ts
var SiteContactForm_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteContactForm",
	__ssrInlineRender: true,
	setup(__props) {
		const form = reactive({
			name: "",
			phone: "",
			email: "",
			message: "",
			consent: false,
			website: ""
		});
		const sending = ref(false);
		const sent = ref(false);
		const error = ref("");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: "sb-contact-form",
				"aria-labelledby": "sb-contact-form-title"
			}, _attrs))}>`);
			if (unref(sent)) {
				_push(`<div class="sb-contact-form__success" role="status"><span class="sb-contact-form__success-icon">`);
				_push(ssrRenderComponent(unref(Check), { size: 24 }, null, _parent));
				_push(`</span><h2>Сообщение отправлено</h2><p>Спасибо! Мы получили ваше обращение и свяжемся с вами по указанным контактам.</p><button type="button" class="sb-contact-form__again">Написать ещё раз `);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 17 }, null, _parent));
				_push(`</button></div>`);
			} else {
				_push(`<!--[--><div class="sb-contact-form__head"><span class="sb-contact-form__icon">`);
				_push(ssrRenderComponent(unref(Mail), { size: 20 }, null, _parent));
				_push(`</span><div><span class="sb-contact-form__eyebrow">НАПИШИТЕ НАМ</span><h2 id="sb-contact-form-title">Есть вопрос? Поможем.</h2></div></div><form><div class="sb-contact-form__grid"><label>Ваше имя <input${ssrRenderAttr("value", unref(form).name)} type="text" name="name" autocomplete="name" required minlength="2" maxlength="100" placeholder="Как к вам обращаться"></label><label>Телефон <input${ssrRenderAttr("value", unref(form).phone)} type="tel" name="tel" autocomplete="tel" inputmode="tel" required minlength="7" maxlength="25" placeholder="+7 (999) 000-00-00"></label></div><label>Электронная почта <input${ssrRenderAttr("value", unref(form).email)} type="email" name="email" autocomplete="email" required maxlength="254" placeholder="name@example.ru"></label><label>Ваше сообщение <textarea name="message" required minlength="10" maxlength="5000" rows="4" placeholder="Расскажите, чем мы можем помочь">${ssrInterpolate(unref(form).message)}</textarea></label><label class="sb-contact-form__trap" aria-hidden="true">Сайт <input${ssrRenderAttr("value", unref(form).website)} type="text" name="website" tabindex="-1" autocomplete="off"></label><label class="sb-contact-form__consent"><input${ssrIncludeBooleanAttr(Array.isArray(unref(form).consent) ? ssrLooseContain(unref(form).consent, null) : unref(form).consent) ? " checked" : ""} type="checkbox" required><span>Согласен(на) на обработку персональных данных по `);
				_push(ssrRenderComponent(_component_NuxtLink, {
					to: "/privacy",
					target: "_blank"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`политике конфиденциальности`);
						else return [createTextVNode("политике конфиденциальности")];
					}),
					_: 1
				}, _parent));
				_push(`.</span></label>`);
				if (unref(error)) _push(`<p class="sb-contact-form__error" role="alert">${ssrInterpolate(unref(error))}</p>`);
				else _push(`<!---->`);
				_push(`<button type="submit" class="sb-contact-form__submit"${ssrIncludeBooleanAttr(unref(sending)) ? " disabled" : ""}>${ssrInterpolate(unref(sending) ? "Отправляем…" : "Отправить сообщение")} `);
				if (!unref(sending)) _push(ssrRenderComponent(unref(ArrowRight), { size: 19 }, null, _parent));
				else _push(`<!---->`);
				_push(`</button></form><!--]-->`);
			}
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteContactForm.vue
var _sfc_setup$5 = SiteContactForm_vue_vue_type_script_setup_true_lang_default.setup;
SiteContactForm_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteContactForm.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var SiteContactForm_default = Object.assign(SiteContactForm_vue_vue_type_script_setup_true_lang_default, { __name: "SiteContactForm" });
// components/storefront/SitePageArt.vue?vue&type=script&setup=true&lang.ts
var SitePageArt_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SitePageArt",
	__ssrInlineRender: true,
	props: {
		kind: {},
		phone: {},
		email: {}
	},
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				class: ["sb-page-art", "sb-page-art--" + __props.kind],
				"aria-hidden": __props.kind === "contacts" ? "true" : void 0
			}, _attrs))}>`);
			if (__props.kind === "contacts") {
				_push(`<!--[--><div class="sb-page-art__sheet"><img${ssrRenderAttr("src", _virtual_public__2Fsarkisian_logo_default)} alt=""><div>`);
				_push(ssrRenderComponent(unref(Phone), { size: 22 }, null, _parent));
				_push(`<span>${ssrInterpolate(__props.phone || "SARKISIAN")}</span></div><div>`);
				_push(ssrRenderComponent(unref(Mail), { size: 22 }, null, _parent));
				_push(`<span>${ssrInterpolate(__props.email || "На связи с мастерами")}</span></div></div><div class="sb-page-art__seal">`);
				_push(ssrRenderComponent(unref(ArrowRight), { size: 30 }, null, _parent));
				_push(`</div><!--]-->`);
			} else {
				_push(`<div class="sb-delivery-flow"><p>ВАШ ЗАКАЗ В ПУТИ</p><h2>От выбора до получения</h2><div class="sb-page-art__route" role="img" aria-label="Этапы заказа: заказ, доставка, получение"><span class="sb-delivery-step sb-delivery-step--order"><span class="sb-delivery-step__icon">`);
				_push(ssrRenderComponent(unref(Check), { size: 24 }, null, _parent));
				_push(`</span><strong>Заказ</strong></span><i class="sb-delivery-line sb-delivery-line--first"></i><span class="sb-delivery-step sb-delivery-step--transit"><span class="sb-delivery-step__icon">`);
				_push(ssrRenderComponent(unref(Truck), { size: 25 }, null, _parent));
				_push(`</span><strong>Доставка</strong></span><i class="sb-delivery-line sb-delivery-line--second"></i><span class="sb-delivery-step sb-delivery-step--received"><span class="sb-delivery-step__icon">`);
				_push(ssrRenderComponent(unref(Package), { size: 25 }, null, _parent));
				_push(`</span><strong>Получение</strong></span></div><span class="sb-delivery-flow__note">Три понятных этапа вашего заказа</span></div>`);
			}
			_push(`</div>`);
		};
	}
});
// components/storefront/SitePageArt.vue
var _sfc_setup$4 = SitePageArt_vue_vue_type_script_setup_true_lang_default.setup;
SitePageArt_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SitePageArt.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var SitePageArt_default = Object.assign(SitePageArt_vue_vue_type_script_setup_true_lang_default, { __name: "SitePageArt" });
// components/storefront/SiteLoyaltyPreview.vue?vue&type=script&setup=true&lang.ts
var SiteLoyaltyPreview_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteLoyaltyPreview",
	__ssrInlineRender: true,
	setup(__props) {
		const { siteContent } = useStorefrontContent();
		const card = ref(null);
		const visible = ref(false);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				ref_key: "card",
				ref: card,
				class: ["sb-club-banner__card sb-glass-surface", { "is-visible": unref(visible) }]
			}, _attrs))}><small>${ssrInterpolate(unref(siteContent).home.club.previewLabel)}</small><b>${ssrInterpolate(unref(siteContent).home.club.previewBalance)}</b><span>баллов для следующей покупки</span><i><span></span></i><div><span>Старт</span><span>Профи</span></div></div>`);
		};
	}
});
// components/storefront/SiteLoyaltyPreview.vue
var _sfc_setup$3 = SiteLoyaltyPreview_vue_vue_type_script_setup_true_lang_default.setup;
SiteLoyaltyPreview_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteLoyaltyPreview.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var SiteLoyaltyPreview_default = Object.assign(SiteLoyaltyPreview_vue_vue_type_script_setup_true_lang_default, { __name: "SiteLoyaltyPreview" });
// components/storefront/SiteFounderBiography.vue?vue&type=script&setup=true&lang.ts
var SiteFounderBiography_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteFounderBiography",
	__ssrInlineRender: true,
	props: { block: {} },
	setup(__props) {
		const props = __props;
		const { storefrontMediaUrl } = useStorefrontContent();
		const photos = computed(() => (props.block.images || []).filter((url) => safeSiteContentUrl(url, true)).slice(0, 12));
		const active = ref(0);
		const socialNetworks = [
			{
				key: "vk",
				name: "ВКонтакте",
				icon: "/storefront/icons/vk.svg"
			},
			{
				key: "telegram",
				name: "Telegram",
				icon: "/storefront/icons/telegram.svg"
			},
			{
				key: "instagram",
				name: "Instagram",
				icon: "/storefront/icons/instagram.svg"
			},
			{
				key: "youtube",
				name: "YouTube",
				icon: "/storefront/icons/youtube.svg"
			},
			{
				key: "tiktok",
				name: "TikTok",
				icon: ""
			}
		];
		const socials = computed(() => socialNetworks.map((network) => ({
			...network,
			url: props.block.socials?.[network.key] || ""
		})).filter((network) => /^https:\/\//i.test(network.url) && safeSiteContentUrl(network.url)));
		const paragraphs = computed(() => props.block.body.split(/\n+/).filter(Boolean));
		watch(photos, () => {
			active.value = 0;
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				id: __props.block.id,
				class: "sb-founder-biography",
				"aria-label": "Об основательнице бренда"
			}, _attrs))}><div class="sb-founder-biography__copy"><p class="sb-kicker">Основательница SARKISIAN</p><h2>${ssrInterpolate(__props.block.title)}</h2><!--[-->`);
			ssrRenderList(unref(paragraphs), (paragraph, index) => {
				_push(`<p>${ssrInterpolate(paragraph)}</p>`);
			});
			_push(`<!--]-->`);
			if (unref(socials).length) {
				_push(`<nav class="sb-founder-socials" aria-label="Личные соцсети Светланы Саркисян"><!--[-->`);
				ssrRenderList(unref(socials), (social) => {
					_push(`<a${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer"${ssrRenderAttr("aria-label", social.name)}${ssrRenderAttr("title", social.name)}>`);
					if (social.icon) _push(`<img${ssrRenderAttr("src", social.icon)} alt="">`);
					else _push(ssrRenderComponent(unref(Music2), { size: 22 }, null, _parent));
					_push(`</a>`);
				});
				_push(`<!--]--></nav>`);
			} else _push(`<!---->`);
			_push(`</div>`);
			if (unref(photos).length) {
				_push(`<div class="sb-founder-gallery" role="region" aria-roledescription="карусель" aria-label="Фотографии Светланы Саркисян" tabindex="0"><figure><img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(photos)[unref(active)]))}${ssrRenderAttr("alt", `Светлана Саркисян — фотография ${unref(active) + 1}`)} loading="lazy" decoding="async"></figure>`);
				if (unref(photos).length > 1) {
					_push(`<!--[--><div class="sb-founder-gallery__controls"><button type="button" aria-label="Предыдущая фотография">`);
					_push(ssrRenderComponent(unref(ChevronLeft), { size: 28 }, null, _parent));
					_push(`</button><button type="button" aria-label="Следующая фотография">`);
					_push(ssrRenderComponent(unref(ChevronRight), { size: 28 }, null, _parent));
					_push(`</button></div><div class="sb-founder-gallery__pagination" role="group" aria-label="Выбор фотографии"><!--[-->`);
					ssrRenderList(unref(photos), (_, index) => {
						_push(`<button type="button"${ssrRenderAttr("aria-label", `Показать фотографию ${index + 1}`)}${ssrRenderAttr("aria-current", unref(active) === index ? "true" : void 0)}><span aria-hidden="true"></span></button>`);
					});
					_push(`<!--]--></div><span class="sb-visually-hidden" role="status" aria-live="polite" aria-atomic="true">${ssrInterpolate(unref(active) + 1)} / ${ssrInterpolate(unref(photos).length)}</span><!--]-->`);
				} else _push(`<!---->`);
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/storefront/SiteFounderBiography.vue
var _sfc_setup$2 = SiteFounderBiography_vue_vue_type_script_setup_true_lang_default.setup;
SiteFounderBiography_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteFounderBiography.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var SiteFounderBiography_default = Object.assign(SiteFounderBiography_vue_vue_type_script_setup_true_lang_default, { __name: "SiteFounderBiography" });
// components/storefront/SiteClubReferral.vue?vue&type=script&setup=true&lang.ts
var SiteClubReferral_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteClubReferral",
	__ssrInlineRender: true,
	props: { block: {} },
	setup(__props) {
		const props = __props;
		const { siteContent } = useStorefrontContent();
		const heading = computed(() => {
			const parts = String(props.block.title || "").split(/(?<=\.)\s+/);
			return {
				main: parts[0],
				accent: parts.slice(1).join(" ")
			};
		});
		const paragraphs = computed(() => String(props.block.body || "").split(/\n+/).filter(Boolean));
		const icons = [
			Link2,
			ShoppingBag,
			Gift
		];
		return (_ctx, _push, _parent, _attrs) => {
			const _component_NuxtLink = NuxtLink;
			_push(`<section${ssrRenderAttrs(mergeProps({
				id: __props.block.id,
				class: "sb-club-referral"
			}, _attrs))}><div class="sb-club-referral__copy"><h2>${ssrInterpolate(unref(heading).main)} `);
			if (unref(heading).accent) _push(`<em>${ssrInterpolate(unref(heading).accent)}</em>`);
			else _push(`<!---->`);
			_push(`</h2><!--[-->`);
			ssrRenderList(unref(paragraphs), (text, index) => {
				_push(`<p>${ssrInterpolate(text)}</p>`);
			});
			_push(`<!--]-->`);
			if (__props.block.buttonLabel && unref(safeSiteContentUrl)(__props.block.buttonUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
				to: __props.block.buttonUrl,
				class: "sb-primary"
			}, {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`${ssrInterpolate(__props.block.buttonLabel)} `);
						_push(ssrRenderComponent(unref(ArrowRight), {
							size: 18,
							"aria-hidden": "true"
						}, null, _parent, _scopeId));
					} else return [createTextVNode(toDisplayString(__props.block.buttonLabel) + " ", 1), createVNode(unref(ArrowRight), {
						size: 18,
						"aria-hidden": "true"
					})];
				}),
				_: 1
			}, _parent));
			else _push(`<!---->`);
			_push(`</div><ol class="sb-club-referral__flow"><!--[-->`);
			ssrRenderList(unref(siteContent).home.referral.visualLines, (line, index) => {
				_push(`<li><span class="sb-club-referral__node" aria-hidden="true">`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(icons[index % icons.length]), { size: 25 }, null), _parent);
				_push(`</span><span>${ssrInterpolate(line)}</span></li>`);
			});
			_push(`<!--]--></ol></section>`);
		};
	}
});
// components/storefront/SiteClubReferral.vue
var _sfc_setup$1 = SiteClubReferral_vue_vue_type_script_setup_true_lang_default.setup;
SiteClubReferral_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteClubReferral.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SiteClubReferral_default = Object.assign(SiteClubReferral_vue_vue_type_script_setup_true_lang_default, { __name: "SiteClubReferral" });
// components/storefront/SiteContentPage.vue?vue&type=script&setup=true&lang.ts
var SiteContentPage_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SiteContentPage",
	__ssrInlineRender: true,
	props: { page: {} },
	async setup(__props) {
		let __temp, __restore;
		const props = __props;
		const club = computed(() => ["club", "club-referrals"].includes(props.page.slug));
		const route = useRoute();
		const clubHub = computed(() => props.page.slug === "club" && route.path === "/club");
		useStorefrontPanels();
		const clubTilt = useStorefrontCardTilt();
		const paragraphs = (body) => String(body || "").split(/\n+/).filter(Boolean);
		const heading = computed(() => {
			const parts = String(props.page.title || "").split(/(?<=\.)\s+/);
			return {
				main: parts[0],
				accent: parts.slice(1).join(" ")
			};
		});
		const legal = computed(() => [
			"privacy",
			"oferta",
			"returns"
		].includes(props.page.slug));
		const { content, siteContent, loadStorefrontContent, storefrontMediaUrl } = useStorefrontContent();
		[__temp, __restore] = withAsyncContext(() => loadStorefrontContent()), await __temp, __restore();
		const aboutLogoUrl = computed(() => storefrontMediaUrl(siteContent.value.brand.logoUrl === "/sarkisian-logo.png" ? "/storefront/sarkisian-logo-original.png" : siteContent.value.brand.logoUrl));
		const socialIcon = (key) => ({
			vk: "/storefront/icons/vk.svg",
			telegram: "/storefront/icons/telegram.svg",
			max: "/storefront/icons/max.svg"
		})[key];
		const contactText = computed(() => (props.page.blocks || []).map((block) => block.body).join("\n"));
		const structuredContacts = computed(() => content.value.settings.siteContent?.contacts != null);
		const contactPhone = computed(() => structuredContacts.value ? siteContent.value.contacts.phone : contactText.value.match(/(?:8|\+7)\s*\(\d{3}\)\s*\d{3}[ -]\d{2}[ -]\d{2}/)?.[0] || "");
		const contactEmail = computed(() => structuredContacts.value ? siteContent.value.contacts.email : contactText.value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || "");
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteAboutPage = SiteAboutPage_default;
			const _component_SiteClubHub = SiteClubHub_default;
			const _component_SiteBusinessPage = SiteBusinessPage_default;
			const _component_SiteBloggersPage = SiteBloggersPage_default;
			const _component_SiteClubReferralsPage = SiteClubReferralsPage_default;
			const _component_SitePartnershipPage = SitePartnershipPage_default;
			const _component_NuxtLink = NuxtLink;
			const _component_SiteContactForm = SiteContactForm_default;
			const _component_SitePageArt = SitePageArt_default;
			const _component_SiteLoyaltyPreview = SiteLoyaltyPreview_default;
			const _component_SiteFounderBiography = SiteFounderBiography_default;
			const _component_SiteClubReferral = SiteClubReferral_default;
			if (__props.page.slug === "about") _push(ssrRenderComponent(_component_SiteAboutPage, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else if (unref(clubHub)) _push(ssrRenderComponent(_component_SiteClubHub, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else if (__props.page.slug === "business") _push(ssrRenderComponent(_component_SiteBusinessPage, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else if (__props.page.slug === "partnerships") _push(ssrRenderComponent(_component_SiteBloggersPage, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else if (__props.page.slug === "club-referrals") _push(ssrRenderComponent(_component_SiteClubReferralsPage, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else if (!unref(club) && __props.page.slug !== "about" && __props.page.blocks?.some((block) => block.kind && block.kind !== "text")) _push(ssrRenderComponent(_component_SitePartnershipPage, mergeProps({ page: __props.page }, _attrs), null, _parent));
			else {
				_push(`<article${ssrRenderAttrs(mergeProps({ class: ["sb-content-page", {
					"is-legal": unref(legal),
					"is-about": __props.page.slug === "about",
					"is-club": unref(club),
					"is-contacts": __props.page.slug === "contacts",
					"is-delivery": __props.page.slug === "delivery"
				}] }, _attrs))}><nav class="sb-breadcrumbs" aria-label="Навигационная цепочка">`);
				_push(ssrRenderComponent(_component_NuxtLink, { to: "/" }, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) _push(`Главная`);
						else return [createTextVNode("Главная")];
					}),
					_: 1
				}, _parent));
				_push(`<span>/</span><span>${ssrInterpolate(__props.page.eyebrow || __props.page.title)}</span></nav><header class="sb-content-hero">`);
				if (__props.page.slug === "about") _push(`<img class="sb-about-hero-logo"${ssrRenderAttr("src", unref(aboutLogoUrl))}${ssrRenderAttr("alt", unref(siteContent).brand.name)}>`);
				else _push(`<!---->`);
				_push(`<div class="sb-content-hero__copy"><p class="sb-kicker">${ssrInterpolate(__props.page.eyebrow)}</p><h1>${ssrInterpolate(unref(legal) ? __props.page.title : unref(heading).main)} `);
				if (!unref(legal) && unref(heading).accent) _push(`<em>${ssrInterpolate(unref(heading).accent)}</em>`);
				else _push(`<!---->`);
				_push(`</h1><p class="sb-content-lead">${ssrInterpolate(__props.page.lead)}</p>`);
				if (__props.page.slug === "about") {
					_push(`<div class="sb-content-actions">`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						class: "sb-primary",
						to: "/catalog"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`Посмотреть коллекцию `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
							} else return [createTextVNode("Посмотреть коллекцию "), createVNode(unref(ArrowRight), { size: 18 })];
						}),
						_: 1
					}, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				if (__props.page.slug === "delivery") {
					_push(`<div class="sb-content-actions">`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						class: "sb-primary",
						to: "/catalog"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(`Перейти в каталог `);
								_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
							} else return [createTextVNode("Перейти в каталог "), createVNode(unref(ArrowRight), { size: 18 })];
						}),
						_: 1
					}, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				if (unref(club)) {
					_push(`<div class="sb-content-actions"><button class="sb-primary">${ssrInterpolate(unref(siteContent).home.club.joinLabel)} `);
					_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent));
					_push(`</button>`);
					_push(ssrRenderComponent(_component_NuxtLink, {
						class: "sb-club-account-link",
						to: "/account"
					}, {
						default: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) {
								_push(ssrRenderComponent(unref(UserRound), {
									size: 19,
									"aria-hidden": "true"
								}, null, _parent, _scopeId));
								_push(`<span${_scopeId}>Мой кабинет</span>`);
							} else return [createVNode(unref(UserRound), {
								size: 19,
								"aria-hidden": "true"
							}), createVNode("span", null, "Мой кабинет")];
						}),
						_: 1
					}, _parent));
					_push(`</div>`);
				} else _push(`<!---->`);
				if (__props.page.slug === "contacts") {
					_push(`<section class="sb-contact-cards" aria-label="Способы связи">`);
					if (unref(contactPhone)) {
						_push(`<a${ssrRenderAttr("href", unref(siteContentPhoneHref)(unref(contactPhone)))} class="sb-contact-card"><span class="sb-contact-card__icon">`);
						_push(ssrRenderComponent(unref(Phone), { size: 20 }, null, _parent));
						_push(`</span><span class="sb-contact-card__text"><small>ПОЗВОНИТЬ НАМ</small><strong>${ssrInterpolate(unref(contactPhone))}</strong></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), {
							class: "sb-contact-card__arrow",
							size: 19
						}, null, _parent));
						_push(`</a>`);
					} else _push(`<!---->`);
					if (unref(contactEmail)) {
						_push(`<a${ssrRenderAttr("href", `mailto:${unref(contactEmail)}`)} class="sb-contact-card"><span class="sb-contact-card__icon">`);
						_push(ssrRenderComponent(unref(Mail), { size: 20 }, null, _parent));
						_push(`</span><span class="sb-contact-card__text"><small>НАПИСАТЬ НА ПОЧТУ</small><strong>${ssrInterpolate(unref(contactEmail))}</strong></span>`);
						_push(ssrRenderComponent(unref(ArrowRight), {
							class: "sb-contact-card__arrow",
							size: 19
						}, null, _parent));
						_push(`</a>`);
					} else _push(`<!---->`);
					_push(`</section>`);
				} else _push(`<!---->`);
				_push(`</div>`);
				if (__props.page.slug === "about") _push(`<figure class="sb-content-photo"><img${ssrRenderAttr("src", unref(storefrontMediaUrl)(unref(siteContent).home.story.portraitUrl))} alt="Светлана Саркисян — основательница SARKISIAN"></figure>`);
				else _push(`<!---->`);
				if (__props.page.slug === "contacts") _push(ssrRenderComponent(_component_SiteContactForm, null, null, _parent));
				else _push(`<!---->`);
				if (__props.page.slug === "delivery") _push(ssrRenderComponent(_component_SitePageArt, {
					kind: __props.page.slug,
					phone: unref(contactPhone),
					email: unref(contactEmail)
				}, null, _parent));
				else _push(`<!---->`);
				if (unref(club)) {
					_push(`<figure class="sb-club-banner sb-club-page-preview">`);
					_push(ssrRenderComponent(_component_SiteLoyaltyPreview, {
						class: "sb-card-tilt",
						onPointerenter: unref(clubTilt).onPointerEnter,
						onPointermove: unref(clubTilt).onPointerMove,
						onPointerleave: unref(clubTilt).onPointerLeave,
						onPointercancel: unref(clubTilt).onPointerCancel
					}, null, _parent));
					_push(`<figcaption>Пример бонусной карты. Ваш баланс — в личном кабинете.</figcaption></figure>`);
				} else _push(`<!---->`);
				_push(`</header>`);
				if (__props.page.reviewRequired) _push(`<aside class="sb-review-notice" role="note"><b>Редакция для новой платформы</b><p>Перед публичным запуском документ должен быть проверен и утверждён оператором. Реквизиты, условия работы и подключённые сервисы необходимо сверить с фактическими данными.</p></aside>`);
				else _push(`<!---->`);
				_push(`<div class="sb-content-layout">`);
				if (__props.page.blocks?.length && !unref(club) && __props.page.slug !== "about" && __props.page.slug !== "contacts" && __props.page.slug !== "delivery") {
					_push(`<aside class="sb-content-toc"><span>На этой странице</span><nav aria-label="Содержание страницы"><!--[-->`);
					ssrRenderList(__props.page.blocks, (block) => {
						_push(`<a${ssrRenderAttr("href", `#${block.id}`)}>${ssrInterpolate(block.title)}</a>`);
					});
					_push(`<!--]--></nav></aside>`);
				} else _push(`<!---->`);
				_push(`<div class="sb-content-sections"><!--[-->`);
				ssrRenderList(__props.page.blocks, (block) => {
					_push(`<!--[-->`);
					if (__props.page.slug === "about" && block.kind === "biography") _push(ssrRenderComponent(_component_SiteFounderBiography, { block }, null, _parent));
					else if (unref(club) && block.id === "referral") _push(ssrRenderComponent(_component_SiteClubReferral, { block }, null, _parent));
					else {
						_push(`<section${ssrRenderAttr("id", block.id)} class="sb-content-block"><h2>${ssrInterpolate(block.title)}</h2><!--[-->`);
						ssrRenderList(paragraphs(block.body), (text, index) => {
							_push(`<p>${ssrInterpolate(text)}</p>`);
						});
						_push(`<!--]-->`);
						if (block.buttonLabel && unref(safeSiteContentUrl)(block.buttonUrl)) _push(ssrRenderComponent(_component_NuxtLink, {
							to: block.buttonUrl,
							class: "sb-primary"
						}, {
							default: withCtx((_, _push, _parent, _scopeId) => {
								if (_push) {
									_push(`${ssrInterpolate(block.buttonLabel)} `);
									_push(ssrRenderComponent(unref(ArrowRight), { size: 16 }, null, _parent, _scopeId));
								} else return [createTextVNode(toDisplayString(block.buttonLabel) + " ", 1), createVNode(unref(ArrowRight), { size: 16 })];
							}),
							_: 2
						}, _parent));
						else _push(`<!---->`);
						_push(`</section>`);
					}
					_push(`<!--]-->`);
				});
				_push(`<!--]--></div></div>`);
				if (__props.page.slug === "contacts" && unref(content).socialLinks.length) {
					_push(`<div class="sb-content-socials"><span>Мы в социальных сетях</span><!--[-->`);
					ssrRenderList(unref(content).socialLinks, (social) => {
						_push(`<a${ssrRenderAttr("href", social.url)} target="_blank" rel="noopener noreferrer">`);
						if (socialIcon(social.iconKey)) _push(`<img${ssrRenderAttr("src", socialIcon(social.iconKey))} alt="">`);
						else _push(`<!---->`);
						_push(`<span>${ssrInterpolate(social.name)}</span></a>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`<footer class="sb-content-help"><div><span>Остались вопросы?</span><h2>Мы рядом, чтобы помочь.</h2></div>`);
				_push(ssrRenderComponent(_component_NuxtLink, {
					class: "sb-primary",
					to: __props.page.slug === "contacts" ? "/catalog" : "/contacts"
				}, {
					default: withCtx((_, _push, _parent, _scopeId) => {
						if (_push) {
							_push(`${ssrInterpolate(__props.page.slug === "contacts" ? "Вернуться к покупкам" : "Связаться с нами")} `);
							_push(ssrRenderComponent(unref(ArrowRight), { size: 18 }, null, _parent, _scopeId));
						} else return [createTextVNode(toDisplayString(__props.page.slug === "contacts" ? "Вернуться к покупкам" : "Связаться с нами") + " ", 1), createVNode(unref(ArrowRight), { size: 18 })];
					}),
					_: 1
				}, _parent));
				_push(`</footer></article>`);
			}
		};
	}
});
// components/storefront/SiteContentPage.vue
var _sfc_setup = SiteContentPage_vue_vue_type_script_setup_true_lang_default.setup;
SiteContentPage_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/storefront/SiteContentPage.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var SiteContentPage_default = Object.assign(SiteContentPage_vue_vue_type_script_setup_true_lang_default, { __name: "SiteContentPage" });

export { SiteContentPage_default as S };;globalThis.__timing__.logEnd('Load chunks/build/SiteContentPage-CgmrDdXN');
//# sourceMappingURL=SiteContentPage-CgmrDdXN.mjs.map
