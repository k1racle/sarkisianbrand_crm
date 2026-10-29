globalThis.__timing__.logStart('Load chunks/build/studio-CWBAbGUb');import { q as useStorefrontPanels, u as useHead, S as SiteShell_default, Z as ClientOnly, p as useStorefront, j as useState, $ as $fetch$1, f as useRuntimeConfig } from '../virtual/entry.mjs';
import { _ as _plugin_vue_export_helper_default } from './_plugin-vue_export-helper-DjkACiAr.mjs';
import { useSSRContext, defineComponent, useId, computed, unref, createVNode, resolveDynamicComponent, mergeProps, ref, shallowRef, watch, nextTick, withCtx } from 'vue';
import { ssrRenderAttrs, ssrRenderAttr, ssrRenderList, ssrRenderVNode, ssrRenderStyle, ssrRenderClass, ssrRenderComponent, ssrInterpolate, ssrIncludeBooleanAttr, ssrLooseContain, ssrLooseEqual } from 'vue/server-renderer';
import { ArrowLeft, ArrowDownToLine, Sparkles, Shirt, Scissors, UserRound, Check, Shuffle, RotateCcw, Play, Flag, Coins, Infinity, PackagePlus, ArrowUpRight, Scan, ZoomIn, MousePointer2, ChevronRight, CheckCheck, Gift, RefreshCw, Copy, Volume2, VolumeX, Settings2, House, Paintbrush, Images, ShoppingBag, CircleHelp, Sun, Star, Clock3, Leaf, Plus, Undo2, LockKeyhole, X, Download } from '@lucide/vue';
import 'nostics';
import 'nostics/formatters/ansi';
import '../_/nitro.mjs';
import 'unhead/server';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:crypto';
import 'node:url';
import '../routes/renderer.mjs';
import 'vue-bundle-renderer/runtime';
import 'devalue';
import 'unhead/utils';
import 'vue-router';

// composables/useStudioRewards.ts
function useStudioRewards() {
	const config = useRuntimeConfig(), { user, authHeaders } = useStorefront();
	const wallet = useState("studio-wallet", () => null), offers = useState("studio-offers", () => []);
	const settings = useState("studio-settings", () => ({
		enabled: true,
		dailyRunLimit: 20,
		minimumRunSeconds: 60
	})), loading = ref(false), error = ref("");
	const api = (path, options = {}) => $fetch$1(`/studio${path}`, {
		baseURL: config.public.apiBase,
		headers: authHeaders.value,
		timeout: 1e4,
		retry: 0,
		...options
	});
	async function refresh() {
		loading.value = true;
		error.value = "";
		const actor = user.value?.id;
		try {
			const catalog = await api("/rewards");
			offers.value = catalog.offers;
			settings.value = catalog.settings;
			if (actor) {
				const next = await api("/me");
				if (user.value?.id === actor) wallet.value = next;
			} else if (!user.value) wallet.value = null;
		} catch (e) {
			error.value = e?.data?.message || "Не удалось загрузить магазин наград. Попробуйте ещё раз.";
		} finally {
			loading.value = false;
		}
	}
	async function start(briefId) {
		return api("/runs", {
			method: "POST",
			body: { briefId }
		});
	}
	async function checkpoint(runId, technique, step) {
		return api(`/runs/${runId}/checkpoint`, {
			method: "POST",
			body: {
				technique,
				step
			}
		});
	}
	async function complete(runId, design) {
		const r = await api(`/runs/${runId}/complete`, {
			method: "POST",
			body: {
				kind: design.kind,
				shape: design.shape,
				length: design.length,
				nails: design.nails.map((n) => ({
					color: n.color,
					pattern: n.pattern
				}))
			}
		});
		if (wallet.value) {
			wallet.value.balance = r.balance;
			wallet.value.activeRun = null;
		}
		return r;
	}
	async function spend(itemId, requestId) {
		const key = `studio-shop:${user.value?.id}:${itemId}`, pending = sessionStorage.getItem(key) || requestId;
		sessionStorage.setItem(key, pending);
		const r = await api("/shop", {
			method: "POST",
			body: {
				itemId,
				requestId: pending
			}
		});
		if (wallet.value) {
			wallet.value.balance = r.balance;
			wallet.value.upgrades = r.upgrades;
		}
		sessionStorage.removeItem(key);
		return r;
	}
	async function buy(offerId) {
		const key = `studio-purchase:${user.value?.id}:${offerId}`;
		const requestId = sessionStorage.getItem(key) || crypto.randomUUID();
		sessionStorage.setItem(key, requestId);
		const result = await api("/rewards/buy", {
			method: "POST",
			body: {
				offerId,
				requestId
			}
		});
		if (wallet.value) wallet.value.balance = result.balance;
		sessionStorage.removeItem(key);
		await refresh();
	}
	watch(() => user.value?.id, () => {
		wallet.value = null;
		refresh();
	});
	return {
		user,
		wallet,
		offers,
		settings,
		loading,
		error,
		refresh,
		start,
		checkpoint,
		complete,
		spend,
		buy
	};
}
// components/sarkisian-studio/character/appearance.ts
var DEFAULT_APPEARANCE = {
	top: "tee",
	bottom: "wide",
	hair: "bob",
	hairColor: "espresso",
	shoes: "sneakers",
	skin: "warm"
};
// components/sarkisian-studio/keri/look.ts
var KERI_STORAGE_KEY = "sarkisian.keri.look.v1";
var KERI_SIZE = {
	width: 948,
	height: 1920
};
var DEFAULT_KERI_LOOK = {
	skin: 2,
	hair: 2,
	hairColor: 6,
	eyes: 1,
	eyeColor: 1,
	top: 4,
	topColor: 6,
	bottom: 1,
	bottomColor: 1,
	faceShape: 1,
	brow: 1,
	lipstick: 1,
	blush: 1,
	eyeshadow: 1,
	eyeliner: 1,
	freckles: 1,
	glasses: 1,
	earrings: 1,
	necklace: 1,
	hairAccessory: 1,
	outfitPattern: 1
};
function keriLayers(look, assetBase) {
	const base = assetBase.replace(/\/?$/, "/");
	const top = look.top > 5 ? [
		4,
		2,
		5
	][look.top - 6] : look.top;
	const bottom = look.bottom > 3 ? [1, 3][look.bottom - 4] : look.bottom;
	const hair = look.hair > 5 ? [
		2,
		5,
		1
	][look.hair - 6] : look.hair;
	return [
		`Base/base${look.skin}.png`,
		`Bottoms/bottom${bottom}_${look.bottomColor}.png`,
		`Tops/top${top}_${look.topColor}.png`,
		`Eyebrows/eyebrows${look.skin}_1.png`,
		`Eyes/eyes${look.eyes}_${look.eyeColor}.png`,
		`Mouth/mouth${look.skin}_1.png`,
		`Hair/hair${hair}_${look.hairColor}.png`
	].map((file) => base + file);
}
var HAIR_COLORS = [
	["Платиновый", "#eadbd1"],
	["Золотистый", "#e6d495"],
	["Песочный", "#cabc8a"],
	["Карамельный", "#b9874f"],
	["Ореховый", "#89623f"],
	["Шоколадный", "#43311d"],
	["Чёрный", "#242020"],
	["Красный", "#a62f35"],
	["Медный", "#d56d61"],
	["Персиковый", "#f2997a"],
	["Розовый", "#dfabc1"],
	["Голубой", "#569dc6"],
	["Сиреневый", "#ad8ed0"],
	["Лавандовый", "#b9b3dc"],
	["Мятный", "#97d1b6"]
];
var SKIN_COLORS = [
	["Фарфоровый", "#ffe5d1"],
	["Светлый", "#f6dfa5"],
	["Золотистый", "#d0a071"],
	["Смуглый", "#b98959"],
	["Тёмный", "#956a44"]
];
var EYE_COLORS = [
	["Карий", "#765047"],
	["Медовый", "#a9763b"],
	["Зелёный", "#527953"],
	["Бирюзовый", "#4f7d72"],
	["Голубой", "#5d98a7"],
	["Синий", "#546eae"],
	["Фиолетовый", "#9a86ad"],
	["Серый", "#9eaca6"],
	["Тёмно-серый", "#696e6b"],
	["Чёрный", "#333838"]
];
var HAIR_NAMES = [
	"Длинные волны",
	"Прямые с чёлкой",
	"Каре",
	"Высокий пучок",
	"Боковой хвост",
	"Два пучка",
	"Боковая коса",
	"Мальвинка"
];
var TOP_NAMES = [
	"Блуза",
	"С рубашкой",
	"Топ с узлом",
	"Футболка",
	"Лонгслив",
	"Фартук мастера",
	"Жилет с рубашкой",
	"Жакет"
];
var BOTTOM_NAMES = [
	"Джинсы",
	"Шорты",
	"Юбка",
	"Брюки",
	"Длинная юбка плиссе"
];
var OUTFIT_COLORS = [
	["Угольный", "#30333b"],
	["Бежевый", "#c8b7a0"],
	["Бордовый", "#82465b"],
	["Лавандовый", "#a99ac0"],
	["Шалфей", "#829584"],
	["Молочный", "#e5ded3"]
];
var LIP_COLORS = [
	["Без помады", "transparent"],
	["Нюд", "#b97775"],
	["Роза", "#b94e72"],
	["Коралловый", "#d76652"],
	["Красный", "#ae243d"],
	["Винный", "#6d2547"],
	["Сливовый", "#814f84"]
];
var BLUSH_COLORS = [
	["Без румян", "transparent"],
	["Персик", "#df9678"],
	["Роза", "#df8fa7"],
	["Тёплый", "#bd8164"],
	["Ягодный", "#bf6487"]
];
var SHADOW_COLORS = [
	["Без теней", "transparent"],
	["Шампань", "#c4a176"],
	["Тауп", "#8e7a76"],
	["Лиловый", "#a078ae"],
	["Пыльная роза", "#bf859b"],
	["Изумрудный", "#5c8b7c"],
	["Смоки", "#514759"]
];
var ACCESSORIES = {
	glasses: [
		"Без очков",
		"Круглые",
		"Кошачьи",
		"Прямоугольные"
	],
	earrings: [
		"Без серёг",
		"Гвоздики",
		"Кольца",
		"Подвески"
	],
	necklace: [
		"Без украшения",
		"Цепочка",
		"Жемчуг",
		"Чокер"
	],
	hairAccessory: [
		"Без аксессуара",
		"Бант",
		"Ободок",
		"Заколка"
	],
	outfitPattern: [
		"Однотонный",
		"Полоска",
		"Горошек",
		"Цветочный"
	]
};
var KERI_PRESETS = [
	{
		name: "Каждый день",
		caption: "Светлая база и деним",
		look: { ...DEFAULT_KERI_LOOK }
	},
	{
		name: "Мягкий акцент",
		caption: "Тёплые оттенки",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 3,
			hairColor: 4,
			top: 2,
			topColor: 2,
			bottom: 3,
			bottomColor: 2
		}
	},
	{
		name: "После студии",
		caption: "Выразительный образ",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 5,
			hairColor: 7,
			top: 1,
			topColor: 3,
			bottom: 2,
			bottomColor: 1
		}
	},
	{
		name: "Новое настроение",
		caption: "Попробуй цвет",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 4,
			hairColor: 13,
			top: 3,
			topColor: 4,
			bottom: 1,
			bottomColor: 2
		}
	},
	{
		name: "В своей студии",
		caption: "Любимое дело",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 6,
			top: 6,
			topColor: 1,
			lipstick: 2,
			earrings: 2
		}
	},
	{
		name: "Вечерний выход",
		caption: "Золото и вино",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 8,
			hairColor: 7,
			top: 8,
			topColor: 3,
			bottom: 5,
			bottomColor: 1,
			lipstick: 6,
			eyeliner: 3,
			earrings: 4,
			necklace: 2
		}
	},
	{
		name: "Творческий день",
		caption: "Яркие детали",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 7,
			hairColor: 11,
			top: 4,
			topColor: 2,
			bottom: 4,
			bottomColor: 4,
			glasses: 2,
			freckles: 2,
			outfitPattern: 2
		}
	},
	{
		name: "Нежность",
		caption: "Свет и пастель",
		look: {
			...DEFAULT_KERI_LOOK,
			hair: 1,
			hairColor: 1,
			top: 7,
			topColor: 6,
			bottom: 5,
			bottomColor: 2,
			blush: 3,
			eyeshadow: 2,
			necklace: 3,
			hairAccessory: 2
		}
	}
];
// components/sarkisian-studio/atelier/progression.ts
var REPUTATION_TIERS = [
	{
		at: 0,
		name: "Первые рекомендации"
	},
	{
		at: 20,
		name: "Мастер на слуху"
	},
	{
		at: 50,
		name: "Любимая студия"
	},
	{
		at: 80,
		name: "Безупречная репутация"
	}
];
function reputationTitle(points) {
	return [...REPUTATION_TIERS].reverse().find((t) => points >= t.at).name;
}
function freshProgression(served = 0) {
	return {
		reputation: 0,
		clients: {},
		shift: {
			number: Math.floor(served / 3) + 1,
			startServed: served,
			visits: []
		}
	};
}
function loyaltyTip(progress, briefId, stars) {
	const trust = progress.clients[briefId]?.trust ?? 0;
	return stars >= 4 && trust >= 2 ? Math.min(45, trust * 8) : 0;
}
function shiftGoals(shift) {
	const v = shift.visits;
	const sets = [
		[
			{
				id: "quality",
				name: "Два приёма на 4–5 звёзд",
				target: 2,
				current: v.filter((x) => x.stars >= 4).length,
				reward: 80
			},
			{
				id: "variety",
				name: "Маникюр и педикюр за смену",
				target: 2,
				current: new Set(v.map((x) => x.kind)).size,
				reward: 70
			},
			{
				id: "precision",
				name: "Два финиша с точностью от 85%",
				target: 2,
				current: v.filter((x) => x.accuracy >= 85).length,
				reward: 60
			}
		],
		[
			{
				id: "return",
				name: "Принять знакомого гостя",
				target: 1,
				current: v.filter((x) => x.returning).length,
				reward: 90
			},
			{
				id: "accent",
				name: "Выполнить заказ с одним акцентом",
				target: 1,
				current: v.filter((x) => x.accent && x.stars >= 4).length,
				reward: 80
			},
			{
				id: "revenue",
				name: "Заработать 600 монет на приёмах",
				target: 600,
				current: v.reduce((sum, x) => sum + x.reward, 0),
				reward: 80
			}
		],
		[
			{
				id: "five",
				name: "Две работы на 5 звёзд",
				target: 2,
				current: v.filter((x) => x.stars === 5).length,
				reward: 100
			},
			{
				id: "colors",
				name: "Три разных основных оттенка",
				target: 3,
				current: new Set(v.map((x) => x.color)).size,
				reward: 90
			},
			{
				id: "steady",
				name: "Три финиша с точностью от 70%",
				target: 3,
				current: v.filter((x) => x.accuracy >= 70).length,
				reward: 100
			}
		]
	];
	return sets[(shift.number - 1) % sets.length].map((g) => ({
		...g,
		current: Math.min(g.target, g.current)
	}));
}
function shiftReward(shift) {
	return 50 + shiftGoals(shift).filter((g) => g.current >= g.target).reduce((sum, g) => sum + g.reward, 0);
}
// components/sarkisian-studio/atelier/supplies.ts
var SUPPLIES = [
	{
		id: "mousse",
		name: "Гель-мусс",
		label: "GEL MOUSSE",
		use: "Удлинённый маникюр",
		price: 100,
		pack: 5,
		bonus: 45,
		shade: "#cba898",
		bottle: false
	},
	{
		id: "speed",
		name: "Скоростной гель",
		label: "SPEED GEL",
		use: "Маникюр естественной длины",
		price: 90,
		pack: 5,
		bonus: 40,
		shade: "#e5cebd",
		bottle: false
	},
	{
		id: "polish",
		name: "Гель-лак",
		label: "GEL POLISH",
		use: "Педикюр",
		price: 75,
		pack: 5,
		bonus: 35,
		shade: "#b3575d",
		bottle: true
	}
];
function supplyById(id) {
	return SUPPLIES.find((s) => s.id === id);
}
function freshSupplies() {
	return {
		stock: {
			mousse: 2,
			speed: 2,
			polish: 2
		},
		spent: 0
	};
}
function supplyFits(id, design) {
	if (id === "polish") return design.kind === "pedicure";
	return design.kind === "manicure" && (id === "mousse" ? design.length === "extended" : design.length !== "extended");
}
// components/sarkisian-studio/manicure-catalog.ts
var COLORS = [
	{
		id: "rose",
		name: "Пудровый нюд",
		hex: "#d9a394",
		family: "nude"
	},
	{
		id: "milk",
		name: "Молочная вуаль",
		hex: "#eee4d8",
		family: "nude"
	},
	{
		id: "peach",
		name: "Персиковый шёлк",
		hex: "#d99b7e",
		family: "nude"
	},
	{
		id: "mauve",
		name: "Пыльная роза",
		hex: "#b98089",
		family: "nude"
	},
	{
		id: "red",
		name: "Красный бархат",
		hex: "#af3037",
		family: "red"
	},
	{
		id: "wine",
		name: "Вишнёвый вечер",
		hex: "#642d3b",
		family: "red"
	},
	{
		id: "sage",
		name: "Шалфей",
		hex: "#8f9a84",
		family: "nature"
	},
	{
		id: "black",
		name: "Чёрный шёлк",
		hex: "#28282c",
		family: "dark"
	},
	{
		id: "lavender",
		name: "Лавандовый сон",
		hex: "#b0a2cf",
		family: "pastel"
	},
	{
		id: "blue",
		name: "Небесный шёлк",
		hex: "#9fbec9",
		family: "pastel"
	},
	{
		id: "porcelain",
		name: "Фарфоровый",
		hex: "#fff8ee",
		family: "nude"
	},
	{
		id: "latte",
		name: "Латте",
		hex: "#c4a18d",
		family: "nude"
	},
	{
		id: "sand",
		name: "Тёплый песок",
		hex: "#d9bf9e",
		family: "nude"
	},
	{
		id: "cocoa",
		name: "Какао",
		hex: "#8c6756",
		family: "nude"
	},
	{
		id: "taupe",
		name: "Тауп",
		hex: "#9d8c86",
		family: "nude"
	},
	{
		id: "ballet",
		name: "Балетная роза",
		hex: "#f2c6d2",
		family: "pastel"
	},
	{
		id: "lilac",
		name: "Сиреневая дымка",
		hex: "#d6bde6",
		family: "pastel"
	},
	{
		id: "mint",
		name: "Мятное облако",
		hex: "#b9ddd0",
		family: "pastel"
	},
	{
		id: "lemon",
		name: "Лимонный крем",
		hex: "#f4e9a3",
		family: "pastel"
	},
	{
		id: "periwinkle",
		name: "Барвинок",
		hex: "#a0abdb",
		family: "pastel"
	},
	{
		id: "coral",
		name: "Коралловый риф",
		hex: "#ee7968",
		family: "bright"
	},
	{
		id: "fuchsia",
		name: "Фуксия",
		hex: "#d82b83",
		family: "bright"
	},
	{
		id: "tangerine",
		name: "Мандариновый",
		hex: "#f29338",
		family: "bright"
	},
	{
		id: "lime",
		name: "Лайм",
		hex: "#b7d949",
		family: "bright"
	},
	{
		id: "electric",
		name: "Электрик",
		hex: "#3158d7",
		family: "bright"
	},
	{
		id: "raspberry",
		name: "Малиновый сорбет",
		hex: "#be3461",
		family: "red"
	},
	{
		id: "scarlet",
		name: "Алый закат",
		hex: "#e0433b",
		family: "red"
	},
	{
		id: "burgundy",
		name: "Бордо",
		hex: "#4e1f34",
		family: "red"
	},
	{
		id: "terracotta",
		name: "Терракота",
		hex: "#ba6652",
		family: "red"
	},
	{
		id: "plum",
		name: "Спелая слива",
		hex: "#724262",
		family: "dark"
	},
	{
		id: "emerald",
		name: "Изумруд",
		hex: "#286859",
		family: "nature"
	},
	{
		id: "olive",
		name: "Оливковый",
		hex: "#78814c",
		family: "nature"
	},
	{
		id: "forest",
		name: "Хвойный лес",
		hex: "#25483e",
		family: "nature"
	},
	{
		id: "ocean",
		name: "Глубокий океан",
		hex: "#24687c",
		family: "nature"
	},
	{
		id: "denim",
		name: "Деним",
		hex: "#596e9f",
		family: "dark"
	},
	{
		id: "midnight",
		name: "Полночь",
		hex: "#202c48",
		family: "dark"
	},
	{
		id: "graphite",
		name: "Графит",
		hex: "#626169",
		family: "dark"
	},
	{
		id: "silver",
		name: "Жидкое серебро",
		hex: "#c7cbd3",
		family: "metal"
	},
	{
		id: "champagne",
		name: "Шампань",
		hex: "#d8bc82",
		family: "metal"
	},
	{
		id: "copper",
		name: "Розовая медь",
		hex: "#c28b73",
		family: "metal"
	}
];
var COLOR_FAMILIES = [
	{
		id: "all",
		name: "Все оттенки"
	},
	{
		id: "nude",
		name: "Нюд"
	},
	{
		id: "pastel",
		name: "Пастель"
	},
	{
		id: "red",
		name: "Красные"
	},
	{
		id: "bright",
		name: "Яркие"
	},
	{
		id: "nature",
		name: "Природные"
	},
	{
		id: "dark",
		name: "Глубокие"
	},
	{
		id: "metal",
		name: "Металлик"
	}
];
var PATTERNS = [
	{
		id: "plain",
		name: "Однотонный"
	},
	{
		id: "french",
		name: "Френч"
	},
	{
		id: "dots",
		name: "Жемчуг"
	},
	{
		id: "gold",
		name: "Золотой акцент"
	},
	{
		id: "colored-french",
		name: "Цветной френч"
	},
	{
		id: "ombre",
		name: "Градиент"
	},
	{
		id: "marble",
		name: "Мрамор"
	},
	{
		id: "swirl",
		name: "Волны"
	},
	{
		id: "diagonal",
		name: "Геометрия"
	},
	{
		id: "hearts",
		name: "Сердца"
	},
	{
		id: "flowers",
		name: "Цветы"
	},
	{
		id: "stars",
		name: "Звёзды"
	},
	{
		id: "leopard",
		name: "Леопард"
	},
	{
		id: "checker",
		name: "Шахматный"
	},
	{
		id: "aura",
		name: "Аура"
	},
	{
		id: "negative",
		name: "Воздушные линии"
	},
	{
		id: "moon",
		name: "Лунный"
	},
	{
		id: "confetti",
		name: "Конфетти"
	}
];
var FINISHES = [
	{
		id: "glossy",
		name: "Глянцевый"
	},
	{
		id: "matte",
		name: "Матовый"
	},
	{
		id: "shimmer",
		name: "Шиммер"
	},
	{
		id: "cat-eye",
		name: "Кошачий глаз"
	},
	{
		id: "chrome",
		name: "Хром"
	}
];
var NAIL_SHAPES = [
	{
		id: "almond",
		name: "Миндаль"
	},
	{
		id: "oval",
		name: "Овал"
	},
	{
		id: "square",
		name: "Мягкий квадрат"
	},
	{
		id: "stiletto",
		name: "Стилет"
	},
	{
		id: "coffin",
		name: "Балерина"
	},
	{
		id: "round",
		name: "Круг"
	}
];
var NAIL_LENGTHS = [
	{
		id: "short",
		name: "Короткая"
	},
	{
		id: "natural",
		name: "Естественная"
	},
	{
		id: "extended",
		name: "Удлинённая"
	},
	{
		id: "long",
		name: "Экстра-длина"
	}
];
var colorHex = (id) => COLORS.find((c) => c.id === id)?.hex ?? "#e5bbac";
// components/sarkisian-studio/atelier/preparation.ts
var TECHNIQUES = [
	{
		id: "combined",
		name: "Комбинированный"
	},
	{
		id: "hardware",
		name: "Аппаратный"
	},
	{
		id: "classic",
		name: "Классический"
	}
];
var TOOLS = [
	{
		id: "wipe",
		name: "Салфетка",
		kind: "wipe"
	},
	{
		id: "carbide",
		name: "Фреза «Кукуруза»",
		kind: "drill"
	},
	{
		id: "remover",
		name: "Ремувер",
		kind: "bottle"
	},
	{
		id: "pusher",
		name: "Пушер",
		kind: "pusher"
	},
	{
		id: "flame",
		name: "Фреза «Пламя»",
		kind: "drill"
	},
	{
		id: "scissors",
		name: "Ножницы",
		kind: "scissors"
	},
	{
		id: "nippers",
		name: "Кусачки",
		kind: "scissors"
	},
	{
		id: "ball",
		name: "Фреза «Шар»",
		kind: "drill"
	},
	{
		id: "file",
		name: "Пилка",
		kind: "file"
	},
	{
		id: "buff",
		name: "Баф",
		kind: "buff"
	},
	{
		id: "base",
		name: "База",
		kind: "bottle"
	}
];
var PREP_STEPS = [
	{
		id: "clean",
		name: "Очищение",
		hint: "Проведите салфеткой по всей поверхности ногтя.",
		tools: ["wipe"],
		zone: "plate"
	},
	{
		id: "remove",
		name: "Снятие покрытия",
		hint: "Снимите старый цвет с ногтевой пластины выбранным инструментом.",
		tools: ["carbide", "remover"],
		zone: "plate"
	},
	{
		id: "push",
		name: "Поднятие кутикулы",
		hint: "Пройдите по подсвеченной дуге у основания ногтя.",
		tools: ["pusher"],
		zone: "cuticle"
	},
	{
		id: "pocket",
		name: "Боковые валики",
		hint: "Обработайте подсвеченные края фрезой «Пламя».",
		tools: ["flame"],
		zone: "sides"
	},
	{
		id: "cut",
		name: "Удаление кутикулы",
		hint: "Ведите инструмент вдоль подсвеченной дуги.",
		tools: [
			"scissors",
			"nippers",
			"ball"
		],
		zone: "cuticle"
	},
	{
		id: "polish",
		name: "Полировка кутикулы",
		hint: "Завершите обработку дуги фрезой «Шар».",
		tools: ["ball"],
		zone: "cuticle"
	},
	{
		id: "shape",
		name: "Опил формы",
		hint: "Пройдите пилкой по свободному краю ногтя.",
		tools: ["file"],
		zone: "tip"
	},
	{
		id: "buff",
		name: "Шлифовка",
		hint: "Уберите неровности бафом по поверхности ногтя.",
		tools: ["buff"],
		zone: "plate"
	},
	{
		id: "base",
		name: "Нанесение базы",
		hint: "Распределите базу по ногтю перед цветным покрытием.",
		tools: ["base"],
		zone: "plate"
	}
];
function preparationSteps(technique) {
	return PREP_STEPS.filter((step) => technique !== "classic" || !["pocket", "polish"].includes(step.id)).map((step) => ({
		...step,
		tools: step.id === "remove" ? [technique === "classic" ? "remover" : "carbide"] : step.id === "cut" ? technique === "hardware" ? ["ball"] : ["scissors", "nippers"] : step.tools
	})).filter((step) => technique !== "hardware" || step.id !== "polish");
}
function freshPreparation(technique = "combined") {
	return {
		technique,
		tool: "wipe",
		progress: {}
	};
}
function currentPrepStep(prep) {
	return preparationSteps(prep.technique).find((s) => !prep.progress[s.id]?.every((p) => p === 100));
}
function preparedNails(prep) {
	return [
		0,
		1,
		2,
		3,
		4
	].filter((i) => preparationSteps(prep.technique).every((s) => prep.progress[s.id]?.[i] === 100));
}
function prepProgress(prep) {
	const steps = preparationSteps(prep.technique);
	return Math.round(steps.reduce((total, step) => total + (prep.progress[step.id] ?? []).reduce((sum, p) => sum + p, 0), 0) / (steps.length * 5));
}
// components/sarkisian-studio/model.ts
var QUESTS = [
	{
		id: "first-french",
		title: "Твой первый френч",
		brief: "Начнём с классики. Выбери пудровый нюд и добавь тонкую белую улыбку на каждый ноготь. Дизайн, который всегда к месту.",
		reward: 150,
		kind: "manicure",
		steps: [
			"Выбери «Пудровый нюд»",
			"Добавь френч на все 5 ногтей",
			"Сохрани работу в портфолио"
		]
	},
	{
		id: "cherry-evening",
		title: "Вишнёвый вечер",
		brief: "Создадим вечерний образ: вишнёвое покрытие на всех ногтях и золотой акцент хотя бы на одном.",
		reward: 200,
		kind: "manicure",
		steps: [
			"Выбери «Вишнёвый вечер»",
			"Добавь золотой акцент",
			"Сохрани готовый маникюр"
		]
	},
	{
		id: "pedicure-milk",
		title: "Лёгкость в каждом шаге",
		brief: "Время для педикюра. Молочное однотонное покрытие подчеркнёт любой летний образ.",
		reward: 200,
		kind: "pedicure",
		steps: [
			"Открой педикюр",
			"Нанеси «Молочную вуаль» на 5 ногтей",
			"Выбери однотонный дизайн и сохрани"
		]
	}
];
function blankDesign(kind = "manicure") {
	return {
		kind,
		nails: Array.from({ length: 5 }, () => ({
			color: null,
			pattern: "plain"
		}))
	};
}
function freshState() {
	return {
		version: 1,
		designs: [],
		completed: [],
		activeQuest: null,
		volume: .3,
		track: 0,
		playerName: "Моя студия",
		career: freshCareer(),
		appearance: { ...DEFAULT_APPEARANCE },
		keriLook: { ...DEFAULT_KERI_LOOK },
		work: null,
		supplies: freshSupplies()
	};
}
function isComplete(design) {
	return design.nails.length === 5 && design.nails.every((n) => n.color !== null);
}
function coinBalance(state) {
	return 1250 + QUESTS.filter((q) => state.completed.includes(q.id)).reduce((sum, q) => sum + q.reward, 0) + state.career.earnings - UPGRADES.filter((u) => state.career.upgrades.includes(u.id)).reduce((sum, u) => sum + u.price, 0) - state.supplies.spent;
}
function nextQuest(state) {
	return QUESTS.find((q) => !state.completed.includes(q.id));
}
var UPGRADES = [
	{
		id: "organizer",
		name: "Органайзер мастера",
		price: 350,
		benefit: "Подготовка всех пяти ногтей одной кнопкой. Меньше рутины — больше дизайна.",
		icon: "01"
	},
	{
		id: "lamp",
		name: "Рабочая лампа",
		price: 550,
		benefit: "Более широкая зона точности на финальном штрихе. Легче получить бонус за аккуратность.",
		icon: "02"
	},
	{
		id: "pastel",
		name: "Коллекция Pastel",
		price: 600,
		benefit: "Два новых оттенка: лавандовый и небесный. Открывает новые запросы посетителей.",
		icon: "03"
	}
];
var ORDERS = [
	{
		id: "anna-french",
		customer: "Анна",
		title: "На важную встречу",
		wish: "Хочу спокойный пудровый френч на всех ногтях.",
		kind: "manicure",
		color: "rose",
		pattern: "french",
		accent: null,
		reward: 180,
		shape: "almond",
		length: "natural"
	},
	{
		id: "mila-evening",
		customer: "Мила",
		title: "Вечер в городе",
		wish: "Вишнёвый маникюр. Золото — только на ногте № 4, остальные однотонные.",
		kind: "manicure",
		color: "wine",
		pattern: "gold",
		accent: 3,
		reward: 240,
		shape: "square",
		length: "extended"
	},
	{
		id: "lera-holiday",
		customer: "Лера",
		title: "Чемодан собран",
		wish: "Молочный педикюр, однотонный и без акцентов.",
		kind: "pedicure",
		color: "milk",
		pattern: "plain",
		accent: null,
		reward: 200
	},
	{
		id: "sonya-sage",
		customer: "Соня",
		title: "Ближе к природе",
		wish: "Шалфей на всех ногтях и жемчуг только на ногте № 3.",
		kind: "manicure",
		color: "sage",
		pattern: "dots",
		accent: 2,
		reward: 230,
		shape: "oval",
		length: "natural"
	},
	{
		id: "eva-black",
		customer: "Ева",
		title: "Маленькое чёрное",
		wish: "Чёрное покрытие, тонкий золотой акцент на каждом ногте.",
		kind: "manicure",
		color: "black",
		pattern: "gold",
		accent: null,
		reward: 250,
		shape: "almond",
		length: "extended"
	},
	{
		id: "ira-peach",
		customer: "Ира",
		title: "Персиковое утро",
		wish: "Однотонный персиковый педикюр — под новые босоножки.",
		kind: "pedicure",
		color: "peach",
		pattern: "plain",
		accent: null,
		reward: 190
	},
	{
		id: "asya-lavender",
		customer: "Ася",
		title: "Лавандовое настроение",
		wish: "Лавандовый оттенок и жемчуг на всех ногтях.",
		kind: "manicure",
		color: "lavender",
		pattern: "dots",
		accent: null,
		reward: 290,
		requires: "pastel",
		shape: "oval",
		length: "extended"
	},
	{
		id: "nina-blue",
		customer: "Нина",
		title: "Выше облаков",
		wish: "Небесный педикюр с френчем на каждом ногте.",
		kind: "pedicure",
		color: "blue",
		pattern: "french",
		accent: null,
		reward: 280,
		requires: "pastel"
	},
	{
		id: "dasha-shoot",
		customer: "Даша",
		title: "Съёмка новой коллекции",
		wish: "Для съёмки нужен красный маникюр. Один золотой акцент — на ногте № 3.",
		kind: "manicure",
		color: "red",
		pattern: "gold",
		accent: 2,
		reward: 340,
		shape: "square",
		length: "extended",
		reputation: 20
	},
	{
		id: "olga-wedding",
		customer: "Ольга",
		title: "Тот самый день",
		wish: "Нежный молочный маникюр с жемчугом на каждом ногте. Хочу сохранить его на свадебных фотографиях.",
		kind: "manicure",
		color: "milk",
		pattern: "dots",
		accent: null,
		reward: 360,
		shape: "oval",
		length: "extended",
		reputation: 50
	},
	{
		id: "vika-marble",
		customer: "Вика",
		title: "Камень и шёлк",
		wish: "Латте и мрамор на каждом ногте. Форма — балерина, удлинённая.",
		kind: "manicure",
		color: "latte",
		pattern: "marble",
		accent: null,
		reward: 310,
		shape: "coffin",
		length: "extended"
	},
	{
		id: "alice-flowers",
		customer: "Алиса",
		title: "Цветочное настроение",
		wish: "Балетная роза и цветы на каждом ногте. Короткий круг.",
		kind: "manicure",
		color: "ballet",
		pattern: "flowers",
		accent: null,
		reward: 300,
		shape: "round",
		length: "short"
	},
	{
		id: "polina-sky",
		customer: "Полина",
		title: "Переход цвета",
		wish: "Барвинок с градиентом на всех ногтях. Удлинённый овал.",
		kind: "manicure",
		color: "periwinkle",
		pattern: "ombre",
		accent: null,
		reward: 320,
		shape: "oval",
		length: "extended"
	},
	{
		id: "rita-swirl",
		customer: "Рита",
		title: "Ритм города",
		wish: "Яркая фуксия и волны на каждом ногте. Длинный стилет.",
		kind: "manicure",
		color: "fuchsia",
		pattern: "swirl",
		accent: null,
		reward: 350,
		shape: "stiletto",
		length: "long"
	},
	{
		id: "zoya-moon",
		customer: "Зоя",
		title: "Лунная дорожка",
		wish: "Изумрудный лунный маникюр. Миндаль естественной длины.",
		kind: "manicure",
		color: "emerald",
		pattern: "moon",
		accent: null,
		reward: 300,
		shape: "almond",
		length: "natural"
	},
	{
		id: "lisa-hearts",
		customer: "Лиза",
		title: "Тёплые чувства",
		wish: "Малиновый цвет и сердца только на ногте № 4. Короткий квадрат.",
		kind: "manicure",
		color: "raspberry",
		pattern: "hearts",
		accent: 3,
		reward: 310,
		shape: "square",
		length: "short"
	},
	{
		id: "taya-geometric",
		customer: "Тая",
		title: "Чистая геометрия",
		wish: "Графит и геометрия на всех ногтях. Балерина, экстра-длина.",
		kind: "manicure",
		color: "graphite",
		pattern: "diagonal",
		accent: null,
		reward: 350,
		shape: "coffin",
		length: "long"
	},
	{
		id: "masha-summer",
		customer: "Маша",
		title: "Лето близко",
		wish: "Коралловый педикюр с цветным френчем на всех ногтях.",
		kind: "pedicure",
		color: "coral",
		pattern: "colored-french",
		accent: null,
		reward: 290
	},
	{
		id: "yana-leopard",
		customer: "Яна",
		title: "Дикий акцент",
		wish: "Песочный цвет, леопард только на ногте № 3. Длинный миндаль.",
		kind: "manicure",
		color: "sand",
		pattern: "leopard",
		accent: 2,
		reward: 330,
		shape: "almond",
		length: "long"
	},
	{
		id: "kira-stars",
		customer: "Кира",
		title: "Звёздная ночь",
		wish: "Полночь и звёзды на всех ногтях. Длинный стилет.",
		kind: "manicure",
		color: "midnight",
		pattern: "stars",
		accent: null,
		reward: 380,
		shape: "stiletto",
		length: "long",
		reputation: 20
	},
	{
		id: "nelli-checker",
		customer: "Нелли",
		title: "Смелые сочетания",
		wish: "Лайм и шахматный рисунок на всех ногтях. Короткий квадрат.",
		kind: "manicure",
		color: "lime",
		pattern: "checker",
		accent: null,
		reward: 340,
		shape: "square",
		length: "short"
	},
	{
		id: "dina-aura",
		customer: "Дина",
		title: "Мягкое свечение",
		wish: "Сиреневая дымка с аурой на каждом ногте. Естественный овал.",
		kind: "manicure",
		color: "lilac",
		pattern: "aura",
		accent: null,
		reward: 330,
		shape: "oval",
		length: "natural"
	}
];
function freshCareer() {
	return {
		...freshProgression(),
		served: 0,
		earnings: 0,
		stars: 0,
		upgrades: [],
		active: null
	};
}
function studioLevel(state) {
	return 1 + Math.floor(state.career.served / 3);
}
function availableColors(state) {
	return COLORS.filter((c) => !["lavender", "blue"].includes(c.id) || state.career.upgrades.includes("pastel"));
}
function availableOrders(state) {
	const seen = new Set(state.career.shift.visits.map((v) => v.briefId));
	const unlocked = ORDERS.filter((o) => !seen.has(o.id) && (!o.requires || state.career.upgrades.includes(o.requires)) && (!o.reputation || state.career.reputation >= o.reputation));
	const returning = unlocked.filter((o) => state.career.clients[o.id]).sort((a, b) => state.career.clients[a.id].lastVisit - state.career.clients[b.id].lastVisit)[0];
	const special = unlocked.filter((o) => o.reputation && !state.career.clients[o.id])[0];
	const base = ORDERS.filter((o) => !o.requires && !o.reputation);
	const rotated = Array.from({ length: base.length }, (_, i) => base[(state.career.served + i) % base.length]).filter((o) => !seen.has(o.id));
	const candidates = [];
	if (special) candidates.push(special);
	if (state.career.upgrades.includes("pastel")) {
		const premium = unlocked.filter((o) => o.requires === "pastel");
		if (premium.length) candidates.push(premium[state.career.served % premium.length]);
	}
	candidates.push(candidates.length >= 2 && returning ? returning : rotated[0]);
	if (returning) candidates.push(returning);
	candidates.push(...rotated);
	return candidates.filter((o, i) => candidates.findIndex((c) => c.id === o.id) === i).slice(0, 3);
}
function buySupply(state, id, balance = coinBalance(state)) {
	const item = supplyById(id);
	if (!item) throw new Error("Материал не найден.");
	if (state.supplies.stock[id] + item.pack > 30) throw new Error("На полке уже достаточно этого материала.");
	if (balance < item.price) throw new Error("Не хватает игровых монет. Базовый набор всегда доступен бесплатно.");
	return {
		...state,
		supplies: {
			spent: state.supplies.spent + item.price,
			stock: {
				...state.supplies.stock,
				[id]: state.supplies.stock[id] + item.pack
			}
		}
	};
}
function chooseSupply(state, id) {
	const work = state.work;
	if (!work || work.serial === null || work.serial !== state.career.active?.serial) throw new Error("Материалы с полки выбираются для приёма клиента.");
	if (work.stage === "finish") throw new Error("Материал нужно выбрать до финального штриха.");
	if (id !== null && (!supplyById(id) || !state.supplies.stock[id])) throw new Error("Материал закончился. Пополните полку или выберите базовый набор.");
	return {
		...state,
		work: {
			...work,
			supply: id
		}
	};
}
function activeBrief(state) {
	const order = ORDERS.find((o) => o.id === state.career.active?.briefId);
	return order && !state.career.active?.fitted ? {
		...order,
		shape: void 0,
		length: void 0
	} : order;
}
function newWork(kind, serial = null) {
	return {
		serial,
		design: blankDesign(kind),
		prepared: [],
		preparation: freshPreparation(),
		stage: "prepare",
		accuracy: null,
		supply: null
	};
}
// components/sarkisian-studio/nail-effects.ts
function nailMarks(nail) {
	const out = [], accent = colorHex(nail.accentColor ?? "porcelain");
	const circle = (x, y, r, fill = accent) => out.push({
		tag: "circle",
		attrs: {
			cx: x,
			cy: y,
			r,
			fill
		}
	});
	const path = (d, fill = "none", stroke = accent, width = 3) => out.push({
		tag: "path",
		attrs: {
			d,
			fill,
			stroke,
			"stroke-width": width,
			"stroke-linecap": "round",
			"stroke-linejoin": "round"
		}
	});
	if (nail.finish === "shimmer" || nail.pattern === "confetti") for (let i = 0; i < 36; i++) circle(8 + i * 29 % 85, 7 + i * 37 % 86, i % 3 === 0 ? 1.5 : .65, i % 2 ? "#ffffffbb" : "#e6c47e");
	if (nail.finish === "cat-eye") out.push({
		tag: "ellipse",
		attrs: {
			cx: 52,
			cy: 48,
			rx: 11,
			ry: 67,
			fill: "#fff5dc88",
			transform: "rotate(34 50 50)"
		}
	});
	if (nail.pattern === "french" || nail.pattern === "colored-french") out.push({
		tag: "ellipse",
		attrs: {
			cx: 50,
			cy: -10,
			rx: 80,
			ry: 26,
			fill: nail.pattern === "french" ? "#fffaf3" : accent
		}
	});
	if (nail.pattern === "dots") [
		32,
		50,
		68
	].forEach((y) => circle(50, y, 5, "#fffaf3"));
	if (nail.pattern === "gold") path("M0 80C100 70 0 35 100 20", "none", "#d9b15d", 5.5);
	if (nail.pattern === "marble") {
		path("M-10 5Q85 22 38 48T110 101", "none", accent, 2.6);
		path("M0 17Q90 20 50 50T115 80", "none", "#ffffff66", 1.2);
		path("M62 0Q48 21 75 36T85 65", "none", "#d2af6b", 1.4);
	}
	if (nail.pattern === "swirl") {
		path("M-8 97C100 88 -10 5 110 12", "none", accent, 7);
		path("M-10 76C75 66 22 5 90 -10", "none", "#ffffff88", 2);
	}
	if (nail.pattern === "diagonal") {
		path("M-5 72L105 12V-5H-5Z", accent, accent, 0);
		path("M-5 88L105 28", "none", "#d6b06c", 2);
	}
	if (nail.pattern === "negative") {
		path("M15 110Q80 58 24 -10", "none", accent, 3);
		path("M78 110Q18 52 81 -10", "none", accent, 2);
	}
	if (nail.pattern === "moon") out.push({
		tag: "ellipse",
		attrs: {
			cx: 50,
			cy: 105,
			rx: 37,
			ry: 25,
			fill: accent
		}
	});
	if (nail.pattern === "hearts") for (const [x, y, s] of [
		[
			32,
			28,
			.7
		],
		[
			65,
			57,
			.9
		],
		[
			33,
			82,
			.5
		]
	]) {
		path(`M${x} ${y}c-25 -17 -22 -34 -9 -28q9 2 9 9q0 -7 9 -9c13 -6 16 11 -9 28Z`, accent, "none", 0);
		out[out.length - 1].attrs.transform = `translate(${x * (1 - s)} ${y * (1 - s)}) scale(${s})`;
	}
	if (nail.pattern === "flowers") for (const [x, y] of [[35, 31], [65, 67]]) {
		for (let k = 0; k < 5; k++) circle(x + Math.cos(k * Math.PI * .4) * 11, y + Math.sin(k * Math.PI * .4) * 11, 6);
		circle(x, y, 4, "#d9b15d");
	}
	if (nail.pattern === "stars") for (const [x, y, r] of [
		[
			30,
			28,
			13
		],
		[
			68,
			58,
			16
		],
		[
			36,
			82,
			8
		]
	]) path(`M${x} ${y - r}L${x + 3} ${y - 3}L${x + r} ${y}L${x + 3} ${y + 3}L${x} ${y + r}L${x - 3} ${y + 3}L${x - r} ${y}L${x - 3} ${y - 3}Z`, accent, "none", 0);
	if (nail.pattern === "leopard") for (let i = 0; i < 10; i++) {
		const x = 15 + i * 31 % 70, y = 15 + i * 23 % 72;
		circle(x, y, 7, accent);
		path(`M${x - 7} ${y - 4}q-5 10 5 13m10 -15q8 4 3 11`, "none", "#382b32", 2.6);
	}
	if (nail.pattern === "checker") {
		for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) if ((x + y) % 2 === 0) out.push({
			tag: "rect",
			attrs: {
				x: x * 25,
				y: y * 20,
				width: 25,
				height: 20,
				fill: accent
			}
		});
	}
	return out;
}
// components/sarkisian-studio/anatomy.ts
function handNail(left, right, body, tip, details) {
	const path = `M${left.join(" ")}${body}`;
	return {
		...details,
		path: `${path}${tip}Z`,
		bed: {
			path,
			left,
			right
		}
	};
}
var PHOTO_HAND = [
	handNail([403, 319], [439.5, 323], "C400 334 400 355 401.5 370C402 381 407 387 417 388.2C426 389 436 384.5 440.5 377C445 368 445 354 442.8 340L439.5 323", "C437.5 314 436 309 432 305C426 298 416 300 410 306C406 310 404 315 403 319", {
		x: 400,
		y: 300,
		w: 45,
		h: 89,
		frame: {
			cx: 418,
			cy: 388,
			w: 44,
			h: 88,
			angle: 1
		},
		cuticle: "M401.5 370C402 381 407 387 417 388.2C426 389 436 384.5 440.5 377",
		sidewalls: "M401 337C400 349 400.5 360 401.5 370M442.8 340C445 354 445 368 440.5 377",
		freeEdge: "M403 319C404 315 406 310 410 306C416 300 426 298 432 305C436 309 437.5 314 439.5 323"
	}),
	handNail([556, 145], [598, 143], "C552 160 550.5 182 551.5 202C552 216 553.5 222 561 225.5C568.5 229.5 579 229.5 588 225C599 222 603 214 604 201C605 180 603 158 598 143", "C595 131 589 125 580 124.5C569 124 560 131 556 145", {
		x: 550.5,
		y: 124.5,
		w: 54,
		h: 105,
		frame: {
			cx: 574,
			cy: 229,
			w: 54,
			h: 105,
			angle: 3
		},
		cuticle: "M552 211C553 221 556 224 561 225.5C568.5 229.5 579 229.5 588 225C597 222.5 601 216 603 208",
		sidewalls: "M552 163C550.5 177 550.5 193 551.5 205M602 163C604.5 178 605 193 603.5 207",
		freeEdge: "M556 145C560 131 569 124 580 124.5C589 125 595 131 598 143"
	}),
	handNail([701, 73], [751, 76], "C697 86 695 106 695.5 126C695.5 142 698.5 151 706 156.5C715 163 730 163.5 741 158.5C752 154 757 146 757.5 132C759 113 756 91 751 76", "C746 59 737 51 726 51.5C714 51.5 705 59 701 73", {
		x: 695,
		y: 51.5,
		w: 63,
		h: 111,
		frame: {
			cx: 725.5,
			cy: 162,
			w: 63,
			h: 110.5,
			angle: 0
		},
		cuticle: "M697.5 144C699 150 702 154 706 156.5C715 163 730 163.5 741 158.5C749 155 754 150 756 143",
		sidewalls: "M697 94C695 106 695 123 696 136M755 94C758 109 759 122 757 138",
		freeEdge: "M701 73C705 59 714 51.5 726 51.5C737 51 746 59 751 76"
	}),
	handNail([847, 151], [885, 148], "C842.5 165 838.5 182 839 202C839 215 842 222 850.5 226C860 230.5 873 230 881.5 226C889 222 892.5 215 893 201C894.5 180 890 161 885 148", "C880.5 135 875 129.5 866 129.5C856.5 129.5 851 136.5 847 151", {
		x: 838.5,
		y: 129.5,
		w: 55,
		h: 101,
		frame: {
			cx: 865.5,
			cy: 229,
			w: 54,
			h: 100,
			angle: 0
		},
		cuticle: "M839.5 209C840.5 218 844 223 850.5 226C860 230.5 873 230 881.5 226C887 223 890.5 217 892 209",
		sidewalls: "M842 167C840 178 838.5 190 839 205M890 166C893 179 894 191 893 205",
		freeEdge: "M847 151C851 136.5 856.5 129.5 866 129.5C875 129.5 880.5 135 885 148"
	}),
	handNail([1083, 514], [1138.5, 515], "C1070 530 1057.5 554 1055.5 572C1054.5 582 1057 589 1064 595C1073 602.5 1084 610 1092.5 610.5C1100 610.5 1110 592 1119 574C1129 554 1136 530 1138.5 515", "C1139.5 505 1131 494 1121 494C1108 494 1093 502 1083 514", {
		x: 1055,
		y: 494,
		w: 84,
		h: 117,
		angle: 14,
		frame: {
			cx: 1092.5,
			cy: 610.5,
			w: 67,
			h: 119,
			angle: 14
		},
		cuticle: "M1057 584C1060 593 1073 602.5 1084 609C1092.5 614 1098 609 1106 596",
		sidewalls: "M1067 535C1060 548 1056 563 1055.5 576M1133 539C1129 552 1124 564 1119 574",
		freeEdge: "M1083 514C1093 502 1108 494 1121 494C1131 494 1139.5 505 1138.5 515"
	})
];
var PHOTO_FOOT = [
	{
		path: "M518 397C516.5 404 516 411 518 416C521 422 535 421 541 417C545 413 546 404 545 397C544.5 390 539 386.5 532 387C525 386.5 520.5 390 518 397Z",
		x: 516.5,
		y: 386.5,
		w: 29.5,
		h: 35,
		cuticle: "M517.5 414C519 423 535 423 542 416",
		sidewalls: "M517 398L516.5 412M545 398L544 412",
		freeEdge: "M518 397C520.5 390 525 386.5 532 387C539 386.5 544.5 390 545 397"
	},
	{
		path: "M575 339C574.5 349 575 357 578 361C584 366 601 365 608 360C612 355 613 346 612 338C610 330 601 326 592 326C583 326 577 331 575 339Z",
		x: 574.5,
		y: 326,
		w: 38,
		h: 39,
		cuticle: "M576 356C577 366 598 369 609 359",
		sidewalls: "M575 338L575 355M612 339L611 354",
		freeEdge: "M575 339C577 331 583 326 592 326C601 326 610 330 612 338"
	},
	{
		path: "M644 290C644 302 644 311 649 315C659 320 678 318 686 312C690 306 690 293 688 286C686 280 677 277 666 278C655 277 648 281 644 290Z",
		x: 644,
		y: 277,
		w: 46,
		h: 42,
		cuticle: "M645 308C646 320 673 324 687 311",
		sidewalls: "M644 290L644 307M689 289L689 305",
		freeEdge: "M644 290C648 281 655 277 666 278C677 277 686 280 688 286"
	},
	{
		path: "M724 251C723 262 723 275 728 282C734 287 755 288 769 284C776 281 778 276 778 267L778 254C777 245 766 240 753 240C741 239 730 242 724 251Z",
		x: 723,
		y: 239.5,
		w: 55,
		h: 48,
		cuticle: "M725 277C726 290 762 293 775 280",
		sidewalls: "M723.5 253L724 272M778 255L778 273",
		freeEdge: "M724 251C730 242 741 239 753 240C766 240 777 245 778 254"
	},
	{
		path: "M834 242C829 250 827 269 829 290C831 310 835 319 847 323C862 328 890 328 906 321C916 317 919 310 919 295C920 278 916 255 912 244C906 234 888 228 870 228C854 228 841 232 834 242Z",
		x: 828,
		y: 228,
		w: 92,
		h: 100,
		cuticle: "M834 312C838 327 858 329 880 327C902 326 915 321 918 308",
		sidewalls: "M829 255C827 270 828 290 831 303M916 256C920 272 920 288 919 302",
		freeEdge: "M834 242C841 232 854 228 870 228C888 228 906 234 912 244"
	}
];
function anatomyNails(kind) {
	return kind === "pedicure" ? PHOTO_FOOT : PHOTO_HAND;
}
function nailFrame(n) {
	return n.frame ?? {
		cx: n.x + n.w / 2,
		cy: n.y + n.h,
		w: n.w,
		h: n.h,
		angle: 0
	};
}
function surfaceTransform(n) {
	const f = nailFrame(n);
	return `translate(${f.cx} ${f.cy}) rotate(${f.angle}) translate(${-f.w / 2} ${-f.h}) scale(${f.w / 100} ${f.h / 100})`;
}
function nailName(kind, index) {
	return (kind === "pedicure" ? [
		"Мизинец ноги",
		"Четвёртый палец ноги",
		"Средний палец ноги",
		"Второй палец ноги",
		"Большой палец ноги"
	] : [
		"Мизинец",
		"Безымянный палец",
		"Средний палец",
		"Указательный палец",
		"Большой палец"
	])[index] ?? "Ноготь";
}
// components/sarkisian-studio/nail-shapes.ts
function fittedNails(kind, shape = "almond", length = "natural") {
	if (kind === "pedicure") return PHOTO_FOOT;
	if (shape === "almond" && length === "natural") return PHOTO_HAND;
	return PHOTO_HAND.map((n) => {
		const base = nailFrame(n), w = base.w, h = base.h + (length === "long" ? 45 : length === "extended" ? 22 : length === "short" ? -2 : 0), angle = base.angle * Math.PI / 180;
		const points = [];
		const p = (x, y) => {
			const point = {
				x: base.cx + x * Math.cos(angle) - y * Math.sin(angle),
				y: base.cy + x * Math.sin(angle) + y * Math.cos(angle)
			};
			points.push(point);
			return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
		};
		const local = ([x, y]) => ({
			x: (x - base.cx) * Math.cos(angle) + (y - base.cy) * Math.sin(angle),
			y: -(x - base.cx) * Math.sin(angle) + (y - base.cy) * Math.cos(angle)
		});
		const left = local(n.bed.left), right = local(n.bed.right);
		const edge = shape === "coffin" ? .29 : .43;
		const tip = shape === "square" || shape === "coffin" ? `C${p(right.x, right.y - 5)} ${p(w * edge, -h + 14)} ${p(w * edge, -h + 5)}Q${p(w * edge, -h)} ${p(w * .24, -h)}L${p(-w * .24, -h)}Q${p(-w * edge, -h)} ${p(-w * edge, -h + 5)}C${p(-w * edge, -h + 14)} ${p(left.x, left.y - 5)} ${p(left.x, left.y)}` : shape === "oval" || shape === "round" ? `C${p(right.x, right.y - 12)} ${p(w * .42, -h)} ${p(0, -h)}C${p(-w * .42, -h)} ${p(left.x, left.y - 12)} ${p(left.x, left.y)}` : shape === "stiletto" ? `C${p(right.x, right.y - 8)} ${p(w * .16, -h + 12)} ${p(0, -h)}C${p(-w * .16, -h + 12)} ${p(left.x, left.y - 8)} ${p(left.x, left.y)}` : `C${p(right.x, right.y - 12)} ${p(w * .3, -h + 3)} ${p(0, -h)}C${p(-w * .3, -h + 3)} ${p(left.x, left.y - 12)} ${p(left.x, left.y)}`;
		const x = Math.min(n.x, ...points.map((p) => p.x)), y = Math.min(n.y, ...points.map((p) => p.y));
		return {
			...n,
			path: `${n.bed.path}${tip}Z`,
			x,
			y,
			w: Math.max(n.x + n.w, ...points.map((p) => p.x)) - x,
			h: Math.max(n.y + n.h, ...points.map((p) => p.y)) - y,
			frame: {
				...base,
				w,
				h
			}
		};
	});
}
// components/sarkisian-studio/NailFinish.vue?vue&type=script&setup=true&lang.ts
var NailFinish_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "NailFinish",
	__ssrInlineRender: true,
	props: {
		nail: {},
		geometry: {},
		glossId: {},
		photographic: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const uid = useId().replaceAll(":", "");
		const marks = computed(() => nailMarks(props.nail));
		const gradient = computed(() => props.nail.pattern === "ombre" || props.nail.pattern === "aura" || props.nail.finish === "chrome");
		return (_ctx, _push, _parent, _attrs) => {
			if (__props.nail.color) {
				_push(`<g${ssrRenderAttrs(_attrs)}><defs><linearGradient${ssrRenderAttr("id", `${unref(uid)}-blend`)} x1="0" y1="0"${ssrRenderAttr("x2", __props.nail.finish === "chrome" ? "1" : "0")}${ssrRenderAttr("y2", __props.nail.finish === "chrome" ? "0" : "1")}><stop${ssrRenderAttr("stop-color", unref(colorHex)(__props.nail.color))}></stop><stop${ssrRenderAttr("offset", __props.nail.finish === "chrome" ? ".4" : "1")}${ssrRenderAttr("stop-color", __props.nail.finish === "chrome" ? "#fff3dc" : unref(colorHex)(__props.nail.accentColor ?? "porcelain"))}></stop>`);
				if (__props.nail.finish === "chrome") _push(`<stop offset="1"${ssrRenderAttr("stop-color", unref(colorHex)(__props.nail.color))}></stop>`);
				else _push(`<!---->`);
				_push(`</linearGradient><radialGradient${ssrRenderAttr("id", `${unref(uid)}-aura`)}><stop${ssrRenderAttr("stop-color", unref(colorHex)(__props.nail.accentColor ?? "porcelain"))}></stop><stop offset="1"${ssrRenderAttr("stop-color", unref(colorHex)(__props.nail.color))}></stop></radialGradient><radialGradient${ssrRenderAttr("id", `${unref(uid)}-curvature`)} cx="50%" cy="45%" r="75%"><stop stop-color="#ffffff0c"></stop><stop offset=".6" stop-color="#0000"></stop><stop offset="1" stop-color="#0005"></stop></radialGradient><filter${ssrRenderAttr("id", `${unref(uid)}-soft-sheen`)} x="-30%" y="-20%" width="160%" height="140%"><feGaussianBlur stdDeviation=".8"></feGaussianBlur></filter></defs><path${ssrRenderAttr("d", __props.geometry.path)}${ssrRenderAttr("fill", gradient.value ? `url(#${unref(uid)}-${__props.nail.pattern === "aura" ? "aura" : "blend"})` : unref(colorHex)(__props.nail.color))} opacity=".98"></path><g${ssrRenderAttr("transform", unref(surfaceTransform)(__props.geometry))}><!--[-->`);
				ssrRenderList(marks.value, (mark, index) => {
					ssrRenderVNode(_push, createVNode(resolveDynamicComponent(mark.tag), mergeProps({ key: index }, { ref_for: true }, mark.attrs), null), _parent);
				});
				_push(`<!--]--><rect x="0" y="0" width="100" height="100"${ssrRenderAttr("fill", `url(#${unref(uid)}-curvature)`)}></rect>`);
				if (__props.nail.finish !== "matte" && !__props.photographic) _push(`<g fill="none" stroke="#fff" stroke-linecap="round"><path d="M27 20C20 32 20 54 24 68" stroke-width="4" opacity=".38"${ssrRenderAttr("filter", `url(#${unref(uid)}-soft-sheen)`)}></path><path d="M27 22Q23 31 23 42" stroke-width="1.2" opacity=".55"></path></g>`);
				else _push(`<!---->`);
				_push(`</g></g>`);
			} else _push(`<!---->`);
		};
	}
});
// components/sarkisian-studio/NailFinish.vue
var _sfc_setup$19 = NailFinish_vue_vue_type_script_setup_true_lang_default.setup;
NailFinish_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/NailFinish.vue");
	return _sfc_setup$19 ? _sfc_setup$19(props, ctx) : void 0;
};
var NailFinish_default = Object.assign(NailFinish_vue_vue_type_script_setup_true_lang_default, { __name: "NailFinish" });
// components/sarkisian-studio/NailPhotoLighting.vue?vue&type=script&setup=true&lang.ts
var NailPhotoLighting_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "NailPhotoLighting",
	__ssrInlineRender: true,
	props: {
		imageUrl: {},
		geometry: {},
		matte: { type: Boolean }
	},
	setup(__props) {
		const uid = useId().replaceAll(":", "");
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<g${ssrRenderAttrs(_attrs)}><defs><clipPath${ssrRenderAttr("id", `${unref(uid)}-native`)}><path${ssrRenderAttr("d", __props.geometry.path)}></path></clipPath><filter${ssrRenderAttr("id", `${unref(uid)}-relief`)} filterUnits="userSpaceOnUse"${ssrRenderAttr("x", __props.geometry.x - 3)}${ssrRenderAttr("y", __props.geometry.y - 3)}${ssrRenderAttr("width", __props.geometry.w + 6)}${ssrRenderAttr("height", __props.geometry.h + 6)} color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"></feColorMatrix><feComponentTransfer><feFuncR type="linear" slope=".828" intercept="-.075"></feFuncR><feFuncG type="linear" slope=".828" intercept="-.075"></feFuncG><feFuncB type="linear" slope=".828" intercept="-.075"></feFuncB></feComponentTransfer></filter><filter${ssrRenderAttr("id", `${unref(uid)}-glints`)} filterUnits="userSpaceOnUse"${ssrRenderAttr("x", __props.geometry.x - 3)}${ssrRenderAttr("y", __props.geometry.y - 3)}${ssrRenderAttr("width", __props.geometry.w + 6)}${ssrRenderAttr("height", __props.geometry.h + 6)} color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.063 3.576 .361 0 -4.2"></feColorMatrix></filter><linearGradient${ssrRenderAttr("id", `${unref(uid)}-bed`)} x2="0" y2="1"><stop stop-color="#000"></stop><stop offset=".18" stop-color="#000"></stop><stop offset=".28" stop-color="#fff"></stop><stop offset=".9" stop-color="#fff"></stop><stop offset="1" stop-color="#000"></stop></linearGradient><mask${ssrRenderAttr("id", `${unref(uid)}-bed-mask`)} maskUnits="userSpaceOnUse" x="0" y="0" width="1448" height="1086"><g${ssrRenderAttr("transform", unref(surfaceTransform)(__props.geometry))}><rect width="100" height="100"${ssrRenderAttr("fill", `url(#${unref(uid)}-bed)`)}></rect></g></mask></defs><g${ssrRenderAttr("clip-path", `url(#${unref(uid)}-native)`)} pointer-events="none" style="${ssrRenderStyle({ "mix-blend-mode": "soft-light" })}" opacity=".72"><image${ssrRenderAttr("href", __props.imageUrl)} width="1448" height="1086"${ssrRenderAttr("filter", `url(#${unref(uid)}-relief)`)}></image></g>`);
			if (!__props.matte) _push(`<g${ssrRenderAttr("clip-path", `url(#${unref(uid)}-native)`)} pointer-events="none"><image${ssrRenderAttr("href", __props.imageUrl)} width="1448" height="1086"${ssrRenderAttr("filter", `url(#${unref(uid)}-glints)`)}${ssrRenderAttr("mask", `url(#${unref(uid)}-bed-mask)`)} opacity=".52"></image></g>`);
			else _push(`<!---->`);
			_push(`</g>`);
		};
	}
});
// components/sarkisian-studio/NailPhotoLighting.vue
var _sfc_setup$18 = NailPhotoLighting_vue_vue_type_script_setup_true_lang_default.setup;
NailPhotoLighting_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/NailPhotoLighting.vue");
	return _sfc_setup$18 ? _sfc_setup$18(props, ctx) : void 0;
};
var NailPhotoLighting_default = Object.assign(NailPhotoLighting_vue_vue_type_script_setup_true_lang_default, { __name: "NailPhotoLighting" });
// components/sarkisian-studio/NailArt.vue?vue&type=script&setup=true&lang.ts
var NailArt_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "NailArt",
	__ssrInlineRender: true,
	props: {
		design: {},
		imageUrl: {},
		interactive: {
			type: Boolean,
			default: false
		},
		selected: { default: -1 },
		stroke: {},
		brushColor: { default: "rose" },
		preparing: { type: Boolean },
		prepared: {}
	},
	emits: ["paint"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const uid = useId().replaceAll(":", "");
		const svg = ref(null);
		const nails = computed(() => fittedNails(props.design.kind, props.design.shape, props.design.length));
		const nativeNails = computed(() => anatomyNails(props.design.kind));
		const shaped = computed(() => props.design.kind === "manicure" && ((props.design.shape ?? "almond") !== "almond" || (props.design.length ?? "natural") !== "natural"));
		const strokes = shallowRef([]);
		let previous = props.design.nails.map((n) => ({ ...n }));
		let frame = 0;
		const reducedMotion = ref(false);
		const pointer = ref({
			x: 0,
			y: 0,
			visible: false
		});
		const strokeAt = (index) => strokes.value.find((s) => s.index === index);
		function animate(now) {
			strokes.value = strokes.value.map((s) => ({
				...s,
				progress: Math.max(0, Math.min(1, (now - s.start) / 430))
			})).filter((s) => s.progress < 1);
			if (strokes.value.length) frame = requestAnimationFrame(animate);
			else frame = 0;
		}
		watch(() => props.stroke?.id, () => {
			cancelAnimationFrame(frame);
			const indices = props.stroke?.indices ?? [];
			const start = performance.now();
			strokes.value = reducedMotion.value || !indices.length ? [] : [...strokes.value.filter((s) => !indices.includes(s.index)), ...indices.map((index, order) => ({
				index,
				before: { ...previous[index] },
				start: start + order * 130,
				progress: 0
			}))];
			previous = props.design.nails.map((n) => ({ ...n }));
			if (strokes.value.length) frame = requestAnimationFrame(animate);
		});
		const brush = computed(() => {
			if (reducedMotion.value) return null;
			const stroke = strokes.value.find((s) => s.progress > 0);
			if (stroke) {
				const n = nails.value[stroke.index];
				return {
					x: n.x + n.w * .5,
					y: n.y + n.h * (1 - stroke.progress),
					active: true
				};
			}
			return pointer.value.visible ? {
				...pointer.value,
				active: false
			} : null;
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<svg${ssrRenderAttrs(mergeProps({
				ref_key: "svg",
				ref: svg,
				class: ["nail-art", { "has-brush": __props.interactive && pointer.value.visible && !reducedMotion.value }],
				viewBox: "0 0 1448 1086",
				role: "group",
				"aria-label": __props.design.kind === "manicure" ? "Редактор маникюра, пять ногтей" : "Редактор педикюра, пять ногтей"
			}, _attrs))} data-v-defae3d3><defs data-v-defae3d3><linearGradient${ssrRenderAttr("id", `${unref(uid)}-gloss`)} data-v-defae3d3><stop offset="0" stop-color="#000" stop-opacity=".12" data-v-defae3d3></stop><stop offset=".24" stop-color="#fff" stop-opacity=".5" data-v-defae3d3></stop><stop offset=".4" stop-color="#fff" stop-opacity=".03" data-v-defae3d3></stop><stop offset="1" stop-color="#000" stop-opacity=".09" data-v-defae3d3></stop></linearGradient><linearGradient${ssrRenderAttr("id", `${unref(uid)}-metal`)} data-v-defae3d3><stop stop-color="#8a8174" data-v-defae3d3></stop><stop offset=".4" stop-color="#f9f4e6" data-v-defae3d3></stop><stop offset="1" stop-color="#82776a" data-v-defae3d3></stop></linearGradient><!--[-->`);
			ssrRenderList(nails.value, (n, i) => {
				_push(`<clipPath${ssrRenderAttr("id", `${unref(uid)}-clip-${i}`)} data-v-defae3d3><path${ssrRenderAttr("d", n.path)} data-v-defae3d3></path></clipPath>`);
			});
			_push(`<!--]--><!--[-->`);
			ssrRenderList(strokes.value, (s) => {
				_push(`<clipPath${ssrRenderAttr("id", `${unref(uid)}-reveal-${s.index}`)} clipPathUnits="userSpaceOnUse" data-v-defae3d3><rect x="0"${ssrRenderAttr("y", nails.value[s.index].y + nails.value[s.index].h + 12 - (nails.value[s.index].h + 24) * s.progress)} width="1448" height="1086" data-v-defae3d3></rect></clipPath>`);
			});
			_push(`<!--]--></defs><image${ssrRenderAttr("href", __props.imageUrl)} width="1448" height="1086" draggable="false" data-v-defae3d3></image><!--[-->`);
			ssrRenderList(nails.value, (n, i) => {
				_push(`<g class="${ssrRenderClass({
					"nail-target": __props.interactive,
					"is-painting": !!strokeAt(i)
				})}"${ssrRenderAttr("data-testid", `nail-${i}`)}${ssrRenderAttr("role", __props.interactive ? "button" : void 0)}${ssrRenderAttr("tabindex", __props.interactive ? 0 : void 0)}${ssrRenderAttr("aria-label", `Нанести покрытие на ноготь ${i + 1}`)} data-v-defae3d3><path class="nail-hit-area"${ssrRenderAttr("d", n.path)} fill="transparent" stroke="transparent" stroke-width="26" data-v-defae3d3></path>`);
				if (shaped.value && !__props.design.nails[i]?.color) _push(`<path${ssrRenderAttr("d", n.path)} fill="none" stroke="#ffffffa0" stroke-width="1.5" pointer-events="none" data-v-defae3d3></path>`);
				else _push(`<!---->`);
				if (__props.preparing && __props.prepared?.includes(i)) _push(`<path${ssrRenderAttr("d", n.path)} fill="#94aa7130" stroke="#819c65" stroke-width="7" pointer-events="none" data-v-defae3d3></path>`);
				else _push(`<!---->`);
				_push(`<g${ssrRenderAttr("clip-path", `url(#${unref(uid)}-clip-${i})`)} pointer-events="none" data-v-defae3d3>`);
				if (strokeAt(i)?.before.color) {
					_push(`<g style="${ssrRenderStyle({ "isolation": "isolate" })}" data-v-defae3d3>`);
					_push(ssrRenderComponent(NailFinish_default, {
						nail: strokeAt(i).before,
						geometry: n,
						"gloss-id": `${unref(uid)}-gloss`,
						photographic: ""
					}, null, _parent));
					_push(ssrRenderComponent(NailPhotoLighting_default, {
						"image-url": __props.imageUrl,
						geometry: nativeNails.value[i],
						matte: strokeAt(i).before.finish === "matte"
					}, null, _parent));
					_push(`</g>`);
				} else _push(`<!---->`);
				_push(`<g${ssrRenderAttr("clip-path", strokeAt(i) ? `url(#${unref(uid)}-reveal-${i})` : void 0)} style="${ssrRenderStyle({ "isolation": "isolate" })}" data-v-defae3d3>`);
				_push(ssrRenderComponent(NailFinish_default, {
					nail: __props.design.nails[i],
					geometry: n,
					"gloss-id": `${unref(uid)}-gloss`,
					photographic: ""
				}, null, _parent));
				if (__props.design.nails[i]?.color) _push(ssrRenderComponent(NailPhotoLighting_default, {
					"image-url": __props.imageUrl,
					geometry: nativeNails.value[i],
					matte: __props.design.nails[i]?.finish === "matte"
				}, null, _parent));
				else _push(`<!---->`);
				_push(`</g></g>`);
				if (__props.interactive && __props.selected === i) _push(`<path class="nail-selection"${ssrRenderAttr("d", n.path)} fill="none" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke" stroke-dasharray="3 4" pointer-events="none" data-v-defae3d3></path>`);
				else _push(`<!---->`);
				_push(`</g>`);
			});
			_push(`<!--]-->`);
			if (__props.interactive && brush.value && !__props.preparing) _push(`<g class="${ssrRenderClass([{ "is-stroking": brush.value.active }, "nail-brush"])}"${ssrRenderAttr("transform", `translate(${brush.value.x} ${brush.value.y}) rotate(-32)`)} pointer-events="none" aria-hidden="true" data-v-defae3d3><ellipse cx="18" cy="80" rx="14" ry="76" fill="#33271f" opacity=".12" data-v-defae3d3></ellipse><path d="M-13 27 L-11 6 Q0 -4 11 6 L13 27Z"${ssrRenderAttr("fill", unref(colorHex)(__props.brushColor))} stroke="#534135" stroke-width="1.5" data-v-defae3d3></path><path d="M-10 27V8M-5 27V5M0 27V3M5 27V5M10 27V8" stroke="#fff" opacity=".24" data-v-defae3d3></path><rect x="-14" y="25" width="28" height="41" rx="3"${ssrRenderAttr("fill", `url(#${unref(uid)}-metal)`)} data-v-defae3d3></rect><path d="M-12 66H12L8 151Q0 163 -8 151Z" fill="#292a27" data-v-defae3d3></path><path d="M-7 72L-4 142" stroke="#65655b" stroke-width="3" stroke-linecap="round" data-v-defae3d3></path></g>`);
			else _push(`<!---->`);
			if (__props.interactive && brush.value && __props.preparing) _push(`<g class="nail-prep-tool"${ssrRenderAttr("transform", `translate(${brush.value.x} ${brush.value.y})`)} pointer-events="none" aria-hidden="true" data-v-defae3d3><ellipse cx="5" cy="7" rx="29" ry="23" fill="#33271f20" data-v-defae3d3></ellipse><ellipse rx="28" ry="22" fill="#fffdf3" stroke="#c8c5b5" stroke-width="2" data-v-defae3d3></ellipse><ellipse rx="21" ry="15" fill="none" stroke="#e4e0d4" stroke-width="2" data-v-defae3d3></ellipse></g>`);
			else _push(`<!---->`);
			_push(`</svg>`);
		};
	}
});
// components/sarkisian-studio/NailArt.vue
var _sfc_setup$17 = NailArt_vue_vue_type_script_setup_true_lang_default.setup;
NailArt_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/NailArt.vue");
	return _sfc_setup$17 ? _sfc_setup$17(props, ctx) : void 0;
};
var NailArt_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(NailArt_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-defae3d3"]]), { __name: "NailArt" });
// components/sarkisian-studio/keri/clothing.ts
var cache = /* @__PURE__ */ new Map();
function canvas() {
	const c = (void 0).createElement("canvas");
	c.width = 948;
	c.height = 1920;
	return c;
}
function tint(image, color, keepBlouse = false) {
	const c = canvas(), ctx = c.getContext("2d");
	ctx.drawImage(image, 0, 0);
	const pixels = ctx.getImageData(0, 0, c.width, c.height), d = pixels.data;
	const rgb = [
		1,
		3,
		5
	].map((i) => parseInt(color.slice(i, i + 2), 16));
	for (let i = 0; i < d.length; i += 4) {
		if (!d[i + 3]) continue;
		const r = d[i], g = d[i + 1], b = d[i + 2], lum = .2126 * r + .7152 * g + .0722 * b;
		if (keepBlouse && Math.max(r, g, b) - Math.min(r, g, b) < 24) continue;
		const shade = Math.min(1.3, Math.max(.28, lum / (keepBlouse ? 112 : 196))), highlight = Math.max(0, (lum - 219) / 36);
		const ink = Math.max(0, Math.min(1, (lum - 48) / 60));
		for (let channel = 0; channel < 3; channel++) {
			const colored = Math.min(255, rgb[channel] * shade * (1 - highlight) + 249 * highlight);
			const outline = Math.max(r, g, b) - Math.min(r, g, b) > 18 ? lum : d[i + channel];
			d[i + channel] = Math.round(outline * (1 - ink) + colored * ink);
		}
	}
	ctx.putImageData(pixels, 0, 0);
	return c;
}
function detail(ctx, d, fill, stroke, width = 2) {
	const p = new Path2D(d);
	if (fill !== "none") {
		ctx.fillStyle = fill;
		ctx.fill(p);
	}
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = width;
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		ctx.stroke(p);
	}
}
function pattern(ctx, id) {
	if (id === 1) return;
	ctx.save();
	ctx.globalCompositeOperation = "source-atop";
	ctx.globalAlpha = .28;
	if (id === 2) {
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = 3;
		for (let y = 610; y < 1460; y += 30) {
			ctx.beginPath();
			ctx.moveTo(60, y);
			ctx.bezierCurveTo(280, y - 8, 520, y + 18, 900, y - 5);
			ctx.stroke();
		}
	} else for (let y = 630; y < 1450; y += 43) for (let x = 100 + Math.round(y / 43) % 2 * 21; x < 900; x += 43) {
		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(x, y, id === 3 ? 2.8 : 2, 0, Math.PI * 2);
		ctx.fill();
		if (id === 4) {
			ctx.strokeStyle = "#e7c8d0";
			ctx.lineWidth = 3;
			for (let a = 0; a < 5; a++) {
				const theta = a * Math.PI * 2 / 5;
				ctx.beginPath();
				ctx.ellipse(x + Math.cos(theta) * 5, y + Math.sin(theta) * 5, 3.2, 1.5, theta, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
	}
	ctx.restore();
}
function garment(image, look, bottom = false) {
	const id = bottom ? look.bottom : look.top, colorId = bottom ? look.bottomColor : look.topColor;
	if (id <= (bottom ? 3 : 5) && (!look.outfitPattern || look.outfitPattern === 1 || bottom)) return image;
	const key = `${image.src}|${bottom ? "bottom" : "top"}:${id}:${colorId}:${bottom ? 0 : look.outfitPattern}`;
	const cached = cache.get(key);
	if (cached) {
		cache.delete(key);
		cache.set(key, cached);
		return cached;
	}
	const color = OUTFIT_COLORS[colorId - 1][1];
	const c = id > (bottom ? 3 : 5) ? tint(image, color, !bottom && id === 7) : canvas(), ctx = c.getContext("2d");
	if (id <= (bottom ? 3 : 5)) ctx.drawImage(image, 0, 0);
	if (bottom && id === 5) {
		const source = canvas();
		source.getContext("2d").drawImage(c, 0, 0);
		ctx.clearRect(0, 0, 948, 1920);
		ctx.drawImage(source, 0, 0, 948, 1150, 0, 0, 948, 1150);
		ctx.drawImage(source, 0, 1150, 948, 770, 0, 1150, 948, 900);
	}
	if (!bottom) {
		pattern(ctx, look.outfitPattern);
		ctx.save();
		ctx.globalCompositeOperation = "source-atop";
		if (id === 6) {
			const cloth = ctx.createLinearGradient(280, 780, 650, 1010);
			cloth.addColorStop(0, "#ffffff20");
			cloth.addColorStop(.35, "#ffffff05");
			cloth.addColorStop(1, "#00000018");
			detail(ctx, "M360 627L380 608L407 653L397 759Q464 792 575 770L626 644L648 636L593 799L607 1269Q430 1237 269 1155L312 811Z", color, "#28252a80", 2.5);
			ctx.fillStyle = cloth;
			ctx.fill(new Path2D("M312 811L397 759Q464 792 575 770L593 799L607 1269Q430 1237 269 1155Z"));
			detail(ctx, "M342 963Q436 991 538 994L527 1107Q433 1110 331 1076Z", "none", "#ffffff60", 2);
			detail(ctx, "M365 643L385 675L374 748M621 661L584 763M281 1144Q422 1222 595 1255", "none", "#ffffff38", 2);
			ctx.fillStyle = "#ffffffa8";
			ctx.font = "12px Arial";
			ctx.save();
			ctx.translate(417, 916);
			ctx.rotate(.07);
			ctx.fillText("S A R K I S I A N", 0, 0);
			ctx.restore();
		}
		if (id === 7) {
			detail(ctx, "M464 790Q462 967 456 1208", "none", "#00000028", 2);
			for (const [x, y] of [
				[463, 896],
				[461, 1001],
				[458, 1110]
			]) {
				ctx.beginPath();
				ctx.ellipse(x, y, 3.3, 4, 0, 0, Math.PI * 2);
				ctx.fillStyle = "#d3b88d";
				ctx.fill();
				ctx.strokeStyle = "#665747";
				ctx.lineWidth = .8;
				ctx.stroke();
			}
		}
		if (id === 8) {
			const shirt = ctx.createLinearGradient(400, 630, 510, 920);
			shirt.addColorStop(0, "#f7f4ee");
			shirt.addColorStop(.5, "#fffdf8");
			shirt.addColorStop(1, "#e0dcd5");
			ctx.fillStyle = shirt;
			ctx.fill(new Path2D("M363 613Q467 684 618 605L485 919Z"));
			const lapel = ctx.createLinearGradient(360, 640, 590, 900);
			lapel.addColorStop(0, "#ffffff22");
			lapel.addColorStop(.6, "#ffffff0c");
			lapel.addColorStop(1, "#00000014");
			for (const d of ["M363 613Q390 646 439 664L485 919L395 812L418 770L365 741Z", "M618 605L658 636L603 773L563 797L569 845L485 919L561 667Q591 640 618 605Z"]) {
				detail(ctx, d, color);
				ctx.fillStyle = lapel;
				ctx.fill(new Path2D(d));
				detail(ctx, d, "none", "#302b3455", 2);
			}
			detail(ctx, "M485 919Q478 1059 484 1248", "none", "#19191b45", 2);
			detail(ctx, "M330 1077L404 1094M542 1121L588 1127", "none", "#00000045", 3);
			detail(ctx, "M331 1081L404 1098M542 1125L588 1131", "none", "#ffffff35", 1.5);
			for (const y of [
				996,
				1096,
				1190
			]) {
				ctx.beginPath();
				ctx.ellipse(493, y, 4, 5, 0, 0, Math.PI * 2);
				ctx.fillStyle = "#d2c3a6";
				ctx.fill();
				ctx.strokeStyle = "#514d49";
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}
		ctx.restore();
	}
	cache.set(key, c);
	if (cache.size > 8) cache.delete(cache.keys().next().value);
	return c;
}
// components/sarkisian-studio/keri/makeup.ts
function softColor(ctx, x, y, rx, ry, color, opacity) {
	const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
	ctx.save();
	ctx.translate(x, y);
	ctx.scale(rx, ry);
	const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
	fade.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
	fade.addColorStop(.42, `rgba(${r},${g},${b},${opacity * .7})`);
	fade.addColorStop(1, `rgba(${r},${g},${b},0)`);
	ctx.fillStyle = fade;
	ctx.fillRect(-1, -1, 2, 2);
	ctx.restore();
}
function complexion(ctx, look) {
	ctx.save();
	const face = new Path2D("M300 266Q289 375 333 430Q369 491 412 500Q504 472 570 388L570 255Z");
	ctx.clip(face);
	if (look.blush > 1) {
		const color = BLUSH_COLORS[look.blush - 1][1];
		softColor(ctx, 339, 365, 34, 18, color, .2);
		softColor(ctx, 518, 357, 40, 18, color, .2);
	}
	if (look.freckles === 2) {
		ctx.fillStyle = "#a97a5455";
		for (const [x, y, r] of [
			[
				324,
				359,
				1.1
			],
			[
				335,
				365,
				.9
			],
			[
				348,
				357,
				1.2
			],
			[
				358,
				367,
				.8
			],
			[
				337,
				375,
				.7
			],
			[
				365,
				358,
				.8
			],
			[
				491,
				355,
				.9
			],
			[
				505,
				350,
				1
			],
			[
				520,
				357,
				1.3
			],
			[
				532,
				349,
				.7
			],
			[
				511,
				365,
				.8
			],
			[
				542,
				360,
				.9
			],
			[
				374,
				361,
				.7
			],
			[
				385,
				365,
				.6
			]
		]) {
			ctx.beginPath();
			ctx.ellipse(x, y, r, r * .72, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	if (look.eyeshadow > 1) {
		const color = SHADOW_COLORS[look.eyeshadow - 1][1], shift = [
			0,
			9,
			23
		][look.eyes - 1] ?? 0;
		softColor(ctx, 340, 288 + shift, 32, 11, color, .34);
		softColor(ctx, 486, 277 + shift, 48, 12, color, .34);
	}
	ctx.restore();
}
var lips = /* @__PURE__ */ new Map();
function drawLips(ctx, image, look) {
	if (look.lipstick === 1) {
		ctx.drawImage(image, 0, 0);
		return;
	}
	const key = `${image.src}:${look.lipstick}`;
	let item = lips.get(key);
	if (!item) {
		const c = (void 0).createElement("canvas");
		c.width = 948;
		c.height = 1920;
		const m = c.getContext("2d");
		m.drawImage(image, 0, 0);
		const data = m.getImageData(370, 410, 90, 50), d = data.data, rgb = [
			1,
			3,
			5
		].map((i) => parseInt(LIP_COLORS[look.lipstick - 1][1].slice(i, i + 2), 16));
		for (let i = 0; i < d.length; i += 4) {
			if (!d[i + 3]) continue;
			const lum = .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2], highlight = Math.max(0, (lum - 205) / 50), shade = Math.min(1.2, Math.max(.48, lum / 164));
			for (let j = 0; j < 3; j++) {
				const target = rgb[j] * shade * (1 - highlight) + d[i + j] * highlight;
				d[i + j] = Math.round(d[i + j] * .18 + target * .82);
			}
		}
		c.width = 90;
		c.height = 50;
		c.getContext("2d").putImageData(data, 0, 0);
		item = {
			canvas: c,
			x: 370,
			y: 410
		};
		lips.set(key, item);
		if (lips.size > 12) lips.delete(lips.keys().next().value);
	}
	ctx.drawImage(item.canvas, item.x, item.y);
}
function drawEyes(ctx, image, look) {
	if (look.eyeliner > 1) {
		const shift = [
			0,
			9,
			23
		][look.eyes - 1] ?? 0;
		ctx.save();
		ctx.beginPath();
		ctx.rect(300, 275 + shift, 82, 29);
		ctx.rect(430, 263 + shift, 118, 30);
		ctx.clip();
		ctx.shadowColor = "#35252c";
		ctx.shadowBlur = look.eyeliner === 3 ? 2.4 : 1.1;
		ctx.shadowOffsetY = -0.5;
		ctx.drawImage(image, 0, 0);
		ctx.restore();
	}
	ctx.drawImage(image, 0, 0);
}
// components/sarkisian-studio/keri/styling.ts
function path(ctx, d, fill, stroke, width = 2) {
	const p = new Path2D(d);
	if (fill !== "none") {
		ctx.fillStyle = fill;
		ctx.fill(p);
	}
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = width;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.stroke(p);
	}
}
function ellipse(ctx, x, y, rx, ry, color, stroke, width = 2) {
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
	if (color !== "none") {
		ctx.fillStyle = color;
		ctx.fill();
	}
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = width;
		ctx.stroke();
	}
}
function accessories(ctx, look) {
	if (look.glasses > 1) {
		const stroke = look.glasses === 3 ? "#866759" : "#38313b";
		if (look.glasses === 2) {
			ellipse(ctx, 344, 310, 43, 35, "#d9eced12", stroke, 3.5);
			ellipse(ctx, 486, 300, 52, 36, "#d9eced12", stroke, 3.5);
		} else {
			path(ctx, look.glasses === 3 ? "M297 283L388 295L382 331Q335 350 309 322Z" : "M300 289L386 292L382 336L307 333Z", "#d9eced12", stroke, 3.5);
			path(ctx, look.glasses === 3 ? "M433 286L545 270L530 320Q488 340 440 331Z" : "M435 284L541 277L535 326L440 333Z", "#d9eced12", stroke, 3.5);
		}
		path(ctx, "M388 304Q410 292 433 302M542 284L584 310", "none", stroke, 3);
	}
	if (look.earrings > 1) {
		ellipse(ctx, 585, 389, 5, 6, "#e4c889", "#a3854b", 1.5);
		if (look.earrings === 3) ellipse(ctx, 586, 413, 14, 21, "none", "#d5b575", 3);
		if (look.earrings === 4) {
			path(ctx, "M586 396V420", "none", "#d8be81", 2);
			path(ctx, "M586 418Q601 438 586 450Q571 438 586 418Z", "#e5eaeb", "#b69a64", 2);
		}
	}
	if (look.necklace > 1) {
		path(ctx, look.necklace === 4 ? "M411 525Q474 560 548 503" : "M383 573Q458 687 570 554", "none", look.necklace === 4 ? "#393039" : "#d6b97d", look.necklace === 4 ? 7 : 2);
		if (look.necklace === 2) path(ctx, "M472 631L479 643L468 653L461 641Z", "#dfc489", "#9c8152", 1);
		if (look.necklace === 3) for (let k = 0; k < 17; k++) {
			const t = k / 16;
			ellipse(ctx, 383 + 187 * t, 573 - 19 * t + Math.sin(t * Math.PI) * 58, 4, 4.5, "#f5ecdd", "#c4b6a2", .8);
		}
	}
	if (look.hairAccessory === 2) {
		path(ctx, "M568 133Q531 99 530 129Q535 159 568 142Q606 168 611 135Q612 107 568 133Z", "#c58aa0", "#885469", 2);
		ellipse(ctx, 568, 139, 5, 8, "#dfb0bf");
	}
	if (look.hairAccessory === 3) path(ctx, "M302 241Q286 58 468 54Q656 49 655 251", "none", "#d0ab88", 9);
	if (look.hairAccessory === 4) path(ctx, "M570 223L622 198L626 204L574 230Z", "#e6c47f", "#a1844c", 1.5);
}
function drawNatural(ctx, layers, look, closed, eyeBounds) {
	ctx.drawImage(layers[0], 0, 0);
	ctx.drawImage(garment(layers[1], look, true), 0, 0);
	ctx.drawImage(garment(layers[2], look), 0, 0);
	complexion(ctx, look);
	if (look.brow === 2) {
		ctx.save();
		ctx.translate(0, 74);
		ctx.scale(1, .7);
		ctx.drawImage(layers[3], 0, 0);
		ctx.restore();
	} else {
		if (look.brow === 3) {
			ctx.save();
			ctx.shadowColor = "#43382c88";
			ctx.shadowBlur = 1.3;
			ctx.drawImage(layers[3], 0, 0);
			ctx.restore();
		}
		ctx.drawImage(layers[3], 0, 0);
	}
	if (closed && eyeBounds) {
		const b = eyeBounds;
		ctx.drawImage(layers[4], b.x, b.y, b.w, b.h, b.x, b.y + b.h * .49, b.w, Math.max(2, b.h * .035));
	} else drawEyes(ctx, layers[4], look);
	drawLips(ctx, layers[5], look);
	if (look.hair > 5) {
		const color = HAIR_COLORS[look.hairColor - 1][1];
		if (look.hair === 6) {
			ellipse(ctx, 307, 76, 64, 67, color, "#44333466", 4);
			ellipse(ctx, 645, 64, 64, 67, color, "#44333466", 4);
		}
		if (look.hair === 7) for (let j = 0; j < 9; j++) ellipse(ctx, 657 + Math.sin(j * .7) * 8, 343 + j * 37, 33 - j * 2.3, 29, color, "#44333477", 3);
		if (look.hair === 8) ellipse(ctx, 604, 63, 66, 61, color, "#44333466", 4);
	}
	ctx.drawImage(layers[6], 0, 0);
	accessories(ctx, look);
}
function drawStyledKeri(ctx, layers, look, closed = false, eyeBounds) {
	if (look.faceShape === 1) {
		drawNatural(ctx, layers, look, closed, eyeBounds);
		return;
	}
	const head = (void 0).createElement("canvas");
	head.width = 948;
	head.height = 1920;
	drawNatural(head.getContext("2d"), layers, look, closed, eyeBounds);
	for (let y = 0; y < 660; y += 12) {
		const t = Math.max(0, Math.min(1, (y - 450) / 210)), ease = t * t * (3 - 2 * t), scale = 1 + (look.faceShape === 2 ? .035 : -0.035) * (1 - ease);
		ctx.drawImage(head, 0, y, 948, Math.min(12, 660 - y), 446 * (1 - scale), y, 948 * scale, Math.min(12, 660 - y));
	}
	ctx.drawImage(head, 0, 660, 948, 1260, 0, 660, 948, 1260);
}
// components/sarkisian-studio/keri/render.ts
var images = /* @__PURE__ */ new Map();
function loadKeriImage(url) {
	if (!images.has(url)) {
		const promise = new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = async () => {
				try {
					await img.decode();
					resolve(img);
				} catch (error) {
					reject(error);
				}
			};
			img.onerror = () => reject(/* @__PURE__ */ new Error("Не удалось загрузить детали образа."));
			img.src = url;
		}).catch((error) => {
			images.delete(url);
			throw error;
		});
		images.set(url, promise);
		if (images.size > 32) images.delete(images.keys().next().value);
		return promise;
	}
	const cached = images.get(url);
	images.delete(url);
	images.set(url, cached);
	return cached;
}
async function renderKeriLook(look, assetBase, width = KERI_SIZE.width) {
	const layers = await Promise.all(keriLayers(look, assetBase).map(loadKeriImage));
	const canvas = (void 0).createElement("canvas");
	canvas.width = width;
	canvas.height = Math.round(width * KERI_SIZE.height / KERI_SIZE.width);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Браузер не поддерживает рисование персонажа.");
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.save();
	ctx.scale(width / KERI_SIZE.width, width / KERI_SIZE.width);
	drawStyledKeri(ctx, layers, look);
	ctx.restore();
	return canvas;
}
// components/sarkisian-studio/keri/KeriAvatar.vue?vue&type=script&setup=true&lang.ts
var KeriAvatar_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "KeriAvatar",
	__ssrInlineRender: true,
	props: {
		look: {},
		assetBase: {},
		width: { default: 700 },
		label: { default: "Твой персонаж" }
	},
	emits: [
		"loading",
		"error",
		"ready"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const emit = __emit;
		const canvas = ref();
		const ready = ref(false);
		let revision = 0;
		watch(() => [
			props.look,
			props.assetBase,
			props.width,
			canvas.value
		], async () => {
			if (!canvas.value) return;
			const current = ++revision;
			emit("loading", true);
			try {
				const result = await renderKeriLook({ ...props.look }, props.assetBase, props.width);
				if (current !== revision || !canvas.value) return;
				canvas.value.width = result.width;
				canvas.value.height = result.height;
				canvas.value.getContext("2d").drawImage(result, 0, 0);
				ready.value = true;
				emit("ready");
			} catch (error) {
				if (current === revision) emit("error", error instanceof Error ? error.message : "Не удалось показать образ.");
			} finally {
				if (current === revision) emit("loading", false);
			}
		}, {
			deep: true,
			flush: "post"
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<canvas${ssrRenderAttrs(mergeProps({
				ref_key: "canvas",
				ref: canvas,
				class: "keri-avatar",
				"data-ready": ready.value,
				width: __props.width,
				height: Math.round(__props.width * unref(KERI_SIZE).height / unref(KERI_SIZE).width),
				role: "img",
				"aria-label": __props.label
			}, _attrs))} data-v-0831de40></canvas>`);
		};
	}
});
// components/sarkisian-studio/keri/KeriAvatar.vue
var _sfc_setup$16 = KeriAvatar_vue_vue_type_script_setup_true_lang_default.setup;
KeriAvatar_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/keri/KeriAvatar.vue");
	return _sfc_setup$16 ? _sfc_setup$16(props, ctx) : void 0;
};
var KeriAvatar_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(KeriAvatar_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-0831de40"]]), { __name: "KeriAvatar" });
// components/sarkisian-studio/keri/KeriChoice.vue?vue&type=script&setup=true&lang.ts
var KeriChoice_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "KeriChoice",
	__ssrInlineRender: true,
	props: {
		look: {},
		assetBase: {},
		label: {},
		selected: { type: Boolean },
		crop: {}
	},
	emits: ["select"],
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<button${ssrRenderAttrs(mergeProps({
				class: ["kw-choice", { selected: __props.selected }],
				"aria-label": __props.label,
				"aria-pressed": __props.selected
			}, _attrs))}><span class="${ssrRenderClass([`crop-${__props.crop}`, "kw-choice-picture"])}" aria-hidden="true">`);
			_push(ssrRenderComponent(KeriAvatar_default, {
				look: __props.look,
				"asset-base": __props.assetBase,
				width: 260
			}, null, _parent));
			_push(`</span><span class="kw-choice-label">${ssrInterpolate(__props.label)}</span>`);
			if (__props.selected) _push(`<span class="kw-choice-check" aria-hidden="true">✓</span>`);
			else _push(`<!---->`);
			_push(`</button>`);
		};
	}
});
// components/sarkisian-studio/keri/KeriChoice.vue
var _sfc_setup$15 = KeriChoice_vue_vue_type_script_setup_true_lang_default.setup;
KeriChoice_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/keri/KeriChoice.vue");
	return _sfc_setup$15 ? _sfc_setup$15(props, ctx) : void 0;
};
var KeriChoice_default = Object.assign(KeriChoice_vue_vue_type_script_setup_true_lang_default, { __name: "KeriChoice" });
// components/sarkisian-studio/keri/KeriWardrobe.vue?vue&type=script&setup=true&lang.ts
var KeriWardrobe_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "KeriWardrobe",
	__ssrInlineRender: true,
	props: {
		assetBase: { default: "/studio-assets/" },
		embedded: {
			type: Boolean,
			default: false
		},
		initialLook: {},
		saveLook: {}
	},
	setup(__props) {
		const props = __props;
		const root = computed(() => props.assetBase.replace(/\/?$/, "/"));
		const assets = computed(() => `${root.value}keri/`);
		const look = ref({ ...DEFAULT_KERI_LOOK });
		const savedLook = ref({ ...DEFAULT_KERI_LOOK });
		const tab = ref("clothes");
		const closeUp = ref(false);
		const optionsPanel = ref();
		watch(tab, async () => {
			closeUp.value = [
				"hair",
				"face",
				"makeup",
				"accessories"
			].includes(tab.value);
			await nextTick();
			if (optionsPanel.value) optionsPanel.value.scrollTop = 0;
		});
		const tabs = [
			{
				id: "presets",
				label: "Образы",
				icon: Sparkles
			},
			{
				id: "clothes",
				label: "Одежда",
				icon: Shirt
			},
			{
				id: "hair",
				label: "Волосы",
				icon: Scissors
			},
			{
				id: "face",
				label: "Лицо",
				icon: UserRound
			},
			{
				id: "makeup",
				label: "Макияж",
				icon: Sparkles
			},
			{
				id: "accessories",
				label: "Детали",
				icon: Shirt
			}
		];
		const makeupGroups = [
			{
				key: "lipstick",
				name: "Помада",
				colors: LIP_COLORS
			},
			{
				key: "blush",
				name: "Румяна",
				colors: BLUSH_COLORS
			},
			{
				key: "eyeshadow",
				name: "Тени",
				colors: SHADOW_COLORS
			}
		];
		const accessoryGroups = [
			{
				key: "glasses",
				name: "Очки"
			},
			{
				key: "earrings",
				name: "Серьги"
			},
			{
				key: "necklace",
				name: "Украшения"
			},
			{
				key: "hairAccessory",
				name: "Аксессуары для волос"
			}
		];
		const loading = ref(true);
		const ready = ref(false);
		const error = ref("");
		const message = ref("");
		const exporting = ref(false);
		const saving = ref(false);
		const avatarKey = ref(0);
		const dirty = computed(() => JSON.stringify(look.value) !== JSON.stringify(savedLook.value));
		const preview = (patch) => ({
			...look.value,
			...patch
		});
		function update(patch) {
			look.value = preview(patch);
			error.value = "";
			message.value = "";
		}
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: ["keri-wardrobe", { "kw-embedded": __props.embedded }] }, _attrs))}>`);
			if (!__props.embedded) {
				_push(`<header class="kw-header"><a class="kw-brand" href="./" aria-label="SARKISIAN Studio — в студию"><img${ssrRenderAttr("src", `${root.value}logo.png`)} alt="SARKISIAN"><span>STUDIO</span></a><span class="kw-header-caption">Место для твоего творчества</span><a class="kw-back" href="./">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 15 }, null, _parent));
				_push(`<span>В студию</span></a></header>`);
			} else _push(`<!---->`);
			_push(`<main class="kw-main">`);
			if (!__props.embedded) _push(`<div class="kw-heading"><div><span class="kw-eyebrow">SARKISIAN · ПРИМЕРОЧНАЯ</span><h1>Образ, в котором ты — это ты.</h1><p>Собери свой стиль. Меняй детали под настроение.</p></div><span class="kw-step"><span>01</span> Твой персонаж</span></div>`);
			else _push(`<!---->`);
			_push(`<div class="kw-workspace"><section class="kw-preview" aria-label="Примерка образа"><div class="kw-stage"><div class="kw-stage-note"><span class="kw-eyebrow">ТВОЁ НАСТРОЕНИЕ</span><span>Начинается<br>с деталей.</span></div><div class="kw-arch" aria-hidden="true"></div><div class="${ssrRenderClass([{ "is-close": closeUp.value }, "kw-avatar-frame"])}">`);
			_push(ssrRenderComponent(KeriAvatar_default, {
				key: avatarKey.value,
				look: look.value,
				"asset-base": assets.value,
				onLoading: ($event) => loading.value = $event,
				onReady: ($event) => {
					ready.value = true;
					error.value = "";
				},
				onError: ($event) => error.value = $event
			}, null, _parent));
			_push(`</div><span class="kw-stage-mark" aria-hidden="true">S.</span><button class="kw-camera"${ssrRenderAttr("aria-pressed", closeUp.value)}>${ssrInterpolate(closeUp.value ? "Весь образ" : "Ближе")}</button></div><div class="kw-preview-footer"><span class="kw-preview-state" role="status">${ssrInterpolate(error.value ? "Образ не загрузился" : loading.value ? "Примеряем…" : "Твой образ")}</span>`);
			if (error.value) _push(`<button class="kw-text-button">Попробовать снова</button>`);
			else {
				_push(`<button class="kw-text-button"${ssrIncludeBooleanAttr(!ready.value || exporting.value || loading.value) ? " disabled" : ""}>`);
				_push(ssrRenderComponent(unref(ArrowDownToLine), { size: 16 }, null, _parent));
				_push(`${ssrInterpolate(exporting.value ? "Готовим PNG…" : "Скачать PNG")}</button>`);
			}
			_push(`</div></section><section class="kw-controls" aria-label="Настройки внешности"><nav class="kw-tabs" aria-label="Разделы примерочной"><!--[-->`);
			ssrRenderList(tabs, (item) => {
				_push(`<button class="${ssrRenderClass({ active: tab.value === item.id })}"${ssrRenderAttr("aria-pressed", tab.value === item.id)}>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(item.icon), { size: 18 }, null), _parent);
				_push(`<span>${ssrInterpolate(item.label)}</span></button>`);
			});
			_push(`<!--]--></nav><div class="kw-options">`);
			if (tab.value === "presets") {
				_push(`<!--[--><div class="kw-section-title"><h2>С чего начнём?</h2><span>${ssrInterpolate(unref(KERI_PRESETS).length)} образов</span></div><p class="kw-section-description">Выбери основу и добавь свои детали.</p><div class="kw-preset-grid"><!--[-->`);
				ssrRenderList(unref(KERI_PRESETS), (preset) => {
					_push(ssrRenderComponent(KeriChoice_default, {
						key: preset.name,
						look: preset.look,
						"asset-base": assets.value,
						label: preset.name,
						selected: JSON.stringify(look.value) === JSON.stringify(preset.look),
						crop: "look",
						onSelect: ($event) => update(preset.look)
					}, null, _parent));
				});
				_push(`<!--]--></div><!--]-->`);
			} else if (tab.value === "clothes") {
				_push(`<!--[--><div class="kw-section-title"><h2>Верх</h2><span>${ssrInterpolate(unref(TOP_NAMES).length)} вариантов</span></div><div class="kw-item-grid"><!--[-->`);
				ssrRenderList(unref(TOP_NAMES), (name, index) => {
					_push(ssrRenderComponent(KeriChoice_default, {
						key: name,
						look: preview({ top: index + 1 }),
						"asset-base": assets.value,
						label: name,
						selected: look.value.top === index + 1,
						crop: "top",
						onSelect: ($event) => update({ top: index + 1 })
					}, null, _parent));
				});
				_push(`<!--]--></div><fieldset class="kw-variants"><legend>Расцветка верха</legend><div><!--[-->`);
				ssrRenderList(unref(OUTFIT_COLORS), (color, index) => {
					_push(`<button style="${ssrRenderStyle({ background: color[1] })}"${ssrRenderAttr("aria-label", `Верх: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value.topColor === index + 1)} class="${ssrRenderClass({ selected: look.value.topColor === index + 1 })}">`);
					if (look.value.topColor === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></div></fieldset><div class="kw-divider"></div><fieldset class="kw-text-options"><legend>Рисунок на одежде</legend><div><!--[-->`);
				ssrRenderList(unref(ACCESSORIES).outfitPattern, (name, index) => {
					_push(`<button${ssrRenderAttr("aria-pressed", look.value.outfitPattern === index + 1)}>${ssrInterpolate(name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><div class="kw-section-title"><h2>Низ</h2><span>${ssrInterpolate(unref(BOTTOM_NAMES).length)} вариантов</span></div><div class="kw-item-grid kw-bottom-grid"><!--[-->`);
				ssrRenderList(unref(BOTTOM_NAMES), (name, index) => {
					_push(ssrRenderComponent(KeriChoice_default, {
						key: name,
						look: preview({ bottom: index + 1 }),
						"asset-base": assets.value,
						label: name,
						selected: look.value.bottom === index + 1,
						crop: "bottom",
						onSelect: ($event) => update({ bottom: index + 1 })
					}, null, _parent));
				});
				_push(`<!--]--></div><fieldset class="kw-variants"><legend>Расцветка низа</legend><div><!--[-->`);
				ssrRenderList(unref(OUTFIT_COLORS), (color, index) => {
					_push(`<button style="${ssrRenderStyle({ background: color[1] })}"${ssrRenderAttr("aria-label", `Низ: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value.bottomColor === index + 1)} class="${ssrRenderClass({ selected: look.value.bottomColor === index + 1 })}">`);
					if (look.value.bottomColor === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></div></fieldset><!--]-->`);
			} else if (tab.value === "hair") {
				_push(`<!--[--><div class="kw-section-title"><h2>Причёска</h2><span>${ssrInterpolate(unref(HAIR_NAMES).length)} вариантов</span></div><div class="kw-hair-grid"><!--[-->`);
				ssrRenderList(unref(HAIR_NAMES), (name, index) => {
					_push(ssrRenderComponent(KeriChoice_default, {
						key: name,
						look: preview({ hair: index + 1 }),
						"asset-base": assets.value,
						label: name,
						selected: look.value.hair === index + 1,
						crop: "hair",
						onSelect: ($event) => update({ hair: index + 1 })
					}, null, _parent));
				});
				_push(`<!--]--></div><fieldset class="kw-swatches"><legend>Цвет волос <span>${ssrInterpolate(unref(HAIR_COLORS)[look.value.hairColor - 1]?.[0])}</span></legend><div><!--[-->`);
				ssrRenderList(unref(HAIR_COLORS), (color, index) => {
					_push(`<button style="${ssrRenderStyle({ "--swatch": color[1] })}"${ssrRenderAttr("aria-label", `Волосы: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value.hairColor === index + 1)} class="${ssrRenderClass({ selected: look.value.hairColor === index + 1 })}">`);
					if (look.value.hairColor === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></div></fieldset><!--]-->`);
			} else if (tab.value === "makeup") {
				_push(`<!--[--><!--[-->`);
				ssrRenderList(makeupGroups, (group) => {
					_push(`<fieldset class="kw-swatches"><legend>${ssrInterpolate(group.name)} <span>${ssrInterpolate(group.colors[look.value[group.key] - 1]?.[0])}</span></legend><div><!--[-->`);
					ssrRenderList(group.colors, (color, index) => {
						_push(`<button style="${ssrRenderStyle({ "--swatch": color[1] })}"${ssrRenderAttr("title", color[0])}${ssrRenderAttr("aria-label", `${group.name}: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value[group.key] === index + 1)} class="${ssrRenderClass({ selected: look.value[group.key] === index + 1 })}">`);
						if (look.value[group.key] === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
						else _push(`<!---->`);
						_push(`</button>`);
					});
					_push(`<!--]--></div></fieldset>`);
				});
				_push(`<!--]--><fieldset class="kw-text-options"><legend>Подводка</legend><div><!--[-->`);
				ssrRenderList([
					"Без подводки",
					"Тонкая стрелка",
					"Выразительная стрелка"
				], (name, index) => {
					_push(`<button${ssrRenderAttr("aria-pressed", look.value.eyeliner === index + 1)}>${ssrInterpolate(name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><fieldset class="kw-text-options"><legend>Веснушки</legend><div><!--[-->`);
				ssrRenderList(["Без веснушек", "С веснушками"], (name, index) => {
					_push(`<button${ssrRenderAttr("aria-pressed", look.value.freckles === index + 1)}>${ssrInterpolate(name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><!--]-->`);
			} else if (tab.value === "accessories") {
				_push(`<!--[-->`);
				ssrRenderList(accessoryGroups, (group) => {
					_push(`<fieldset class="kw-text-options"><legend>${ssrInterpolate(group.name)}</legend><div><!--[-->`);
					ssrRenderList(unref(ACCESSORIES)[group.key], (name, index) => {
						_push(ssrRenderComponent(KeriChoice_default, {
							key: name,
							look: preview({ [group.key]: index + 1 }),
							"asset-base": assets.value,
							label: name,
							selected: look.value[group.key] === index + 1,
							crop: "hair",
							onSelect: ($event) => update({ [group.key]: index + 1 })
						}, null, _parent));
					});
					_push(`<!--]--></div></fieldset>`);
				});
				_push(`<!--]-->`);
			} else {
				_push(`<!--[--><div class="kw-section-title"><h2>Твои черты</h2><span>В деталях</span></div><fieldset class="kw-text-options"><legend>Овал лица</legend><div><!--[-->`);
				ssrRenderList([
					"Овальный",
					"Мягкий",
					"Удлинённый"
				], (name, index) => {
					_push(`<button${ssrRenderAttr("aria-pressed", look.value.faceShape === index + 1)}>${ssrInterpolate(name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><fieldset class="kw-text-options"><legend>Брови</legend><div><!--[-->`);
				ssrRenderList([
					"Естественные",
					"Тонкие",
					"Выразительные"
				], (name, index) => {
					_push(`<button${ssrRenderAttr("aria-pressed", look.value.brow === index + 1)}>${ssrInterpolate(name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><fieldset class="kw-swatches"><legend>Тон кожи <span>${ssrInterpolate(unref(SKIN_COLORS)[look.value.skin - 1]?.[0])}</span></legend><div><!--[-->`);
				ssrRenderList(unref(SKIN_COLORS), (color, index) => {
					_push(`<button style="${ssrRenderStyle({ "--swatch": color[1] })}"${ssrRenderAttr("aria-label", `Кожа: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value.skin === index + 1)} class="${ssrRenderClass({ selected: look.value.skin === index + 1 })}">`);
					if (look.value.skin === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></div></fieldset><div class="kw-divider"></div><fieldset class="kw-eye-shape"><legend>Форма глаз</legend><div><!--[-->`);
				ssrRenderList(3, (n) => {
					_push(ssrRenderComponent(KeriChoice_default, {
						key: n,
						look: preview({ eyes: n }),
						"asset-base": assets.value,
						label: `Форма ${n}`,
						selected: look.value.eyes === n,
						crop: "hair",
						onSelect: ($event) => update({ eyes: n })
					}, null, _parent));
				});
				_push(`<!--]--></div></fieldset><fieldset class="kw-swatches"><legend>Цвет глаз <span>${ssrInterpolate(unref(EYE_COLORS)[look.value.eyeColor - 1]?.[0])}</span></legend><div><!--[-->`);
				ssrRenderList(unref(EYE_COLORS), (color, index) => {
					_push(`<button style="${ssrRenderStyle({ "--swatch": color[1] })}"${ssrRenderAttr("aria-label", `Глаза: ${color[0]}`)}${ssrRenderAttr("aria-pressed", look.value.eyeColor === index + 1)} class="${ssrRenderClass({ selected: look.value.eyeColor === index + 1 })}">`);
					if (look.value.eyeColor === index + 1) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`</button>`);
				});
				_push(`<!--]--></div></fieldset><!--]-->`);
			}
			_push(`</div><div class="kw-actions"><div class="kw-utility"><button class="kw-text-button">`);
			_push(ssrRenderComponent(unref(Shuffle), { size: 16 }, null, _parent));
			_push(`Случайный образ</button><button class="kw-text-button"${ssrIncludeBooleanAttr(!dirty.value) ? " disabled" : ""}>`);
			_push(ssrRenderComponent(unref(RotateCcw), { size: 15 }, null, _parent));
			_push(`Вернуть</button></div><button class="kw-save"${ssrIncludeBooleanAttr(!ready.value || loading.value || !!error.value || saving.value) ? " disabled" : ""}><span>${ssrInterpolate(saving.value ? "Сохраняем…" : "Сохранить образ")}</span>`);
			_push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
			_push(`</button><p class="kw-save-message" aria-live="polite">${ssrInterpolate(message.value || error.value || (dirty.value ? "Есть изменения. Сохрани свой новый образ." : "Образ сохранится на этом устройстве."))}</p></div></section></div></main><footer class="kw-credits"><span>SARKISIAN STUDIO · ТВОЯ ИСТОРИЯ КРАСОТЫ</span><span>Персонаж <a href="https://konett.itch.io/" target="_blank" rel="noreferrer">Konett</a> · адаптация <a href="https://lunalucid.itch.io/free-character-creation-template-for-renpy" target="_blank" rel="noreferrer">LunaLucid</a> · CC BY</span></footer></div>`);
		};
	}
});
// components/sarkisian-studio/keri/KeriWardrobe.vue
var _sfc_setup$14 = KeriWardrobe_vue_vue_type_script_setup_true_lang_default.setup;
KeriWardrobe_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/keri/KeriWardrobe.vue");
	return _sfc_setup$14 ? _sfc_setup$14(props, ctx) : void 0;
};
var KeriWardrobe_default = Object.assign(KeriWardrobe_vue_vue_type_script_setup_true_lang_default, { __name: "KeriWardrobe" });
// components/sarkisian-studio/atelier/KeriPortrait.vue?vue&type=script&setup=true&lang.ts
var KeriPortrait_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "KeriPortrait",
	__ssrInlineRender: true,
	props: {
		look: {},
		assetBase: {},
		crop: { default: "head" },
		animated: {
			type: Boolean,
			default: false
		},
		label: { default: "Персонаж" }
	},
	setup(__props) {
		const props = __props;
		const canvas = ref();
		let layers = [], revision = 0, timer, eyeBounds = {
			x: 0,
			y: 0,
			w: 0,
			h: 0
		}, disposed = false;
		const ready = ref(false);
		function draw(closed = false) {
			const ctx = canvas.value?.getContext("2d");
			if (!ctx || !layers.length) return;
			const [x, y, w, h] = props.crop === "head" ? [
				195,
				10,
				575,
				630
			] : [
				120,
				0,
				700,
				1120
			];
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
			ctx.save();
			ctx.scale(ctx.canvas.width / w, ctx.canvas.height / h);
			ctx.translate(-x, -y);
			drawStyledKeri(ctx, layers, props.look, closed, eyeBounds);
			ctx.restore();
		}
		function schedule() {
			clearTimeout(timer);
			if (!props.animated) return;
			timer = setTimeout(() => {
				if (!(void 0).hidden && true) {
					draw(true);
					timer = setTimeout(() => {
						draw();
						schedule();
					}, 110);
				} else schedule();
			}, 4200 + Math.random() * 2500);
		}
		watch(() => [
			props.look,
			props.assetBase,
			props.crop,
			canvas.value
		], async () => {
			if (!canvas.value) return;
			const current = ++revision;
			try {
				const next = await Promise.all(keriLayers(props.look, `${props.assetBase.replace(/\/?$/, "/")}keri/`).map(loadKeriImage));
				if (current !== revision || disposed) return;
				layers = next;
				const c = (void 0).createElement("canvas");
				c.width = 948;
				c.height = 1920;
				const ctx = c.getContext("2d");
				ctx.drawImage(layers[4], 0, 0);
				const { data } = ctx.getImageData(0, 0, 948, 600);
				let x0 = 948, y0 = 600, x1 = 0, y1 = 0;
				for (let y = 0; y < 600; y++) for (let x = 0; x < 948; x++) if (data[(y * 948 + x) * 4 + 3] > 32) {
					x0 = Math.min(x0, x);
					x1 = Math.max(x1, x);
					y0 = Math.min(y0, y);
					y1 = Math.max(y1, y);
				}
				eyeBounds = {
					x: x0,
					y: y0,
					w: x1 - x0 + 1,
					h: y1 - y0 + 1
				};
				draw();
				ready.value = true;
				schedule();
			} catch {
				ready.value = false;
			}
		}, {
			deep: true,
			flush: "post"
		});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<canvas${ssrRenderAttrs(mergeProps({
				ref_key: "canvas",
				ref: canvas,
				width: __props.crop === "head" ? 256 : 560,
				height: __props.crop === "head" ? 280 : 896,
				"data-ready": ready.value,
				class: "at-portrait",
				role: "img",
				"aria-label": __props.label
			}, _attrs))} data-v-571ce975></canvas>`);
		};
	}
});
// components/sarkisian-studio/atelier/KeriPortrait.vue
var _sfc_setup$13 = KeriPortrait_vue_vue_type_script_setup_true_lang_default.setup;
KeriPortrait_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/KeriPortrait.vue");
	return _sfc_setup$13 ? _sfc_setup$13(props, ctx) : void 0;
};
var KeriPortrait_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(KeriPortrait_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-571ce975"]]), { __name: "KeriPortrait" });
// components/sarkisian-studio/atelier/StudioClock.vue?vue&type=script&setup=true&lang.ts
var StudioClock_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "StudioClock",
	__ssrInlineRender: true,
	setup(__props) {
		const faceId = `clock-face-${useId()}`;
		const now = ref(null);
		const time = computed(() => now.value?.toLocaleTimeString("ru-RU", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit"
		}) ?? "");
		const angles = computed(() => {
			const date = now.value;
			if (!date) return {
				hour: 0,
				minute: 0,
				second: 0
			};
			const seconds = date.getSeconds();
			const minutes = date.getMinutes() + seconds / 60;
			return {
				hour: (date.getHours() % 12 + minutes / 60) * 30,
				minute: minutes * 6,
				second: seconds * 6
			};
		});
		return (_ctx, _push, _parent, _attrs) => {
			if (now.value) {
				_push(`<svg${ssrRenderAttrs(mergeProps({
					class: "at-wall-clock",
					viewBox: "0 0 1536 1024",
					role: "img",
					"aria-label": `Местное время: ${time.value}`
				}, _attrs))} data-v-c2b3e635><title data-v-c2b3e635>Местное время: ${ssrInterpolate(time.value)}</title><defs data-v-c2b3e635><radialGradient${ssrRenderAttr("id", faceId)} cx="35%" cy="32%" r="80%" data-v-c2b3e635><stop stop-color="#f7e7cb" data-v-c2b3e635></stop><stop offset="1" stop-color="#e9cfae" data-v-c2b3e635></stop></radialGradient></defs><g transform="translate(1159.5 121) scale(.974 1)" data-v-c2b3e635><circle r="59.2"${ssrRenderAttr("fill", `url(#${faceId})`)} data-v-c2b3e635></circle><g stroke="#705138" stroke-width="1.25" stroke-linecap="round" data-v-c2b3e635><!--[-->`);
				ssrRenderList(12, (tick) => {
					_push(`<line x1="0"${ssrRenderAttr("y1", tick % 3 === 0 ? -47 : -50)} x2="0" y2="-56"${ssrRenderAttr("transform", `rotate(${tick * 30})`)} data-v-c2b3e635></line>`);
				});
				_push(`<!--]--></g><g fill="none" stroke-linecap="round" data-v-c2b3e635><path data-hand="hour" d="M0 3V-32"${ssrRenderAttr("transform", `rotate(${angles.value.hour})`)} stroke="#80562f" stroke-width="3.4" data-v-c2b3e635></path><path data-hand="minute" d="M0 4V-44"${ssrRenderAttr("transform", `rotate(${angles.value.minute})`)} stroke="#80562f" stroke-width="2.2" data-v-c2b3e635></path><path data-hand="second" d="M0 9V-49"${ssrRenderAttr("transform", `rotate(${angles.value.second})`)} stroke="#ae7761" stroke-width="1" data-v-c2b3e635></path></g><circle r="3.1" fill="#957047" stroke="#69492d" stroke-width=".8" data-v-c2b3e635></circle><circle r="1.1" fill="#e7c58e" data-v-c2b3e635></circle></g></svg>`);
			} else _push(`<!---->`);
		};
	}
});
// components/sarkisian-studio/atelier/StudioClock.vue
var _sfc_setup$12 = StudioClock_vue_vue_type_script_setup_true_lang_default.setup;
StudioClock_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/StudioClock.vue");
	return _sfc_setup$12 ? _sfc_setup$12(props, ctx) : void 0;
};
var StudioClock_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(StudioClock_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-c2b3e635"]]), { __name: "StudioClock" });
// components/sarkisian-studio/atelier/StudioScene.vue?vue&type=script&setup=true&lang.ts
var StudioScene_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "StudioScene",
	__ssrInlineRender: true,
	props: {
		assetBase: {},
		look: {},
		name: {},
		upgraded: { type: Boolean },
		empty: { type: Boolean }
	},
	emits: ["shelf"],
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({
				class: "at-scene",
				role: "group",
				"aria-label": "Рабочее место с точки зрения мастера"
			}, _attrs))} data-v-74971c5e><img class="at-room"${ssrRenderAttr("src", `${__props.assetBase}atelier/studio-v3.png`)} alt="Твой стол. Клиентское кресло напротив, лампа справа. На правых полках — фирменные банки и флаконы SARKISIAN." fetchpriority="high" data-v-74971c5e>`);
			_push(ssrRenderComponent(StudioClock_default, null, null, _parent));
			_push(`<div class="at-room-sign" aria-hidden="true" data-v-74971c5e>SARKISIAN<span data-v-74971c5e>NAIL ATELIER</span></div>`);
			if (!__props.empty) {
				_push(`<div class="at-seated-client" data-v-74971c5e>`);
				_push(ssrRenderComponent(KeriPortrait_default, {
					look: __props.look,
					"asset-base": __props.assetBase,
					crop: "seated",
					animated: "",
					label: `Клиент — ${__props.name}`
				}, null, _parent));
				_push(`</div>`);
			} else _push(`<!---->`);
			_push(`<img class="at-foreground"${ssrRenderAttr("src", `${__props.assetBase}atelier/studio-v3.png`)} alt="" aria-hidden="true" data-v-74971c5e>`);
			if (__props.upgraded) _push(`<div class="at-desk-collection" aria-label="Коллекция Pastel на твоём столе" data-v-74971c5e><i data-v-74971c5e></i><i data-v-74971c5e></i><i data-v-74971c5e></i><span data-v-74971c5e>PASTEL</span></div>`);
			else _push(`<!---->`);
			_push(`<div class="at-sunbeam" aria-hidden="true" data-v-74971c5e></div><button class="at-shelf-hit" aria-label="Открыть полку материалов SARKISIAN" data-v-74971c5e></button></div>`);
		};
	}
});
// components/sarkisian-studio/atelier/StudioScene.vue
var _sfc_setup$11 = StudioScene_vue_vue_type_script_setup_true_lang_default.setup;
StudioScene_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/StudioScene.vue");
	return _sfc_setup$11 ? _sfc_setup$11(props, ctx) : void 0;
};
var StudioScene_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(StudioScene_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-74971c5e"]]), { __name: "StudioScene" });
// components/sarkisian-studio/atelier/FinishGame.vue?vue&type=script&setup=true&lang.ts
var FinishGame_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "FinishGame",
	__ssrInlineRender: true,
	props: {
		upgraded: { type: Boolean },
		value: {}
	},
	emits: ["done"],
	setup(__props, { emit: __emit }) {
		const position = ref(10), running = ref(false), reduced = ref(false), round = ref(0);
		const scores = [];
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "at-finish-game" }, _attrs))}><div class="at-finish-emblem">`);
			if (__props.value !== null) _push(ssrRenderComponent(unref(Check), { size: 28 }, null, _parent));
			else _push(ssrRenderComponent(unref(Sparkles), { size: 28 }, null, _parent));
			_push(`</div><h3>${ssrInterpolate(__props.value !== null ? "Последний штрих готов" : [
				"Выровняйте топ",
				"Полимеризация в лампе",
				"Масло для кутикулы"
			][round.value])}</h3><p>${ssrInterpolate(__props.value !== null ? `Аккуратность: ${__props.value}%. Можно показывать результат.` : [
				"Распределите топ без наплывов: остановите бегунок в центре.",
				"Закрепите покрытие: поймайте зону готовности лампы.",
				"Нанесите масло вдоль кутикулы: последнее точное касание."
			][round.value])}</p>`);
			if (__props.value === null) _push(`<div class="at-finish-track" style="${ssrRenderStyle({ "--zone": __props.upgraded ? "36%" : "24%" })}"><div class="at-finish-zone"></div><span style="${ssrRenderStyle({ left: `${position.value}%` })}"></span></div>`);
			else _push(`<!---->`);
			if (__props.value === null) {
				_push(`<!--[-->`);
				if (reduced.value) {
					_push(`<!--[--><input${ssrRenderAttr("value", position.value)} type="range" min="4" max="96" aria-label="Положение блика"><button class="at-btn at-primary">${ssrInterpolate([
						"Закрепить топ",
						"Завершить полимеризацию",
						"Нанести масло"
					][round.value])} `);
					_push(ssrRenderComponent(unref(Check), { size: 17 }, null, _parent));
					_push(`</button><!--]-->`);
				} else {
					_push(`<!--[--><div class="at-rounds"><!--[-->`);
					ssrRenderList(3, (i) => {
						_push(`<span class="${ssrRenderClass({ done: i <= round.value })}">${ssrInterpolate(i <= round.value ? `${scores[i - 1]}%` : `0${i}`)}</span>`);
					});
					_push(`<!--]--></div>`);
					if (running.value) {
						_push(`<button class="at-btn at-primary">Поймать блик `);
						_push(ssrRenderComponent(unref(Sparkles), { size: 17 }, null, _parent));
						_push(`</button>`);
					} else {
						_push(`<button class="at-btn at-primary">${ssrInterpolate(round.value ? "Следующее касание" : "Начать")} `);
						_push(ssrRenderComponent(unref(Play), { size: 16 }, null, _parent));
						_push(`</button>`);
					}
					_push(`<!--]-->`);
				}
				_push(`<!--]-->`);
			} else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/sarkisian-studio/atelier/FinishGame.vue
var _sfc_setup$10 = FinishGame_vue_vue_type_script_setup_true_lang_default.setup;
FinishGame_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/FinishGame.vue");
	return _sfc_setup$10 ? _sfc_setup$10(props, ctx) : void 0;
};
var FinishGame_default = Object.assign(FinishGame_vue_vue_type_script_setup_true_lang_default, { __name: "FinishGame" });
// components/sarkisian-studio/atelier/NailFit.vue?vue&type=script&setup=true&lang.ts
var NailFit_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "NailFit",
	__ssrInlineRender: true,
	props: {
		shape: {},
		length: {}
	},
	emits: ["shape", "length"],
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<fieldset${ssrRenderAttrs(mergeProps({ class: "at-nail-fit" }, _attrs))}><legend>Форма и длина</legend><div class="at-shape-options" role="group" aria-label="Форма ногтей"><!--[-->`);
			ssrRenderList(unref(NAIL_SHAPES), (item) => {
				_push(`<button${ssrRenderAttr("aria-label", `Форма: ${item.name}`)}${ssrRenderAttr("aria-pressed", (__props.shape ?? "almond") === item.id)}><i class="${ssrRenderClass(`fit-${item.id}`)}"></i><span>${ssrInterpolate(item.name)}</span></button>`);
			});
			_push(`<!--]--></div><div class="at-length-options" role="group" aria-label="Длина ногтей"><!--[-->`);
			ssrRenderList(unref(NAIL_LENGTHS), (item) => {
				_push(`<button${ssrRenderAttr("aria-label", `Длина: ${item.name}`)}${ssrRenderAttr("aria-pressed", (__props.length ?? "natural") === item.id)}>${ssrInterpolate(item.name)}</button>`);
			});
			_push(`<!--]--></div></fieldset>`);
		};
	}
});
// components/sarkisian-studio/atelier/NailFit.vue
var _sfc_setup$9 = NailFit_vue_vue_type_script_setup_true_lang_default.setup;
NailFit_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/NailFit.vue");
	return _sfc_setup$9 ? _sfc_setup$9(props, ctx) : void 0;
};
var NailFit_default = Object.assign(NailFit_vue_vue_type_script_setup_true_lang_default, { __name: "NailFit" });
// components/sarkisian-studio/atelier/ShiftGoals.vue?vue&type=script&setup=true&lang.ts
var ShiftGoals_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "ShiftGoals",
	__ssrInlineRender: true,
	props: {
		shift: {},
		compact: { type: Boolean }
	},
	emits: ["open"],
	setup(__props) {
		const props = __props;
		const goals = computed(() => shiftGoals(props.shift));
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({
				class: ["at-goals", { compact: __props.compact }],
				"aria-label": "Цели смены"
			}, _attrs))}><div class="at-goals-heading"><span>`);
			_push(ssrRenderComponent(unref(Flag), { size: 14 }, null, _parent));
			_push(`Смена ${ssrInterpolate(__props.shift.number)}</span><b>${ssrInterpolate(__props.shift.visits.length)} / 3 приёма</b></div><!--[-->`);
			ssrRenderList(goals.value, (goal) => {
				_push(`<div class="${ssrRenderClass([{ achieved: goal.current >= goal.target }, "at-goal"])}"><span class="at-goal-check">`);
				if (goal.current >= goal.target) _push(ssrRenderComponent(unref(Check), { size: 12 }, null, _parent));
				else _push(`<!---->`);
				_push(`</span><div><span>${ssrInterpolate(goal.name)}</span><small>${ssrInterpolate(goal.current)} / ${ssrInterpolate(goal.target)}</small></div><b>+${ssrInterpolate(goal.reward)}</b></div>`);
			});
			_push(`<!--]-->`);
			if (__props.compact) {
				_push(`<button class="at-text-button">${ssrInterpolate(__props.shift.visits.length === 3 ? "Забрать награду за смену" : "Цели и награды")} `);
				_push(ssrRenderComponent(unref(Coins), { size: 14 }, null, _parent));
				_push(`</button>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/sarkisian-studio/atelier/ShiftGoals.vue
var _sfc_setup$8 = ShiftGoals_vue_vue_type_script_setup_true_lang_default.setup;
ShiftGoals_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/ShiftGoals.vue");
	return _sfc_setup$8 ? _sfc_setup$8(props, ctx) : void 0;
};
var ShiftGoals_default = Object.assign(ShiftGoals_vue_vue_type_script_setup_true_lang_default, { __name: "ShiftGoals" });
// components/sarkisian-studio/atelier/SupplyMark.vue?vue&type=script&setup=true&lang.ts
var SupplyMark_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SupplyMark",
	__ssrInlineRender: true,
	props: { id: {} },
	setup(__props) {
		const fillId = `supply-${useId()}`;
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<svg${ssrRenderAttrs(mergeProps({
				class: "at-supply-mark",
				viewBox: "0 0 120 130",
				"aria-hidden": "true"
			}, _attrs))}><defs><linearGradient${ssrRenderAttr("id", fillId)}><stop stop-color="#44413e"></stop><stop offset=".35" stop-color="#242525"></stop><stop offset=".75" stop-color="#343331"></stop><stop offset="1" stop-color="#1d1f1f"></stop></linearGradient></defs><ellipse cx="61" cy="119" rx="44" ry="5" fill="#6e62591a"></ellipse><g${ssrRenderAttr("fill", `url(#${fillId})`)} stroke="#3f3a34" stroke-width=".9">`);
			if (unref(supplyById)(__props.id)?.bottle) _push(`<!--[--><path d="M46 14Q60 11 74 14L73 66H47Z"></path><path d="M47 65Q28 65 28 78V109Q28 119 39 119H81Q92 119 92 109V78Q92 65 73 65Z"></path><!--]-->`);
			else _push(`<!--[--><path d="M17 72H103V105Q103 119 60 119Q17 119 17 105Z"></path><path d="M16 63Q60 54 104 63V79Q60 88 16 79Z"></path><ellipse cx="60" cy="63" rx="44" ry="8" fill="#514b45"></ellipse><!--]-->`);
			_push(`</g><text x="60" y="94" fill="#f5e8d4" text-anchor="middle" font-family="Arial,sans-serif"${ssrRenderAttr("font-size", __props.id === "polish" ? 6.5 : 8)} letter-spacing="1.4">SARKISIAN</text><text x="60" y="101" fill="#d4c5b1" text-anchor="middle" font-family="Arial,sans-serif" font-size="3.7" letter-spacing=".8">${ssrInterpolate(unref(supplyById)(__props.id)?.label)}</text><rect x="48" y="106" width="24" height="4" rx="2"${ssrRenderAttr("fill", unref(supplyById)(__props.id)?.shade)}></rect></svg>`);
		};
	}
});
// components/sarkisian-studio/atelier/SupplyMark.vue
var _sfc_setup$7 = SupplyMark_vue_vue_type_script_setup_true_lang_default.setup;
SupplyMark_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/SupplyMark.vue");
	return _sfc_setup$7 ? _sfc_setup$7(props, ctx) : void 0;
};
var SupplyMark_default = Object.assign(SupplyMark_vue_vue_type_script_setup_true_lang_default, { __name: "SupplyMark" });
// components/sarkisian-studio/atelier/MaterialShelf.vue?vue&type=script&setup=true&lang.ts
var MaterialShelf_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "MaterialShelf",
	__ssrInlineRender: true,
	props: {
		supplies: {},
		coins: {},
		design: {},
		selected: {},
		canChoose: { type: Boolean },
		busy: { type: Boolean },
		message: {},
		siteBase: {}
	},
	emits: ["choose", "buy"],
	setup(__props) {
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "at-shelf-content" }, _attrs))}><div class="at-shelf-heading"><div><span class="at-eyebrow">SARKISIAN · ОТ МАСТЕРА МАСТЕРАМ</span><h2>На вашей полке</h2><p>Подберите материал под работу. Выполните заказ на 4–5 звёзд с аккуратностью от 85% и получите бонус.</p></div><span class="at-shelf-wallet">`);
			_push(ssrRenderComponent(unref(Coins), { size: 16 }, null, _parent));
			_push(`${ssrInterpolate(__props.coins.toLocaleString("ru-RU"))}</span></div><div class="${ssrRenderClass([{ selected: !__props.selected && __props.canChoose }, "at-basic-kit"])}">`);
			_push(ssrRenderComponent(unref(Infinity), { size: 24 }, null, _parent));
			_push(`<div><b>Базовый набор</b><span>Безлимитно · обычная оплата за заказ</span></div>`);
			if (__props.canChoose) {
				_push(`<button class="at-text-button"${ssrIncludeBooleanAttr(__props.busy) ? " disabled" : ""}${ssrRenderAttr("aria-pressed", !__props.selected)}>${ssrInterpolate(!__props.selected ? "Выбран" : "Выбрать")}`);
				if (!__props.selected) _push(ssrRenderComponent(unref(Check), { size: 14 }, null, _parent));
				else _push(`<!---->`);
				_push(`</button>`);
			} else _push(`<span class="at-basic-free">Всегда бесплатно</span>`);
			_push(`</div><div class="at-supply-grid"><!--[-->`);
			ssrRenderList(unref(SUPPLIES), (product) => {
				_push(`<article class="${ssrRenderClass([{ selected: __props.selected === product.id && __props.canChoose }, "at-supply-card"])}"${ssrRenderAttr("data-supply", product.id)}><div class="at-supply-art" style="${ssrRenderStyle({ "--supply-shade": product.shade })}">`);
				_push(ssrRenderComponent(SupplyMark_default, { id: product.id }, null, _parent));
				if (__props.canChoose && __props.design && unref(supplyFits)(product.id, __props.design)) _push(`<span class="at-supply-match">Подходит к работе</span>`);
				else _push(`<!---->`);
				_push(`</div><div class="at-supply-copy"><div class="${ssrRenderClass([{ low: __props.supplies.stock[product.id] <= 1 }, "at-supply-stock"])}"><span>${ssrInterpolate(__props.supplies.stock[product.id] ? "В запасе" : "Закончился")}</span><b>${ssrInterpolate(__props.supplies.stock[product.id])} <small>приёмов</small></b></div><h3>${ssrInterpolate(product.name)}</h3><p>${ssrInterpolate(product.use)}</p><span class="at-supply-bonus">`);
				_push(ssrRenderComponent(unref(Coins), { size: 13 }, null, _parent));
				_push(`+${ssrInterpolate(product.bonus)} за аккуратную работу</span>`);
				if (__props.canChoose) {
					_push(`<button class="${ssrRenderClass([__props.selected === product.id ? "at-secondary" : "at-primary", "at-btn"])}"${ssrRenderAttr("aria-pressed", __props.selected === product.id)}${ssrIncludeBooleanAttr(__props.busy || !__props.supplies.stock[product.id]) ? " disabled" : ""}>`);
					if (__props.selected === product.id) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(`<!---->`);
					_push(`${ssrInterpolate(__props.selected === product.id ? "Выбран для приёма" : __props.supplies.stock[product.id] ? "Взять на приём" : "Нет в запасе")}</button>`);
				} else _push(`<!---->`);
				_push(`<button class="at-restock"${ssrIncludeBooleanAttr(__props.busy || __props.coins < product.price || __props.supplies.stock[product.id] + product.pack > unref(30)) ? " disabled" : ""}${ssrRenderAttr("aria-label", `Пополнить: ${product.name}, ${product.pack} приёмов за ${product.price} монет`)}>`);
				_push(ssrRenderComponent(unref(PackagePlus), { size: 15 }, null, _parent));
				_push(`<span>+${ssrInterpolate(product.pack)} приёмов</span><b>${ssrInterpolate(product.price)} `);
				_push(ssrRenderComponent(unref(Coins), { size: 12 }, null, _parent));
				_push(`</b></button>`);
				if (__props.coins < product.price) _push(`<small class="at-supply-limit">Нужно ещё ${ssrInterpolate(product.price - __props.coins)} монет</small>`);
				else if (__props.supplies.stock[product.id] + product.pack > unref(30)) _push(`<small class="at-supply-limit">Полка заполнена · максимум ${ssrInterpolate(unref(30))}</small>`);
				else _push(`<!---->`);
				_push(`</div></article>`);
			});
			_push(`<!--]--></div>`);
			if (__props.message) _push(`<p class="at-shelf-message" role="status">${ssrInterpolate(__props.message)}</p>`);
			else _push(`<!---->`);
			_push(`<div class="at-shelf-footer"><p>Один приём расходует одну порцию после завершения. Выбор можно менять до финиша. В практике запас не расходуется.</p><a${ssrRenderAttr("href", __props.siteBase)} target="_blank" rel="noopener noreferrer">Продукция бренда `);
			_push(ssrRenderComponent(unref(ArrowUpRight), { size: 14 }, null, _parent));
			_push(`</a></div><p class="at-supply-game-note">Бонусы и назначения на этой полке — правила игры. Реальные свойства и применение материалов смотрите на сайте бренда. Пополнение оплачивается только игровыми монетами.</p></div>`);
		};
	}
});
// components/sarkisian-studio/atelier/MaterialShelf.vue
var _sfc_setup$6 = MaterialShelf_vue_vue_type_script_setup_true_lang_default.setup;
MaterialShelf_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/MaterialShelf.vue");
	return _sfc_setup$6 ? _sfc_setup$6(props, ctx) : void 0;
};
var MaterialShelf_default = Object.assign(MaterialShelf_vue_vue_type_script_setup_true_lang_default, { __name: "MaterialShelf" });
// components/sarkisian-studio/atelier/StudioTool.vue?vue&type=script&setup=true&lang.ts
var StudioTool_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "StudioTool",
	__ssrInlineRender: true,
	props: {
		tool: {},
		active: { type: Boolean }
	},
	setup(__props) {
		const props = __props;
		const kind = computed(() => TOOLS.find((t) => t.id === props.tool)?.kind);
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<svg${ssrRenderAttrs(mergeProps({
				class: ["at-real-tool", { working: __props.active }],
				viewBox: "0 0 80 160",
				"aria-hidden": "true",
				fill: "none",
				"stroke-linecap": "round",
				"stroke-linejoin": "round"
			}, _attrs))} data-v-96f42cf0>`);
			if (kind.value === "drill") {
				_push(`<!--[--><path d="M40 10V47" stroke="#aeb8c2" stroke-width="7" data-v-96f42cf0></path>`);
				if (__props.tool === "carbide") _push(`<path d="M30 16Q29 5 40 4Q51 5 50 16L48 37H32Z" fill="#d2c4a7" stroke="#847766" stroke-width="2" data-v-96f42cf0></path>`);
				else if (__props.tool === "flame") _push(`<path d="M40 3Q58 29 40 35Q22 29 40 3Z" fill="#b5bfc9" stroke="#75828f" stroke-width="2" data-v-96f42cf0></path>`);
				else _push(`<circle cx="40" cy="18" r="12" fill="#bfccd3" stroke="#75828f" stroke-width="2" data-v-96f42cf0></circle>`);
				_push(`<path d="M27 50Q40 43 53 50L57 128Q57 143 40 144Q23 143 23 128Z" fill="#e4e8eb" stroke="#909ba3" stroke-width="2" data-v-96f42cf0></path><path d="M29 61H51M28 69H52M28 77H52M27 85H53" stroke="#929fa9" stroke-width="3" data-v-96f42cf0></path><path d="M40 144V158" stroke="#50545c" stroke-width="6" data-v-96f42cf0></path><!--]-->`);
			} else if (kind.value === "scissors") _push(`<!--[--><path d="M34 88L19 9Q33 17 42 78L58 9Q68 24 45 89" fill="#d8e0e7" stroke="#8b9aa4" stroke-width="2" data-v-96f42cf0></path><path d="M33 88L25 115M46 88L55 115" stroke="#c2cbd2" stroke-width="8" data-v-96f42cf0></path><ellipse cx="21" cy="132" rx="14" ry="20" stroke="#c6d1d8" stroke-width="7" data-v-96f42cf0></ellipse><ellipse cx="58" cy="132" rx="14" ry="20" stroke="#c6d1d8" stroke-width="7" data-v-96f42cf0></ellipse><circle cx="40" cy="83" r="4" fill="#727e87" data-v-96f42cf0></circle><!--]-->`);
			else if (kind.value === "file" || kind.value === "buff") _push(`<!--[--><rect${ssrRenderAttr("x", kind.value === "buff" ? 12 : 23)} y="9"${ssrRenderAttr("width", kind.value === "buff" ? 56 : 34)} height="142" rx="15"${ssrRenderAttr("fill", kind.value === "buff" ? "#c3adcc" : "#b7b7bd")} stroke="#89848e" stroke-width="3" data-v-96f42cf0></rect><path d="M31 27H49M31 38H49M31 49H49M31 60H49M31 71H49M31 82H49M31 93H49M31 104H49M31 115H49M31 126H49" stroke="#ffffff55" stroke-width="2" data-v-96f42cf0></path><!--]-->`);
			else if (kind.value === "pusher") _push(`<!--[--><path d="M40 40V137" stroke="#a5b3bf" stroke-width="10" data-v-96f42cf0></path><path d="M30 33Q18 2 40 4Q62 2 50 33L45 47H35Z" fill="#d0d9df" stroke="#8c9aa5" stroke-width="2" data-v-96f42cf0></path><path d="M40 136L35 155L46 149Z" fill="#c2cbd2" data-v-96f42cf0></path><path d="M35 65H45M35 74H45M35 83H45M35 92H45M35 101H45" stroke="#e8edf0" stroke-width="2" data-v-96f42cf0></path><!--]-->`);
			else if (kind.value === "bottle") _push(`<!--[--><rect x="25" y="8" width="30" height="47" rx="5" fill="#2b2d31" stroke="#8c8d92" stroke-width="2" data-v-96f42cf0></rect><rect x="15" y="55" width="50" height="93" rx="13"${ssrRenderAttr("fill", __props.tool === "base" ? "#ddd3c3" : "#a3c4cb")} stroke="#8d9a9e" stroke-width="2" data-v-96f42cf0></rect><path d="M23 76H57V118H23Z" fill="#f9f6ef" data-v-96f42cf0></path><path d="M29 88H51M29 96H51M32 106H48" stroke="#626166" stroke-width="2" data-v-96f42cf0></path><!--]-->`);
			else _push(`<!--[--><ellipse cx="40" cy="83" rx="34" ry="40" fill="#f4eee2" stroke="#c2b9a9" stroke-width="2" data-v-96f42cf0></ellipse><path d="M20 70Q40 55 60 73M19 88Q40 73 61 91M24 104Q40 94 56 107" stroke="#ddd6c9" stroke-width="2" data-v-96f42cf0></path><!--]-->`);
			_push(`</svg>`);
		};
	}
});
// components/sarkisian-studio/atelier/StudioTool.vue
var _sfc_setup$5 = StudioTool_vue_vue_type_script_setup_true_lang_default.setup;
StudioTool_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/StudioTool.vue");
	return _sfc_setup$5 ? _sfc_setup$5(props, ctx) : void 0;
};
var StudioTool_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(StudioTool_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-96f42cf0"]]), { __name: "StudioTool" });
// components/sarkisian-studio/atelier/NailPreparation.vue?vue&type=script&setup=true&lang.ts
var NailPreparation_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "NailPreparation",
	__ssrInlineRender: true,
	props: {
		preparation: {},
		nailIndex: {},
		mode: {},
		organizer: { type: Boolean },
		design: {},
		imageUrl: {}
	},
	emits: ["update", "select"],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const step = computed(() => currentPrepStep(props.preparation)), steps = computed(() => preparationSteps(props.preparation.technique)), progress = computed(() => prepProgress(props.preparation));
		const nail = computed(() => Math.max(0, Math.min(4, props.nailIndex)));
		const value = computed(() => step.value ? props.preparation.progress[step.value.id]?.[nail.value] ?? 0 : 100);
		const toolReady = computed(() => !!step.value?.tools.includes(props.preparation.tool)), selectedTool = computed(() => TOOLS.find((t) => t.id === props.preparation.tool));
		const active = ref(false), pointer = ref({
			x: 0,
			y: 0
		}), feedback = ref(""), zoom = ref(false), photoReady = ref(false);
		ref();
		const uid = useId().replaceAll(":", "");
		const kind = computed(() => props.design?.kind ?? "manicure"), nails = computed(() => anatomyNails(kind.value)), current = computed(() => nails.value[nail.value]);
		const camera = computed(() => {
			if (!zoom.value) return {
				x: 0,
				y: 0,
				w: 1448,
				h: 1086
			};
			const n = current.value, w = Math.max(120, n.w * 2.8);
			return {
				x: n.x + n.w / 2 - w / 2,
				y: Math.max(0, n.y - n.h * .3),
				w,
				h: w * 470 / 360
			};
		});
		const viewBox = computed(() => `${camera.value.x} ${camera.value.y} ${camera.value.w} ${camera.value.h}`), unit = computed(() => camera.value.w / 360);
		const zonePath = computed(() => step.value?.zone === "cuticle" ? current.value.cuticle : step.value?.zone === "sides" ? current.value.sidewalls : step.value?.zone === "tip" ? current.value.freeEdge : current.value.path);
		const progressAt = (stepId, index) => props.preparation.progress[stepId]?.[index] ?? 0;
		watch(() => props.imageUrl, () => {
			photoReady.value = false;
		});
		return (_ctx, _push, _parent, _attrs) => {
			if (__props.mode === "board") {
				_push(`<div${ssrRenderAttrs(mergeProps({ class: ["at-preparation-board at-photo-preparation", { "is-overview": !zoom.value }] }, _attrs))} data-v-23369f69><div class="at-prep-board-title" data-v-23369f69><span data-v-23369f69>${ssrInterpolate(step.value?.name ?? "Подготовка завершена")}</span><b data-v-23369f69>${ssrInterpolate(progress.value)}%</b></div><div class="at-anatomy-toolbar" data-v-23369f69><span data-v-23369f69>${ssrInterpolate(unref(nailName)(kind.value, nail.value))} · ${ssrInterpolate(value.value)}%</span><button type="button"${ssrRenderAttr("aria-pressed", zoom.value)} data-v-23369f69>`);
				if (zoom.value) _push(ssrRenderComponent(unref(Scan), { size: 15 }, null, _parent));
				else _push(ssrRenderComponent(unref(ZoomIn), { size: 15 }, null, _parent));
				_push(`${ssrInterpolate(zoom.value ? kind.value === "pedicure" ? "Вся стопа" : "Вся рука" : "Приблизить ноготь")}</button></div><svg class="at-prep-canvas at-photo-canvas"${ssrRenderAttr("viewBox", viewBox.value)} style="${ssrRenderStyle({ aspectRatio: `${camera.value.w}/${camera.value.h}` })}" role="group"${ssrRenderAttr("aria-label", `Обработка ногтя ${nail.value + 1}: ${step.value?.name ?? "готово"}`)} data-v-23369f69><defs data-v-23369f69><linearGradient${ssrRenderAttr("id", `${unref(uid)}-gloss`)} data-v-23369f69><stop stop-color="#0002" data-v-23369f69></stop><stop offset=".28" stop-color="#fff5" data-v-23369f69></stop><stop offset=".5" stop-color="#fff0" data-v-23369f69></stop><stop offset="1" stop-color="#0002" data-v-23369f69></stop></linearGradient><!--[-->`);
				ssrRenderList(nails.value, (n, i) => {
					_push(`<clipPath${ssrRenderAttr("id", `${unref(uid)}-nail-${i}`)} data-v-23369f69><path${ssrRenderAttr("d", n.path)} data-v-23369f69></path></clipPath>`);
				});
				_push(`<!--]--></defs><image${ssrRenderAttr("href", __props.imageUrl)} width="1448" height="1086" data-v-23369f69></image><!--[-->`);
				ssrRenderList(nails.value, (n, i) => {
					_push(`<g data-v-23369f69><g${ssrRenderAttr("clip-path", `url(#${unref(uid)}-nail-${i})`)} data-v-23369f69>`);
					if (progressAt("remove", i) < 100) {
						_push(`<g${ssrRenderAttr("opacity", 1 - progressAt("remove", i) / 100)} style="${ssrRenderStyle({ "isolation": "isolate" })}" data-v-23369f69>`);
						_push(ssrRenderComponent(NailFinish_default, {
							nail: {
								color: "mauve",
								pattern: "plain",
								finish: "glossy"
							},
							geometry: n,
							"gloss-id": `${unref(uid)}-gloss`,
							photographic: ""
						}, null, _parent));
						_push(ssrRenderComponent(NailPhotoLighting_default, {
							"image-url": __props.imageUrl,
							geometry: n
						}, null, _parent));
						_push(`</g>`);
					} else _push(`<!---->`);
					_push(`<g${ssrRenderAttr("transform", unref(surfaceTransform)(n))} fill="none" stroke-linecap="round" data-v-23369f69>`);
					if (progressAt("buff", i) < 100) _push(`<path d="M32 24L34 73M49 21L51 79M66 27L68 68" stroke="#fff" stroke-width=".7"${ssrRenderAttr("opacity", .18 * (1 - progressAt("buff", i) / 100))} data-v-23369f69></path>`);
					else _push(`<!---->`);
					if (progressAt("base", i) > 0) _push(`<path d="M25 26Q20 43 25 66" stroke="#fff" stroke-width="3"${ssrRenderAttr("opacity", progressAt("base", i) / 250)} data-v-23369f69></path>`);
					else _push(`<!---->`);
					_push(`</g></g><path class="at-prep-nail-hit"${ssrRenderAttr("d", n.path)} fill="transparent" stroke="transparent"${ssrRenderAttr("stroke-width", n.w * .45)} data-v-23369f69></path>`);
					if (i === nail.value && step.value?.zone !== "plate") _push(`<path${ssrRenderAttr("d", n.path)} fill="none" stroke="#fff" stroke-width=".8" vector-effect="non-scaling-stroke" opacity=".45" pointer-events="none" data-v-23369f69></path>`);
					else _push(`<!---->`);
					_push(`</g>`);
				});
				_push(`<!--]-->`);
				if (step.value) _push(`<path class="at-prep-zone-hit"${ssrRenderAttr("d", zonePath.value)}${ssrRenderAttr("fill", step.value.zone === "plate" ? "transparent" : "none")} stroke="transparent"${ssrRenderAttr("stroke-width", current.value.w * .48)} data-v-23369f69></path>`);
				else _push(`<!---->`);
				if (step.value) _push(`<path class="at-prep-zone"${ssrRenderAttr("d", zonePath.value)} fill="none" stroke="#fff" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-dasharray="3 4" opacity=".75" pointer-events="none" data-v-23369f69></path>`);
				else _push(`<!---->`);
				if (active.value && toolReady.value) {
					_push(`<g${ssrRenderAttr("transform", `translate(${pointer.value.x - unit.value * 8} ${pointer.value.y - unit.value * 2}) rotate(-25)`)} pointer-events="none" data-v-23369f69><foreignObject${ssrRenderAttr("width", unit.value * 35)}${ssrRenderAttr("height", unit.value * 96)} data-v-23369f69>`);
					_push(ssrRenderComponent(StudioTool_default, {
						tool: __props.preparation.tool,
						active: ""
					}, null, _parent));
					_push(`</foreignObject></g>`);
				} else _push(`<!---->`);
				_push(`</svg><div class="at-prep-board-foot" data-v-23369f69>`);
				_push(ssrRenderComponent(unref(MousePointer2), { size: 16 }, null, _parent));
				_push(`<span data-v-23369f69>${ssrInterpolate(toolReady.value ? step.value?.hint ?? "Все ногти готовы к дизайну." : "Выберите инструмент, затем ведите им по подсвеченной области.")}</span></div><div class="at-mobile-tray" role="group" aria-label="Инструменты рядом с ногтем" data-v-23369f69><!--[-->`);
				ssrRenderList(unref(TOOLS).filter((t) => step.value?.tools.includes(t.id)), (tool) => {
					_push(`<button${ssrRenderAttr("aria-label", tool.name)}${ssrRenderAttr("aria-pressed", __props.preparation.tool === tool.id)} data-v-23369f69>`);
					_push(ssrRenderComponent(StudioTool_default, { tool: tool.id }, null, _parent));
					_push(`<span data-v-23369f69>${ssrInterpolate(tool.name)}</span></button>`);
				});
				_push(`<!--]--></div><button class="at-btn at-secondary at-keyboard-prep"${ssrIncludeBooleanAttr(!step.value || !toolReady.value || !photoReady.value) ? " disabled" : ""} data-v-23369f69>${ssrInterpolate(value.value === 100 ? "Ноготь обработан" : "Обработать ноготь · касание")} `);
				_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				_push(`</button>`);
				if (feedback.value) _push(`<p role="status" class="at-prep-feedback" data-v-23369f69>${ssrInterpolate(feedback.value)}</p>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else {
				_push(`<div${ssrRenderAttrs(mergeProps({ class: "at-preparation-controls" }, _attrs))} data-v-23369f69><fieldset class="at-techniques" data-v-23369f69><legend data-v-23369f69>Техника маникюра</legend><div data-v-23369f69><!--[-->`);
				ssrRenderList(unref(TECHNIQUES), (item) => {
					_push(`<button${ssrRenderAttr("aria-pressed", __props.preparation.technique === item.id)}${ssrIncludeBooleanAttr(progress.value > 0 && __props.preparation.technique !== item.id) ? " disabled" : ""} data-v-23369f69>${ssrInterpolate(item.name)}</button>`);
				});
				_push(`<!--]--></div></fieldset><h2 data-v-23369f69>${ssrInterpolate(step.value?.name ?? "Основа готова")}</h2><p data-v-23369f69>${ssrInterpolate(step.value?.hint ?? "Можно выбирать оттенки и создавать дизайн.")}</p>`);
				if (step.value) {
					_push(`<div class="at-tool-tray" role="group" aria-label="Инструменты для маникюра" data-v-23369f69><!--[-->`);
					ssrRenderList(unref(TOOLS), (tool) => {
						_push(`<button class="${ssrRenderClass({ recommended: step.value.tools.includes(tool.id) })}"${ssrRenderAttr("aria-pressed", __props.preparation.tool === tool.id)}${ssrRenderAttr("aria-label", tool.name)} data-v-23369f69>`);
						_push(ssrRenderComponent(StudioTool_default, { tool: tool.id }, null, _parent));
						_push(`<span data-v-23369f69>${ssrInterpolate(tool.name)}</span></button>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				if (step.value) _push(`<p class="at-prep-selected" data-v-23369f69>${ssrInterpolate(selectedTool.value.name)} · ${ssrInterpolate(toolReady.value ? "подходит для этапа" : "выберите подсвеченный инструмент")}</p>`);
				else _push(`<!---->`);
				_push(`<ol class="at-treatment-steps" data-v-23369f69><!--[-->`);
				ssrRenderList(steps.value, (item) => {
					_push(`<li class="${ssrRenderClass({
						active: item.id === step.value?.id,
						complete: __props.preparation.progress[item.id]?.every((p) => p === 100)
					})}" data-v-23369f69>`);
					if (__props.preparation.progress[item.id]?.every((p) => p === 100)) _push(ssrRenderComponent(unref(Check), { size: 15 }, null, _parent));
					else _push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent));
					_push(`<span data-v-23369f69>${ssrInterpolate(item.name)}</span><small data-v-23369f69>${ssrInterpolate((__props.preparation.progress[item.id] ?? []).filter((p) => p === 100).length)} / 5</small></li>`);
				});
				_push(`<!--]--></ol>`);
				if (__props.organizer && step.value) {
					_push(`<button class="at-btn at-secondary"${ssrIncludeBooleanAttr(!toolReady.value) ? " disabled" : ""} data-v-23369f69>`);
					_push(ssrRenderComponent(unref(CheckCheck), { size: 16 }, null, _parent));
					_push(` Органайзер · завершить текущий этап</button>`);
				} else _push(`<!---->`);
				_push(`</div>`);
			}
		};
	}
});
// components/sarkisian-studio/atelier/NailPreparation.vue
var _sfc_setup$4 = NailPreparation_vue_vue_type_script_setup_true_lang_default.setup;
NailPreparation_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/NailPreparation.vue");
	return _sfc_setup$4 ? _sfc_setup$4(props, ctx) : void 0;
};
var NailPreparation_default = /*#__PURE__*/ Object.assign(_plugin_vue_export_helper_default(NailPreparation_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-23369f69"]]), { __name: "NailPreparation" });
// components/sarkisian-studio/atelier/DesignPalette.vue?vue&type=script&setup=true&lang.ts
var DesignPalette_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "DesignPalette",
	__ssrInlineRender: true,
	props: {
		colors: {},
		color: {},
		pattern: {},
		accent: {},
		finish: {}
	},
	emits: [
		"color",
		"pattern",
		"accent",
		"finish",
		"all",
		"inspiration"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const family = ref("all"), search = ref(""), uid = useId().replaceAll(":", "");
		const visible = computed(() => props.colors.filter((c) => (family.value === "all" || c.family === family.value) && c.name.toLowerCase().includes(search.value.toLowerCase().trim())));
		const geo = {
			path: "M3 54V23Q3 2 22 2Q41 2 41 23V54Q41 65 22 65Q3 65 3 54Z",
			x: 3,
			y: 2,
			w: 38,
			h: 63
		};
		const inspirations = [
			{
				name: "Нюд и золото",
				colors: [
					"rose",
					"latte",
					"milk",
					"sand",
					"cocoa"
				],
				pattern: "gold",
				finish: "glossy",
				accent: "champagne"
			},
			{
				name: "Пастельный микс",
				colors: [
					"ballet",
					"lilac",
					"mint",
					"lemon",
					"periwinkle"
				],
				pattern: "plain",
				finish: "matte",
				accent: "porcelain"
			},
			{
				name: "Ночной хром",
				colors: [
					"midnight",
					"graphite",
					"plum",
					"black",
					"denim"
				],
				pattern: "stars",
				finish: "chrome",
				accent: "silver"
			},
			{
				name: "Летний сад",
				colors: [
					"coral",
					"peach",
					"ballet",
					"milk",
					"sage"
				],
				pattern: "flowers",
				finish: "glossy",
				accent: "porcelain"
			}
		];
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "at-design-palette" }, _attrs))}><h2>Ваш цвет. Ваш характер.</h2><p class="at-color-name">${ssrInterpolate(unref(COLORS).find((c) => c.id === __props.color)?.name)} · ${ssrInterpolate(__props.colors.length)} оттенков</p><div class="at-palette-search"><input${ssrRenderAttr("value", search.value)} type="search" placeholder="Найти оттенок" aria-label="Поиск цвета лака"><select aria-label="Коллекция лаков"><!--[-->`);
			ssrRenderList(unref(COLOR_FAMILIES), (item) => {
				_push(`<option${ssrRenderAttr("value", item.id)}${ssrIncludeBooleanAttr(Array.isArray(family.value) ? ssrLooseContain(family.value, item.id) : ssrLooseEqual(family.value, item.id)) ? " selected" : ""}>${ssrInterpolate(item.name)}</option>`);
			});
			_push(`<!--]--></select></div><div class="at-expanded-palette" role="group" aria-label="Оттенки лака"><!--[-->`);
			ssrRenderList(visible.value, (item) => {
				_push(`<button${ssrRenderAttr("title", item.name)} style="${ssrRenderStyle({ "--swatch": item.hex })}"${ssrRenderAttr("aria-label", item.name)}${ssrRenderAttr("aria-pressed", __props.color === item.id)}>`);
				if (__props.color === item.id) _push(ssrRenderComponent(unref(Check), { size: 18 }, null, _parent));
				else _push(`<!---->`);
				_push(`</button>`);
			});
			_push(`<!--]--></div>`);
			if (!visible.value.length) _push(`<p class="at-subtle">Такой оттенок не найден. Попробуйте другое название.</p>`);
			else _push(`<!---->`);
			_push(`<label class="at-accent-select"><span>Цвет рисунка и градиента</span><span><i style="${ssrRenderStyle({ background: unref(colorHex)(__props.accent) })}"></i><select${ssrRenderAttr("value", __props.accent)}><!--[-->`);
			ssrRenderList(unref(COLORS), (item) => {
				_push(`<option${ssrRenderAttr("value", item.id)}>${ssrInterpolate(item.name)}</option>`);
			});
			_push(`<!--]--></select></span></label><fieldset class="at-finish-options"><legend>Эффект покрытия</legend><div><!--[-->`);
			ssrRenderList(unref(FINISHES), (item) => {
				_push(`<button${ssrRenderAttr("aria-pressed", __props.finish === item.id)}>${ssrInterpolate(item.name)}</button>`);
			});
			_push(`<!--]--></div></fieldset><div class="at-pattern-grid" role="group" aria-label="Рисунок на ногте"><!--[-->`);
			ssrRenderList(unref(PATTERNS), (item) => {
				_push(`<button${ssrRenderAttr("aria-label", item.name)}${ssrRenderAttr("aria-pressed", __props.pattern === item.id)}><svg viewBox="0 0 44 68" aria-hidden="true"><defs><clipPath${ssrRenderAttr("id", `${unref(uid)}-${item.id}`)}><path${ssrRenderAttr("d", geo.path)}></path></clipPath><linearGradient${ssrRenderAttr("id", `${unref(uid)}-gloss`)}><stop stop-color="#0002"></stop><stop offset=".3" stop-color="#fff7"></stop><stop offset=".6" stop-color="#fff0"></stop><stop offset="1" stop-color="#0002"></stop></linearGradient></defs><g${ssrRenderAttr("clip-path", `url(#${unref(uid)}-${item.id})`)}>`);
				_push(ssrRenderComponent(NailFinish_default, {
					nail: {
						color: __props.color,
						pattern: item.id,
						accentColor: __props.accent,
						finish: __props.finish
					},
					geometry: geo,
					"gloss-id": `${unref(uid)}-gloss`
				}, null, _parent));
				_push(`</g></svg><span>${ssrInterpolate(item.name)}</span></button>`);
			});
			_push(`<!--]--></div><button class="at-btn at-secondary">`);
			_push(ssrRenderComponent(unref(CheckCheck), { size: 16 }, null, _parent));
			_push(` Нанести на все пять ногтей</button><details class="at-inspirations"><summary>Готовые сочетания и идеи</summary><p>Каждый ноготь можно изменить после нанесения.</p><!--[-->`);
			ssrRenderList(inspirations, (item) => {
				_push(`<button><span>${ssrInterpolate(item.name)}</span><span><!--[-->`);
				ssrRenderList(item.colors, (c) => {
					_push(`<i style="${ssrRenderStyle({ background: unref(colorHex)(c) })}"></i>`);
				});
				_push(`<!--]--></span></button>`);
			});
			_push(`<!--]--><button><span>Случайный дизайн</span>`);
			_push(ssrRenderComponent(unref(Shuffle), { size: 17 }, null, _parent));
			_push(`</button></details></div>`);
		};
	}
});
// components/sarkisian-studio/atelier/DesignPalette.vue
var _sfc_setup$3 = DesignPalette_vue_vue_type_script_setup_true_lang_default.setup;
DesignPalette_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/DesignPalette.vue");
	return _sfc_setup$3 ? _sfc_setup$3(props, ctx) : void 0;
};
var DesignPalette_default = Object.assign(DesignPalette_vue_vue_type_script_setup_true_lang_default, { __name: "DesignPalette" });
// components/sarkisian-studio/atelier/RewardShop.vue?vue&type=script&setup=true&lang.ts
var RewardShop_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "RewardShop",
	__ssrInlineRender: true,
	setup(__props) {
		const { user, wallet, offers, settings, loading, error } = useStudioRewards();
		useStorefrontPanels();
		const busy = ref(""), message = ref(""), copied = ref("");
		const pending = ref(null);
		const statusName = {
			available: "Готов к покупке на сайте",
			used: "Использован",
			expired: "Срок истёк",
			reserved: "Применён к заказу",
			disabled: "Отключён"
		};
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<section${ssrRenderAttrs(mergeProps({ class: "at-reward-shop" }, _attrs))}><div class="at-reward-intro">`);
			_push(ssrRenderComponent(unref(Gift), { size: 32 }, null, _parent));
			_push(`<h2>Играйте. Копите.<br>Покупайте выгоднее.</h2><p>Завершайте приёмы и обменивайте заработанные монеты на скидки в SARKISIAN. У каждой награды — своя цель.</p></div>`);
			if (!unref(user)) {
				_push(`<div class="at-reward-login"><p>Войдите в аккаунт сайта, чтобы копить монеты для скидок. Гостевой прогресс остаётся для практики; в магазин наград он не переносится.</p><button class="at-btn at-primary">Войти и начать копить `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
				_push(`</button></div>`);
			} else {
				_push(`<div class="at-reward-wallet"><span>Ваш баланс наград</span><b>`);
				_push(ssrRenderComponent(unref(Coins), { size: 24 }, null, _parent));
				_push(`${ssrInterpolate(unref(wallet)?.balance.toLocaleString("ru-RU") ?? "…")}</b><span>За приёмы: ${ssrInterpolate(unref(wallet)?.earned.toLocaleString("ru-RU") ?? "—")} монет</span></div>`);
			}
			_push(`<p class="at-reward-rules">Промокод действует для одного заказа в вашем аккаунте. Срок начинается после обмена. Монеты нельзя вывести деньгами. За день учитывается до ${ssrInterpolate(unref(settings).dailyRunLimit)} приёмов; один приём длится от ${ssrInterpolate(unref(settings).minimumRunSeconds)} секунд. Практика, уроки и бонусы смены не начисляют монеты для скидок.</p>`);
			if (!unref(settings).enabled) _push(`<p role="status">Магазин наград временно на паузе. Ваш баланс сохранён.</p>`);
			else _push(`<!---->`);
			if (unref(error)) {
				_push(`<p role="alert">${ssrInterpolate(unref(error))} <button class="at-text-button">`);
				_push(ssrRenderComponent(unref(RefreshCw), { size: 14 }, null, _parent));
				_push(` Повторить</button></p>`);
			} else _push(`<!---->`);
			if (unref(message)) _push(`<p role="status">${ssrInterpolate(unref(message))}</p>`);
			else _push(`<!---->`);
			_push(`<div class="at-reward-offers"${ssrRenderAttr("aria-busy", unref(loading))}><!--[-->`);
			ssrRenderList(unref(offers), (offer) => {
				_push(`<article><span class="at-reward-percent">−${ssrInterpolate(offer.discountPercent)}%</span><h3>На покупки SARKISIAN</h3><p>${ssrInterpolate(offer.validDays)} дней · одно использование</p>`);
				if (offer.minimumAmount) _push(`<p>Для заказа от ${ssrInterpolate(offer.minimumAmount.toLocaleString("ru-RU"))} ₽</p>`);
				else _push(`<!---->`);
				if (offer.maximumDiscount) _push(`<p>Скидка до ${ssrInterpolate(offer.maximumDiscount.toLocaleString("ru-RU"))} ₽</p>`);
				else _push(`<!---->`);
				_push(`<b>`);
				_push(ssrRenderComponent(unref(Coins), { size: 17 }, null, _parent));
				_push(`${ssrInterpolate(offer.coinPrice.toLocaleString("ru-RU"))}</b><progress${ssrRenderAttr("value", Math.min(unref(wallet)?.balance ?? 0, offer.coinPrice))}${ssrRenderAttr("max", offer.coinPrice)}${ssrRenderAttr("aria-label", `Накоплено на скидку ${offer.discountPercent}%`)}></progress>`);
				if (unref(user) && (unref(wallet)?.balance ?? 0) < offer.coinPrice) _push(`<small>Осталось ${ssrInterpolate((offer.coinPrice - (unref(wallet)?.balance ?? 0)).toLocaleString("ru-RU"))} монет</small>`);
				else _push(`<!---->`);
				if (unref(pending) === offer.id) _push(`<!--[--><p>Обменять ${ssrInterpolate(offer.coinPrice.toLocaleString("ru-RU"))} монет на скидку ${ssrInterpolate(offer.discountPercent)}%?</p><button class="at-btn at-primary"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>${ssrInterpolate(unref(busy) ? "Создаём код…" : "Подтвердить обмен")}</button><button class="at-text-button"${ssrIncludeBooleanAttr(!!unref(busy)) ? " disabled" : ""}>Отмена</button><!--]-->`);
				else {
					_push(`<button class="at-btn at-secondary"${ssrIncludeBooleanAttr(!unref(user) || !unref(wallet) || unref(wallet).balance < offer.coinPrice || !unref(settings).enabled || !!unref(busy)) ? " disabled" : ""}>${ssrInterpolate(!unref(user) ? "Войдите для обмена" : (unref(wallet)?.balance ?? 0) < offer.coinPrice ? "Копим на награду" : "Получить промокод")} `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 15 }, null, _parent));
					_push(`</button>`);
				}
				_push(`</article>`);
			});
			_push(`<!--]--></div>`);
			if (unref(user)) {
				_push(`<div class="at-owned-rewards"><h2>Ваши промокоды</h2>`);
				if (!unref(wallet)?.purchases.length) _push(`<p>Здесь появится первая награда. Продолжайте принимать клиентов — каждая работа приближает к цели.</p>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(unref(wallet)?.purchases, (p) => {
					_push(`<article><div><b>Скидка ${ssrInterpolate(p.discountPercent)}%</b><span>${ssrInterpolate(statusName[p.status])} · до ${ssrInterpolate(new Date(p.expiresAt).toLocaleDateString("ru-RU"))}</span><code>${ssrInterpolate(p.code)}</code>`);
					if (p.minimumAmount) _push(`<small>От ${ssrInterpolate(p.minimumAmount)} ₽</small>`);
					else _push(`<!---->`);
					if (p.maximumDiscount) _push(`<small>Максимум ${ssrInterpolate(p.maximumDiscount)} ₽</small>`);
					else _push(`<!---->`);
					_push(`</div>`);
					if (p.status === "available") {
						_push(`<button class="at-btn at-secondary">`);
						if (unref(copied) === p.code) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
						else _push(ssrRenderComponent(unref(Copy), { size: 16 }, null, _parent));
						_push(`${ssrInterpolate(unref(copied) === p.code ? "Скопирован" : "Копировать")}</button>`);
					} else _push(`<!---->`);
					_push(`</article>`);
				});
				_push(`<!--]--></div>`);
			} else _push(`<!---->`);
			_push(`</section>`);
		};
	}
});
// components/sarkisian-studio/atelier/RewardShop.vue
var _sfc_setup$2 = RewardShop_vue_vue_type_script_setup_true_lang_default.setup;
RewardShop_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/atelier/RewardShop.vue");
	return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
var RewardShop_default = Object.assign(RewardShop_vue_vue_type_script_setup_true_lang_default, { __name: "RewardShop" });
// components/sarkisian-studio/SarkisianStudio.vue?vue&type=script&setup=true&lang.ts
var SarkisianStudio_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "SarkisianStudio",
	__ssrInlineRender: true,
	props: {
		assetBase: { default: "/studio-assets/" },
		siteBase: { default: "https://it-sarkisian.ru" },
		storage: {},
		showHeader: {
			type: Boolean,
			default: true
		}
	},
	emits: [
		"design-saved",
		"quest-completed",
		"order-completed"
	],
	setup(__props, { emit: __emit }) {
		const props = __props;
		const root = computed(() => props.assetBase.replace(/\/?$/, "/"));
		const asset = (file) => root.value + file;
		const state = ref(freshState()), loaded = ref(false), saveCount = ref(0), saveError = ref(""), notice = ref("");
		const rewards = useStudioRewards();
		const { user: rewardUser, wallet: rewardWallet } = rewards;
		const view = ref("studio");
		const modal = ref(null), dialog = ref();
		const shelfMessage = ref("");
		const selectedOffer = ref(0), chosenColor = ref("rose"), chosenPattern = ref("plain"), selectedNail = ref(-1);
		const chosenAccent = ref("porcelain"), chosenFinish = ref("glossy");
		const stroke = ref({
			id: 0,
			indices: []
		}), history = ref([]);
		const result = ref(null), savedPractice = ref(null), questReward = ref(null), viewedDesign = ref(null), settingsName = ref(""), playing = ref(false);
		ref(false);
		const busy = ref(false), galleryFilter = ref("all");
		let adapter, queue = Promise.resolve();
		let noticeTimer;
		const work = computed(() => state.value.work);
		const selectedSupply = computed(() => supplyById(work.value?.supply));
		const supplyMatches = computed(() => !!work.value && !!selectedSupply.value && supplyFits(selectedSupply.value.id, work.value.design));
		const canChooseSupply = computed(() => !!work.value && work.value.serial !== null && work.value.stage !== "finish");
		const stockTotal = computed(() => Object.values(state.value.supplies.stock).reduce((sum, quantity) => sum + quantity, 0));
		const brief = computed(() => activeBrief(state.value));
		const offers = computed(() => availableOrders(state.value));
		const guest = computed(() => brief.value ?? offers.value[Math.min(selectedOffer.value, offers.value.length - 1)]);
		const quest = computed(() => QUESTS.find((q) => q.id === state.value.activeQuest) ?? nextQuest(state.value));
		const coins = computed(() => rewardUser.value ? rewardWallet.value?.balance ?? 0 : coinBalance(state.value)), level = computed(() => studioLevel(state.value));
		const day = computed(() => state.value.career.shift.number);
		const shiftFull = computed(() => state.value.career.shift.visits.length === 3);
		const clientBook = computed(() => ORDERS.filter((o) => state.value.career.clients[o.id]).map((order) => ({
			order,
			...state.value.career.clients[order.id]
		})).sort((a, b) => b.lastVisit - a.lastVisit));
		const fitDescription = (order) => [NAIL_SHAPES.find((s) => s.id === order.shape)?.name, order.length ? `${NAIL_LENGTHS.find((l) => l.id === order.length)?.name.toLowerCase()} длина` : null].filter(Boolean).join(" · ");
		const rating = computed(() => state.value.career.served ? (state.value.career.stars / state.value.career.served).toFixed(1) : "—");
		const colors = computed(() => work.value?.serial === null ? COLORS : availableColors(state.value));
		const ready = computed(() => !!work.value && isComplete(work.value.design));
		const count = computed(() => work.value?.stage === "prepare" ? work.value.prepared.length : work.value?.design.nails.filter((n) => n.color).length ?? 0);
		const hasUpgrade = (id) => state.value.career.upgrades.includes(id);
		const filteredDesigns = computed(() => state.value.designs.filter((d) => galleryFilter.value === "all" || d.kind === galleryFilter.value));
		const steps = [
			{
				id: "prepare",
				label: "Подготовка"
			},
			{
				id: "design",
				label: "Дизайн"
			},
			{
				id: "finish",
				label: "Финиш"
			}
		];
		const tabs = [
			{
				id: "studio",
				label: "Студия",
				icon: House
			},
			{
				id: "desk",
				label: "Практика",
				icon: Paintbrush
			},
			{
				id: "style",
				label: "Мой образ",
				icon: Shirt
			},
			{
				id: "portfolio",
				label: "Портфолио",
				icon: Images
			},
			{
				id: "shop",
				label: "Развитие",
				icon: ShoppingBag
			},
			{
				id: "rewards",
				label: "Награды",
				icon: Gift
			}
		];
		const pageTitle = computed(() => ({
			studio: state.value.playerName,
			desk: work.value?.serial ? `Приём · ${brief.value?.customer ?? ""}` : "Творческая практика",
			style: "Ваша новая глава",
			portfolio: "Работы, которыми гордишься",
			shop: "Студия становится твоей",
			rewards: "Ваши реальные награды"
		})[view.value]);
		let checkpointQueue = Promise.resolve();
		const syncedSteps = /* @__PURE__ */ new Set();
		let syncedRun = "";
		async function syncSteps(w) {
			if (!w.rewardRunId || w.rewardUserId !== rewardUser.value?.id) return;
			if (syncedRun !== w.rewardRunId) {
				syncedRun = w.rewardRunId;
				syncedSteps.clear();
			}
			for (const step of preparationSteps(w.preparation.technique)) {
				if (!w.preparation.progress[step.id]?.every((p) => p === 100)) break;
				if (syncedSteps.has(step.id)) continue;
				await new Promise((resolve) => setTimeout(resolve, 550));
				await rewards.checkpoint(w.rewardRunId, w.preparation.technique, step.id);
				syncedSteps.add(step.id);
			}
		}
		function resumeRewardRun() {
			const active = rewardWallet.value?.activeRun;
			if (!loaded.value || !active || !rewardUser.value) return;
			const order = ORDERS.find((o) => o.id === active.briefId);
			if (!order) return;
			if (work.value?.rewardRunId === active.id) {
				syncedRun = active.id;
				syncedSteps.clear();
				active.checkpoints.forEach((s) => syncedSteps.add(s));
				return;
			}
			if (work.value?.serial === null && prepProgress(work.value.preparation) > 0) return;
			state.value.career.active = {
				serial: state.value.career.served + 1,
				briefId: order.id,
				fitted: true
			};
			const w = newWork(order.kind, state.value.career.active.serial);
			w.rewardRunId = active.id;
			w.rewardUserId = rewardUser.value.id;
			w.preparation = freshPreparation(active.technique);
			active.checkpoints.forEach((s) => w.preparation.progress[s] = [
				100,
				100,
				100,
				100,
				100
			]);
			w.prepared = preparedNails(w.preparation);
			state.value.work = w;
		}
		watch(rewardWallet, () => {
			if (rewardWallet.value) {
				state.value.career.upgrades = rewardWallet.value.upgrades.filter((id) => UPGRADES.some((u) => u.id === id));
				resumeRewardRun();
			}
		}, { deep: false });
		const plain = (value) => JSON.parse(JSON.stringify(value));
		function notify(text) {
			notice.value = text;
			clearTimeout(noticeTimer);
			noticeTimer = setTimeout(() => notice.value = "", 4500);
		}
		function persist() {
			if (!loaded.value) return queue;
			const snapshot = plain(state.value);
			saveCount.value++;
			queue = queue.then(async () => {
				try {
					await adapter.save(snapshot);
					saveError.value = "";
				} catch {
					saveError.value = "Не удалось сохранить прогресс. Игра продолжается, но до перезагрузки повторите сохранение.";
				} finally {
					saveCount.value--;
				}
			});
			return queue;
		}
		watch(state, () => {
			persist();
		}, {
			deep: true,
			flush: "sync"
		});
		function paint(index) {
			if (!work.value || work.value.stage === "finish") return;
			selectedNail.value = index;
			if (work.value.stage === "prepare") return;
			else {
				history.value.push(plain(work.value.design));
				history.value = history.value.slice(-30);
				work.value.design.nails[index] = {
					color: chosenColor.value,
					pattern: chosenPattern.value,
					accentColor: chosenAccent.value,
					finish: chosenFinish.value
				};
			}
			stroke.value = {
				id: stroke.value.id + 1,
				indices: [index]
			};
		}
		function paintAll() {
			if (!work.value) return;
			if (work.value.stage === "design") {
				history.value.push(plain(work.value.design));
				history.value = history.value.slice(-30);
				work.value.design.nails = Array.from({ length: 5 }, () => ({
					color: chosenColor.value,
					pattern: chosenPattern.value,
					accentColor: chosenAccent.value,
					finish: chosenFinish.value
				}));
			}
			stroke.value = {
				id: stroke.value.id + 1,
				indices: [
					0,
					1,
					2,
					3,
					4
				]
			};
		}
		function setPreparation(preparation) {
			if (!work.value || work.value.stage !== "prepare") return;
			work.value.preparation = preparation;
			work.value.prepared = preparedNails(preparation);
			const w = plain(work.value);
			if (w.rewardRunId && preparationSteps(preparation.technique).some((s) => preparation.progress[s.id]?.every((p) => p === 100) && !syncedSteps.has(s.id))) checkpointQueue = checkpointQueue.catch(() => {}).then(() => syncSteps(w)).catch((e) => {
				notify(e?.data?.message || "Этап пока не отправлен. При завершении повторим сохранение.");
			});
		}
		function applyInspiration(nails) {
			if (!work.value || work.value.stage !== "design") return;
			history.value.push(plain(work.value.design));
			work.value.design.nails = plain(nails);
			stroke.value = {
				id: stroke.value.id + 1,
				indices: [
					0,
					1,
					2,
					3,
					4
				]
			};
		}
		function setFit(patch) {
			if (!work.value || work.value.stage === "finish") return;
			if (work.value.stage === "design") history.value.push(plain(work.value.design));
			work.value.design = {
				...work.value.design,
				...patch
			};
			stroke.value = {
				id: stroke.value.id + 1,
				indices: []
			};
		}
		async function saveLook(look) {
			state.value.keriLook = { ...look };
			await queue;
			if (saveError.value) throw new Error(saveError.value);
			if (!props.storage) try {
				localStorage.setItem(KERI_STORAGE_KEY, JSON.stringify(look));
			} catch {}
			view.value = "studio";
			notify("Ваш новый образ сохранён.");
		}
		function customerLook(order) {
			const i = ORDERS.findIndex((o) => o.id === order.id);
			const variants = [
				{
					hair: 1,
					hairColor: 4,
					top: 1,
					topColor: 2,
					skin: 1
				},
				{
					hair: 3,
					hairColor: 7,
					top: 2,
					topColor: 3,
					skin: 3
				},
				{
					hair: 5,
					hairColor: 2,
					top: 4,
					topColor: 6,
					skin: 1
				},
				{
					hair: 4,
					hairColor: 6,
					top: 3,
					topColor: 2,
					skin: 3
				},
				{
					hair: 2,
					hairColor: 7,
					top: 1,
					topColor: 3,
					skin: 2
				},
				{
					hair: 3,
					hairColor: 9,
					top: 4,
					topColor: 2,
					skin: 1
				},
				{
					hair: 4,
					hairColor: 11,
					top: 5,
					topColor: 4,
					skin: 2
				},
				{
					hair: 3,
					hairColor: 4,
					top: 2,
					topColor: 2,
					skin: 1
				},
				{
					hair: 5,
					hairColor: 7,
					top: 5,
					topColor: 3,
					skin: 1
				},
				{
					hair: 1,
					hairColor: 2,
					top: 1,
					topColor: 6,
					skin: 2
				}
			];
			return {
				...DEFAULT_KERI_LOOK,
				...variants[Math.max(0, i) % variants.length],
				...i >= 10 ? {
					hair: 1 + i % 8,
					top: 1 + i % 8,
					bottom: 1 + i % 5
				} : {},
				lipstick: 1 + i % 7,
				blush: 1 + i % 5,
				eyeshadow: 1 + i % 7,
				eyeliner: 1 + i % 3,
				earrings: 1 + i % 4,
				necklace: 1 + i % 4,
				glasses: i % 5 === 0 ? 2 : 1,
				hairAccessory: 1 + i % 4
			};
		}
		function closeModal() {
			modal.value = null;
		}
		function openShelf() {
			shelfMessage.value = "";
			modal.value = "materials";
		}
		async function restock(id) {
			if (busy.value) return;
			busy.value = true;
			try {
				const next = buySupply(plain(state.value), id, coins.value);
				if (rewardUser.value) await rewards.spend(id, crypto.randomUUID());
				state.value = next;
				shelfMessage.value = `${supplyById(id).name}: запас пополнен на 5 приёмов.`;
				await queue;
			} catch (error) {
				shelfMessage.value = error?.data?.message || error.message;
			} finally {
				busy.value = false;
			}
		}
		function selectSupply(id) {
			try {
				state.value = chooseSupply(plain(state.value), id);
				closeModal();
			} catch (error) {
				shelfMessage.value = error.message;
			}
		}
		watch(modal, async (value) => {
			await nextTick();
			if (value && !dialog.value?.open) dialog.value?.showModal();
			else if (!value) dialog.value?.close();
		});
		watch(() => state.value.volume, (v) => {});
		watch(() => state.value.track, () => {});
		return (_ctx, _push, _parent, _attrs) => {
			_push(`<div${ssrRenderAttrs(mergeProps({ class: "sb-game atelier" }, _attrs))}>`);
			if (__props.showHeader) {
				_push(`<header class="at-header"><button class="at-brand" aria-label="В мою студию"><img${ssrRenderAttr("src", asset("logo.png"))} alt="SARKISIAN — от мастера мастерам"><span>STUDIO</span></button><span class="at-header-caption">Маленькая студия. Большая мечта.</span><div class="at-header-tools"><span class="${ssrRenderClass([{ error: saveError.value }, "at-autosave"])}"><i></i>${ssrInterpolate(saveError.value ? "Не сохранено" : saveCount.value ? "Сохраняем…" : "Всё сохранено")}</span><button class="at-icon"${ssrRenderAttr("aria-label", playing.value ? "Выключить музыку" : "Включить музыку")}${ssrRenderAttr("aria-pressed", playing.value)}>`);
				if (playing.value) _push(ssrRenderComponent(unref(Volume2), { size: 19 }, null, _parent));
				else _push(ssrRenderComponent(unref(VolumeX), { size: 19 }, null, _parent));
				_push(`</button><button class="at-icon" aria-label="Настройки студии">`);
				_push(ssrRenderComponent(unref(Settings2), { size: 19 }, null, _parent));
				_push(`</button></div></header>`);
			} else _push(`<!---->`);
			_push(`<div class="at-layout"><nav class="at-nav" aria-label="Разделы игры"><!--[-->`);
			ssrRenderList(tabs, (tab) => {
				_push(`<button class="${ssrRenderClass({ active: view.value === tab.id })}"${ssrRenderAttr("aria-current", view.value === tab.id ? "page" : void 0)}>`);
				ssrRenderVNode(_push, createVNode(resolveDynamicComponent(tab.icon), {
					size: 21,
					"stroke-width": 1.6
				}, null), _parent);
				_push(`<span>${ssrInterpolate(tab.id === "desk" && state.value.career.active ? "Приём" : tab.label)}</span>`);
				if (tab.id === "desk" && work.value) _push(`<i></i>`);
				else _push(`<!---->`);
				_push(`</button>`);
			});
			_push(`<!--]--><button class="at-nav-help">`);
			_push(ssrRenderComponent(unref(CircleHelp), { size: 21 }, null, _parent));
			_push(`<span>Как играть</span></button></nav><main class="${ssrRenderClass([{ "is-service": view.value === "desk" }, "at-main"])}"${ssrRenderAttr("aria-busy", !loaded.value)}><div class="at-page-heading"><div><span class="at-eyebrow">${ssrInterpolate(view.value === "studio" ? `ДЕНЬ ${String(day.value).padStart(2, "0")} · ВЫ — МАСТЕР И ВЛАДЕЛИЦА` : view.value === "desk" ? "ТВОИ РУКИ СОЗДАЮТ КРАСОТУ" : "SARKISIAN · ТВОРЧЕСТВО КАЖДЫЙ ДЕНЬ")}</span><h1>${ssrInterpolate(pageTitle.value)}</h1></div><div class="at-stats"><span class="at-level">`);
			_push(ssrRenderComponent(unref(Sparkles), { size: 15 }, null, _parent));
			_push(` Уровень ${ssrInterpolate(level.value)}</span><span class="at-coins" data-testid="balance">`);
			_push(ssrRenderComponent(unref(Coins), { size: 18 }, null, _parent));
			_push(`${ssrInterpolate(coins.value.toLocaleString("ru-RU"))}</span></div></div>`);
			if (saveError.value) _push(`<div class="at-alert" role="alert">${ssrInterpolate(saveError.value)}<button>Повторить сохранение</button></div>`);
			else _push(`<!---->`);
			if (notice.value) {
				_push(`<div class="at-notice" role="status">`);
				_push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
				_push(`${ssrInterpolate(notice.value)}</div>`);
			} else _push(`<!---->`);
			if (view.value === "studio") {
				_push(`<section class="at-dashboard"><div class="at-studio-column"><div class="at-scene-card"><div class="at-scene-topline"><span><i class="at-live"></i> ${ssrInterpolate(shiftFull.value ? "Смена завершена" : "Студия открыта")}</span><span>`);
				_push(ssrRenderComponent(unref(Sun), { size: 14 }, null, _parent));
				_push(` Тёплый день для новых идей</span></div>`);
				_push(ssrRenderComponent(StudioScene_default, {
					"asset-base": root.value,
					look: customerLook(guest.value),
					name: guest.value.customer,
					upgraded: hasUpgrade("pastel"),
					empty: shiftFull.value,
					onShelf: openShelf
				}, null, _parent));
				_push(`<div class="at-scene-caption"><div><span class="at-eyebrow">ВАШЕ РАБОЧЕЕ МЕСТО</span><strong>${ssrInterpolate(shiftFull.value ? "Хорошая работа. Время подвести итоги." : brief.value ? `${brief.value.customer} ждёт продолжения` : `${guest.value.customer} · знакомимся перед приёмом`)}</strong></div><button class="at-text-button">${ssrInterpolate(shiftFull.value ? "Итоги смены" : brief.value ? "Продолжить" : "Начать приём")} `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 18 }, null, _parent));
				_push(`</button></div><button class="at-shelf-strip"><span>`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 15 }, null, _parent));
				_push(` Полка SARKISIAN</span><span><small>Запас: ${ssrInterpolate(stockTotal.value)} приёмов</small>`);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 14 }, null, _parent));
				_push(`</span></button></div><div class="at-under-scene"><button class="at-master-card"><span class="at-master-avatar">`);
				_push(ssrRenderComponent(KeriPortrait_default, {
					look: state.value.keriLook,
					"asset-base": root.value,
					label: "Вы — мастер"
				}, null, _parent));
				_push(`</span><div><span class="at-eyebrow">ЭТО ВЫ</span><strong>Мастер своей студии</strong><span>Собрать новый образ `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 12 }, null, _parent));
				_push(`</span></div></button><div class="at-career-card"><span>`);
				_push(ssrRenderComponent(unref(Star), { size: 17 }, null, _parent));
				_push(` <b>${ssrInterpolate(rating.value)}</b><small>оценка работ</small></span><span>`);
				_push(ssrRenderComponent(unref(CheckCheck), { size: 18 }, null, _parent));
				_push(`<b>${ssrInterpolate(state.value.career.served)}</b><small>приёмов завершено</small></span></div></div><button class="at-reputation-card"><div><span class="at-eyebrow">ВАША РЕПУТАЦИЯ</span><b>${ssrInterpolate(unref(reputationTitle)(state.value.career.reputation))}</b><span>${ssrInterpolate(clientBook.value.length)} знакомых гостей · открыть книгу клиентов `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 13 }, null, _parent));
				_push(`</span></div><div class="at-reputation-meter"><strong>${ssrInterpolate(state.value.career.reputation)}<small>/100</small></strong><i><b style="${ssrRenderStyle({ width: state.value.career.reputation + "%" })}"></b></i></div></button><button class="at-mentor"><img${ssrRenderAttr("src", asset("svetlana.png"))} alt="Светлана Саркисян"><div><span class="at-eyebrow">СВЕТЛАНА САРКИСЯН · ВАШ НАСТАВНИК</span><h2>${ssrInterpolate(quest.value?.title ?? "Всё начинается с любви к делу")}</h2><p>${ssrInterpolate(quest.value ? "Практикуйтесь, находите свой стиль и растите вместе со мной." : "Все уроки пройдены. Продолжайте собирать своё портфолио.")}</p></div>`);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 22 }, null, _parent));
				_push(`</button></div><aside class="at-agenda"><div class="at-agenda-title"><div><span class="at-eyebrow">ПЛАН НА СЕГОДНЯ</span><h2>Ваша запись</h2></div><span class="at-day-badge">`);
				_push(ssrRenderComponent(unref(Clock3), { size: 15 }, null, _parent));
				_push(`${ssrInterpolate(shiftFull.value ? "Завершена" : brief.value ? "В работе" : `${3 - state.value.career.shift.visits.length} приёма`)}</span></div>`);
				if (shiftFull.value) {
					_push(`<div class="at-shift-ready">`);
					_push(ssrRenderComponent(unref(Sparkles), { size: 30 }, null, _parent));
					_push(`<h3>Смена завершена</h3><p>Три приёма позади. Заберите награду за цели и откройте новую запись.</p><button class="at-btn at-primary">Подвести итоги `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button></div>`);
				} else if (brief.value) {
					_push(`<div class="at-active-booking">`);
					_push(ssrRenderComponent(KeriPortrait_default, {
						look: customerLook(brief.value),
						"asset-base": root.value
					}, null, _parent));
					_push(`<h3>${ssrInterpolate(brief.value.customer)}</h3><p>«${ssrInterpolate(brief.value.wish)}»</p><p class="at-fit-request">${ssrInterpolate(fitDescription(brief.value))}</p><button class="at-btn at-primary">Вернуться к работе `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button><small>Каждый этап сохраняется автоматически.</small></div>`);
				} else {
					_push(`<!--[--><div class="at-bookings" role="group" aria-label="Выбрать запись"><!--[-->`);
					ssrRenderList(offers.value, (order, i) => {
						_push(`<button class="${ssrRenderClass([{ selected: selectedOffer.value === i }, "at-booking"])}"${ssrRenderAttr("aria-pressed", selectedOffer.value === i)}><span class="at-guest-avatar">`);
						_push(ssrRenderComponent(KeriPortrait_default, {
							look: customerLook(order),
							"asset-base": root.value,
							label: order.customer
						}, null, _parent));
						_push(`</span><span class="at-booking-info"><b>${ssrInterpolate(order.customer)}</b><small>${ssrInterpolate(order.kind === "manicure" ? "Маникюр" : "Педикюр")} · ${ssrInterpolate(state.value.career.clients[order.id] ? "Снова к вам" : order.reputation ? "Особый заказ" : "Первый визит")}</small></span>`);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 15 }, null, _parent));
						_push(`</button>`);
					});
					_push(`<!--]--></div><div class="at-brief"><span class="at-eyebrow">${ssrInterpolate(guest.value.title)}</span><h3>«${ssrInterpolate(guest.value.wish)}»</h3><div class="at-order-tags"><span><i style="${ssrRenderStyle({ background: unref(colorHex)(guest.value.color) })}"></i>${ssrInterpolate(unref(COLORS).find((c) => c.id === guest.value.color)?.name)}</span><span>${ssrInterpolate(unref(PATTERNS).find((p) => p.id === guest.value.pattern)?.name)}</span></div>`);
					if (guest.value.shape) _push(`<p class="at-fit-request">${ssrInterpolate(fitDescription(guest.value))}</p>`);
					else _push(`<!---->`);
					if (state.value.career.clients[guest.value.id]) {
						_push(`<p class="at-regular-note">`);
						_push(ssrRenderComponent(unref(Star), { size: 12 }, null, _parent));
						_push(` Доверие ${ssrInterpolate(state.value.career.clients[guest.value.id].trust)}/5 · визит № ${ssrInterpolate(state.value.career.clients[guest.value.id].visits + 1)}</p>`);
					} else _push(`<!---->`);
					_push(`<div class="at-order-pay"><span>За выполненный заказ</span><b>`);
					_push(ssrRenderComponent(unref(Coins), { size: 16 }, null, _parent));
					_push(` до ${ssrInterpolate(guest.value.reward + 30 + unref(loyaltyTip)(state.value.career, guest.value.id, 5))}</b></div><button class="at-btn at-primary"${ssrIncludeBooleanAttr(busy.value || !loaded.value) ? " disabled" : ""} data-testid="start-order">Принять ${ssrInterpolate(guest.value.customer === "Анна" ? "Анну" : "гостя")} `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 18 }, null, _parent));
					_push(`</button></div><!--]-->`);
				}
				_push(ssrRenderComponent(ShiftGoals_default, {
					shift: state.value.career.shift,
					compact: "",
					onOpen: ($event) => modal.value = "shift"
				}, null, _parent));
				_push(`<div class="at-practice-invite">`);
				_push(ssrRenderComponent(unref(Leaf), { size: 23 }, null, _parent));
				_push(`<h3>Немного свободы</h3><p>Экспериментируйте с оттенками в практике — без заказа и оценки клиента.</p><div><button>Маникюр `);
				_push(ssrRenderComponent(unref(Plus), { size: 13 }, null, _parent));
				_push(`</button><button>Педикюр `);
				_push(ssrRenderComponent(unref(Plus), { size: 13 }, null, _parent));
				_push(`</button></div></div></aside></section>`);
			} else if (view.value === "desk" && work.value) {
				_push(`<section class="at-workspace"><div class="at-service-heading"><button class="at-text-button">`);
				_push(ssrRenderComponent(unref(ArrowLeft), { size: 16 }, null, _parent));
				_push(` Студия</button><ol class="at-steps"><!--[-->`);
				ssrRenderList(steps, (step, i) => {
					_push(`<li class="${ssrRenderClass({
						current: work.value.stage === step.id,
						done: steps.findIndex((s) => s.id === work.value.stage) > i
					})}"><span>${ssrInterpolate(steps.findIndex((s) => s.id === work.value.stage) > i ? "✓" : `0${i + 1}`)}</span>${ssrInterpolate(step.label)}</li>`);
				});
				_push(`<!--]--></ol><span class="at-service-kind">${ssrInterpolate(work.value.design.kind === "manicure" ? "Маникюр" : "Педикюр")}</span></div><div class="at-workbench"><div class="at-hand-column"><div class="at-work-hint">`);
				_push(ssrRenderComponent(unref(Paintbrush), { size: 17 }, null, _parent));
				_push(`<span>${ssrInterpolate(work.value.stage === "prepare" ? "Выбирайте инструмент для этапа и обрабатывайте ногти по очереди." : work.value.stage === "design" ? "Выберите оттенок и дизайн. Нажимайте на ногти или ведите по ним кистью." : "Дизайн готов. Добавьте аккуратный финальный штрих.")}</span>`);
				if (work.value.stage === "design") {
					_push(`<button class="at-icon"${ssrIncludeBooleanAttr(!history.value.length) ? " disabled" : ""} aria-label="Отменить нанесение">`);
					_push(ssrRenderComponent(unref(Undo2), { size: 18 }, null, _parent));
					_push(`</button>`);
				} else _push(`<!---->`);
				_push(`</div><div class="at-hand-art">`);
				if (work.value.stage === "prepare") _push(ssrRenderComponent(NailPreparation_default, {
					mode: "board",
					design: work.value.design,
					"image-url": asset(work.value.design.kind === "manicure" ? "hand-realistic-v1.png" : "foot-realistic-v1.png"),
					preparation: work.value.preparation,
					"nail-index": selectedNail.value,
					onUpdate: setPreparation,
					onSelect: ($event) => selectedNail.value = $event
				}, null, _parent));
				else _push(ssrRenderComponent(NailArt_default, {
					key: work.value.design.kind,
					design: work.value.design,
					"image-url": asset(work.value.design.kind === "manicure" ? "hand-realistic-v1.png" : "foot-realistic-v1.png"),
					interactive: work.value.stage !== "finish",
					preparing: work.value.stage === "prepare",
					prepared: work.value.prepared,
					selected: selectedNail.value,
					stroke: stroke.value,
					"brush-color": chosenColor.value,
					onPaint: paint
				}, null, _parent));
				_push(`</div>`);
				if (work.value.stage !== "finish") {
					_push(`<div class="at-finger-controls" aria-label="Ногти"><span>${ssrInterpolate(work.value.stage === "prepare" ? "Подготовка" : "Нанести")}</span><!--[-->`);
					ssrRenderList(work.value.design.nails, (nail, i) => {
						_push(`<button${ssrRenderAttr("aria-label", `Ноготь ${i + 1}`)} class="${ssrRenderClass({
							done: work.value.stage === "prepare" ? work.value.prepared.includes(i) : !!nail.color,
							selected: selectedNail.value === i
						})}">`);
						if (work.value.stage === "design") _push(`<i style="${ssrRenderStyle({ background: unref(colorHex)(nail.color) })}"></i>`);
						else if (work.value.prepared.includes(i)) _push(ssrRenderComponent(unref(Check), { size: 14 }, null, _parent));
						else _push(`<!---->`);
						_push(`${ssrInterpolate(i + 1)}</button>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`<div class="at-work-footer"><span><i class="at-live"></i>${ssrInterpolate(saveCount.value ? "Сохраняем работу…" : "Работа сохранена")}</span>`);
				if (work.value.stage === "finish" && work.value.accuracy === null) _push(`<button class="at-text-button">Вернуться к дизайну</button>`);
				else _push(`<span>${ssrInterpolate(work.value.stage === "prepare" ? "Обработка сохраняется после каждого касания" : "Каждая деталь имеет значение")}</span>`);
				_push(`</div></div><aside class="at-tools-panel">`);
				if (brief.value) {
					_push(`<div class="at-client-brief"><span class="at-guest-avatar">`);
					_push(ssrRenderComponent(KeriPortrait_default, {
						look: customerLook(brief.value),
						"asset-base": root.value
					}, null, _parent));
					_push(`</span><div><span class="at-eyebrow">ПОЖЕЛАНИЕ · ${ssrInterpolate(brief.value.customer)}</span><p>${ssrInterpolate(brief.value.wish)}</p>`);
					if (brief.value.shape) _push(`<small class="at-fit-request">${ssrInterpolate(fitDescription(brief.value))}</small>`);
					else _push(`<!---->`);
					_push(`</div></div>`);
				} else if (state.value.activeQuest && quest.value) {
					_push(`<div class="at-lesson-brief">`);
					_push(ssrRenderComponent(unref(Sparkles), { size: 19 }, null, _parent));
					_push(`<div><b>${ssrInterpolate(quest.value.title)}</b><p>${ssrInterpolate(quest.value.steps.slice(0, 2).join(". "))}</p></div></div>`);
				} else {
					_push(`<div class="at-lesson-brief">`);
					_push(ssrRenderComponent(unref(Leaf), { size: 19 }, null, _parent));
					_push(`<div><b>Свободная практика</b><p>Ваши цвета. Ваши правила. Работа останется в портфолио.</p></div></div>`);
				}
				if (work.value.stage === "prepare") {
					_push(`<!--[--><div class="at-tool-content at-expanded-prep">`);
					if (work.value.serial !== null) {
						_push(`<button class="at-supply-choice">`);
						_push(ssrRenderComponent(unref(ShoppingBag), { size: 22 }, null, _parent));
						_push(`<span><b>${ssrInterpolate(selectedSupply.value?.name ?? "Базовый набор")}</b><small>Материалы для приёма · изменить</small></span>`);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 14 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					if (work.value.design.kind === "manicure") _push(ssrRenderComponent(NailFit_default, {
						shape: work.value.design.shape,
						length: work.value.design.length,
						onShape: ($event) => setFit({ shape: $event }),
						onLength: ($event) => setFit({ length: $event })
					}, null, _parent));
					else _push(`<!---->`);
					_push(ssrRenderComponent(NailPreparation_default, {
						mode: "tools",
						preparation: work.value.preparation,
						"nail-index": selectedNail.value,
						organizer: hasUpgrade("organizer"),
						onUpdate: setPreparation,
						onSelect: ($event) => selectedNail.value = $event
					}, null, _parent));
					_push(`</div><div class="at-tool-bottom"><button class="at-btn at-primary"${ssrIncludeBooleanAttr(count.value < 5) ? " disabled" : ""}>К выбору дизайна `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button></div><!--]-->`);
				} else if (work.value.stage === "design") {
					_push(`<!--[--><div class="at-tool-content">`);
					if (work.value.serial !== null) {
						_push(`<button class="at-supply-choice">`);
						_push(ssrRenderComponent(unref(ShoppingBag), { size: 22 }, null, _parent));
						_push(`<span><b>${ssrInterpolate(selectedSupply.value?.name ?? "Базовый набор")}</b><small>Материалы для приёма · изменить</small></span>`);
						_push(ssrRenderComponent(unref(ChevronRight), { size: 14 }, null, _parent));
						_push(`</button>`);
					} else _push(`<!---->`);
					if (work.value.design.kind === "manicure") {
						_push(`<details class="at-fit-adjust"><summary>Изменить форму и длину</summary>`);
						_push(ssrRenderComponent(NailFit_default, {
							shape: work.value.design.shape,
							length: work.value.design.length,
							onShape: ($event) => setFit({ shape: $event }),
							onLength: ($event) => setFit({ length: $event })
						}, null, _parent));
						_push(`</details>`);
					} else _push(`<!---->`);
					_push(ssrRenderComponent(DesignPalette_default, {
						colors: colors.value,
						color: chosenColor.value,
						pattern: chosenPattern.value,
						accent: chosenAccent.value,
						finish: chosenFinish.value,
						onColor: ($event) => chosenColor.value = $event,
						onPattern: ($event) => chosenPattern.value = $event,
						onAccent: ($event) => chosenAccent.value = $event,
						onFinish: ($event) => chosenFinish.value = $event,
						onAll: paintAll,
						onInspiration: applyInspiration
					}, null, _parent));
					_push(`</div><div class="at-tool-bottom"><div class="at-nail-progress"><!--[-->`);
					ssrRenderList(work.value.design.nails, (nail, i) => {
						_push(`<i class="${ssrRenderClass({ filled: nail.color })}"></i>`);
					});
					_push(`<!--]--></div><button class="at-btn at-primary"${ssrIncludeBooleanAttr(!ready.value) ? " disabled" : ""}>К финальному штриху `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button></div><!--]-->`);
				} else {
					_push(`<!--[--><div class="at-tool-content"><span class="at-eyebrow">03 / ФИНАЛЬНЫЙ ШТРИХ</span>`);
					_push(ssrRenderComponent(FinishGame_default, {
						upgraded: hasUpgrade("lamp"),
						value: work.value.accuracy,
						onDone: ($event) => work.value.accuracy = $event
					}, null, _parent));
					if (selectedSupply.value) _push(`<p class="at-finish-material"><b>${ssrInterpolate(selectedSupply.value.name)} · 1 приём из запаса</b>${ssrInterpolate(supplyMatches.value ? `Бонус +${selectedSupply.value.bonus}: аккуратность от 85% и оценка 4–5 звёзд.` : "Этот материал не даёт бонуса для выбранной работы.")}</p>`);
					else _push(`<!---->`);
					_push(`<p class="at-subtle">${ssrInterpolate(hasUpgrade("lamp") ? "Ваша рабочая лампа расширяет зону точности." : "За аккуратность — до 30 дополнительных монет.")}</p></div><div class="at-tool-bottom"><button class="at-btn at-primary"${ssrIncludeBooleanAttr(work.value.accuracy === null || busy.value) ? " disabled" : ""} data-testid="complete-order">${ssrInterpolate(work.value.serial ? "Показать результат клиенту" : "Сохранить в портфолио")} `);
					_push(ssrRenderComponent(unref(Check), { size: 17 }, null, _parent));
					_push(`</button></div><!--]-->`);
				}
				_push(`</aside></div><p class="at-game-note">Игровая практика: этапы и оттенки упрощены. Профессиональное обучение — со Светланой.</p></section>`);
			} else if (view.value === "rewards") _push(ssrRenderComponent(RewardShop_default, null, null, _parent));
			else if (view.value === "style") {
				_push(`<section class="at-style"><p class="at-page-intro">Вы — лицо своей студии. Меняйте одежду, причёску, черты лица и макияж. Дополняйте образ украшениями.</p>`);
				_push(ssrRenderComponent(KeriWardrobe_default, {
					embedded: "",
					"asset-base": root.value,
					"initial-look": state.value.keriLook,
					"save-look": saveLook
				}, null, _parent));
				_push(`</section>`);
			} else if (view.value === "portfolio") {
				_push(`<section class="at-portfolio"><div class="at-portfolio-bar"><p>От первой работы к собственному стилю. <span>${ssrInterpolate(state.value.designs.length)} / 24</span></p><div class="at-segmented"><!--[-->`);
				ssrRenderList([
					{
						id: "all",
						label: "Все"
					},
					{
						id: "manicure",
						label: "Маникюр"
					},
					{
						id: "pedicure",
						label: "Педикюр"
					}
				], (item) => {
					_push(`<button${ssrRenderAttr("aria-pressed", galleryFilter.value === item.id)}>${ssrInterpolate(item.label)}</button>`);
				});
				_push(`<!--]--></div></div>`);
				if (filteredDesigns.value.length) {
					_push(`<div class="at-gallery-grid"><!--[-->`);
					ssrRenderList(filteredDesigns.value, (d) => {
						_push(`<button class="at-design-card">`);
						_push(ssrRenderComponent(NailArt_default, {
							design: d,
							"image-url": asset(d.kind === "manicure" ? "hand-realistic-v1.png" : "foot-realistic-v1.png")
						}, null, _parent));
						_push(`<div><span class="at-eyebrow">${ssrInterpolate(d.kind === "manicure" ? "МАНИКЮР" : "ПЕДИКЮР")}</span><h3>${ssrInterpolate(d.name)}</h3><span>${ssrInterpolate(new Date(d.createdAt).toLocaleDateString("ru-RU", {
							day: "numeric",
							month: "long"
						}))} `);
						_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent));
						_push(`</span></div></button>`);
					});
					_push(`<!--]--></div>`);
				} else {
					_push(`<div class="at-empty">`);
					_push(ssrRenderComponent(unref(Images), {
						size: 40,
						"stroke-width": 1
					}, null, _parent));
					_push(`<span class="at-eyebrow">ЗДЕСЬ НАЧИНАЕТСЯ ВАША ИСТОРИЯ</span><h2>Первая работа — особенная</h2><p>Примите гостя или начните с собственной идеи.</p><button class="at-btn at-primary">Создать первую работу `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button></div>`);
				}
				_push(`</section>`);
			} else if (view.value === "shop") {
				_push(`<section class="at-development"><p class="at-page-intro">Зарабатывайте на любимом деле и делайте рабочее место удобнее.</p><div class="at-upgrade-grid"><!--[-->`);
				ssrRenderList(unref(UPGRADES), (upgrade) => {
					_push(`<article class="${ssrRenderClass([{ owned: hasUpgrade(upgrade.id) }, "at-upgrade-card"])}"><div class="${ssrRenderClass([`upgrade-${upgrade.id}`, "at-upgrade-art"])}">`);
					if (upgrade.id === "organizer") {
						_push(`<!--[--><!--[-->`);
						ssrRenderList(5, (n) => {
							_push(`<i></i>`);
						});
						_push(`<!--]--><span></span><!--]-->`);
					} else if (upgrade.id === "lamp") _push(`<!--[--><i></i><span></span><b></b><!--]-->`);
					else {
						_push(`<!--[--><!--[-->`);
						ssrRenderList(3, (n) => {
							_push(`<i></i>`);
						});
						_push(`<!--]--><span>SARKISIAN<br>PASTEL</span><!--]-->`);
					}
					if (hasUpgrade(upgrade.id)) {
						_push(`<span class="at-owned">`);
						_push(ssrRenderComponent(unref(Check), { size: 13 }, null, _parent));
						_push(` В студии</span>`);
					} else _push(`<!---->`);
					_push(`</div><div class="at-upgrade-copy"><span class="at-eyebrow">${ssrInterpolate(upgrade.id === "pastel" ? "БОЛЬШЕ ТВОРЧЕСТВА" : "РАБОТАТЬ ПРИЯТНЕЕ")}</span><h2>${ssrInterpolate(upgrade.name)}</h2><p>${ssrInterpolate(upgrade.benefit)}</p><button class="${ssrRenderClass([hasUpgrade(upgrade.id) ? "at-secondary" : "at-primary", "at-btn"])}"${ssrIncludeBooleanAttr(hasUpgrade(upgrade.id) || coins.value < upgrade.price) ? " disabled" : ""}>`);
					if (hasUpgrade(upgrade.id)) _push(ssrRenderComponent(unref(Check), { size: 16 }, null, _parent));
					else _push(ssrRenderComponent(unref(Coins), { size: 17 }, null, _parent));
					_push(`${ssrInterpolate(hasUpgrade(upgrade.id) ? "Установлено" : upgrade.price.toLocaleString("ru-RU") + " · Улучшить")}</button></div></article>`);
				});
				_push(`<!--]--></div><button class="at-shelf-strip at-shop-shelf"><span>`);
				_push(ssrRenderComponent(unref(ShoppingBag), { size: 18 }, null, _parent));
				_push(` Материалы SARKISIAN</span><span><small>Пополнить запас за игровые монеты</small>`);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent));
				_push(`</span></button><div class="at-special-orders"><span class="at-eyebrow">РЕПУТАЦИЯ ОТКРЫВАЕТ ДВЕРИ</span><h2>Записи с особой историей</h2><!--[-->`);
				ssrRenderList(unref(ORDERS).filter((o) => o.reputation), (special) => {
					_push(`<div><span class="at-guest-avatar">`);
					_push(ssrRenderComponent(KeriPortrait_default, {
						look: customerLook(special),
						"asset-base": root.value
					}, null, _parent));
					_push(`</span><span><b>${ssrInterpolate(special.customer)} · ${ssrInterpolate(special.title)}</b><small>${ssrInterpolate(state.value.career.reputation >= special.reputation ? "Доступно в записи" : `Нужно ${special.reputation} репутации · сейчас ${state.value.career.reputation}`)}</small></span>`);
					if (state.value.career.reputation >= special.reputation) _push(ssrRenderComponent(unref(Check), { size: 17 }, null, _parent));
					else _push(ssrRenderComponent(unref(LockKeyhole), { size: 17 }, null, _parent));
					_push(`</div>`);
				});
				_push(`<!--]--></div><div class="at-brand-story"><img${ssrRenderAttr("src", asset("gel-mousse.jpg"))} alt="Оригинальный гель-мусс SARKISIAN № 23"><div><span class="at-eyebrow">ОТ МАСТЕРА МАСТЕРАМ</span><h2>Идеи остаются с вами.<br>Материалы — рядом.</h2><p>Познакомьтесь с настоящими материалами SARKISIAN. Описания, реальные оттенки и ассортимент — на сайте бренда.</p><a class="at-btn at-primary"${ssrRenderAttr("href", __props.siteBase)} target="_blank" rel="noopener noreferrer">Перейти к SARKISIAN `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
				_push(`</a></div></div><p class="at-game-note">Улучшения расходуют монеты. Если копите на скидку, загляните в раздел «Награды» и выберите свою цель.</p></section>`);
			} else _push(`<!---->`);
			_push(`</main></div><dialog class="${ssrRenderClass([{
				"at-dialog-wide": modal.value === "result" || modal.value === "design",
				"at-material-dialog": modal.value === "materials"
			}, "at-dialog"])}"><button class="at-close at-icon" aria-label="Закрыть окно">`);
			_push(ssrRenderComponent(unref(X), { size: 20 }, null, _parent));
			_push(`</button>`);
			if (modal.value === "mentor") {
				_push(`<!--[--><div class="at-mentor-header"><img${ssrRenderAttr("src", asset("svetlana.png"))} alt="Светлана Саркисян"><div><span class="at-eyebrow">УЧИМСЯ У МАСТЕРА</span><h2>Светлана<br>Саркисян</h2></div></div><div class="at-dialog-content"><span class="at-eyebrow">УРОК ${ssrInterpolate(Math.min(state.value.completed.length + 1, 3))} / 3</span><h2>${ssrInterpolate(quest.value?.title ?? "Прекрасное начало!")}</h2><p>${ssrInterpolate(quest.value?.brief ?? "Все уроки пройдены. Пробуйте новые сочетания и собирайте своё портфолио.")}</p>`);
				if (quest.value) {
					_push(`<ol class="at-lesson-steps"><!--[-->`);
					ssrRenderList(quest.value.steps, (step, i) => {
						_push(`<li><span>${ssrInterpolate(i + 1)}</span>${ssrInterpolate(step)}</li>`);
					});
					_push(`<!--]--></ol>`);
				} else _push(`<!---->`);
				if (quest.value) {
					_push(`<div class="at-lesson-reward">`);
					_push(ssrRenderComponent(unref(Coins), { size: 18 }, null, _parent));
					_push(` +${ssrInterpolate(quest.value.reward)} монет за выполненный урок</div>`);
				} else _push(`<!---->`);
				if (quest.value) {
					_push(`<button class="at-btn at-primary">${ssrInterpolate(state.value.activeQuest ? "Продолжить урок" : "Начать урок")} `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button>`);
				} else {
					_push(`<button class="at-btn at-primary">Моё портфолио `);
					_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
					_push(`</button>`);
				}
				_push(`</div><!--]-->`);
			} else if (modal.value === "materials") _push(ssrRenderComponent(MaterialShelf_default, {
				supplies: state.value.supplies,
				coins: coins.value,
				design: work.value?.design,
				selected: work.value?.supply,
				"can-choose": canChooseSupply.value,
				busy: busy.value,
				message: shelfMessage.value,
				"site-base": __props.siteBase,
				onChoose: selectSupply,
				onBuy: restock
			}, null, _parent));
			else if (modal.value === "result" && (result.value || savedPractice.value)) {
				_push(`<!--[--><div class="at-result-art">`);
				_push(ssrRenderComponent(NailArt_default, {
					design: result.value?.saved ?? savedPractice.value,
					"image-url": asset((result.value?.saved ?? savedPractice.value)?.kind === "manicure" ? "hand-realistic-v1.png" : "foot-realistic-v1.png")
				}, null, _parent));
				_push(`</div><div class="at-result-copy"><span class="at-eyebrow">${ssrInterpolate(result.value ? "ПРИЁМ ЗАВЕРШЁН" : "НОВАЯ РАБОТА В ПОРТФОЛИО")}</span>`);
				if (result.value) {
					_push(`<div class="at-result-stars" aria-label="Оценка работы"><!--[-->`);
					ssrRenderList(5, (n) => {
						_push(ssrRenderComponent(unref(Star), {
							key: n,
							size: 25,
							fill: n <= result.value.stars ? "currentColor" : "none"
						}, null, _parent));
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`<h2>${ssrInterpolate(result.value ? result.value.stars >= 4 ? "Красота в ваших руках" : "Ещё один шаг к мастерству" : "Ваш почерк. Ваш дизайн.")}</h2><p>${ssrInterpolate(result.value ? `${result.value.brief.customer}: «${result.value.stars >= 4 ? "Именно то настроение, которое я хотела. Спасибо!" : "Спасибо! В следующий раз давайте ещё точнее подберём дизайн."}»` : questReward.value ? `Урок «${questReward.value.title}» выполнен.` : "Работа сохранена. К ней можно вернуться или скачать изображение.")}</p>`);
				if (result.value) _push(`<div class="at-result-breakdown"><span>Цвет <b>${ssrInterpolate(result.value.colors)}/5</b></span><span>Дизайн <b>${ssrInterpolate(result.value.patterns)}/5</b></span><span>Аккуратность <b>${ssrInterpolate(result.value.accuracy)}%</b></span></div>`);
				else _push(`<!---->`);
				if (result.value) {
					_push(`<div class="at-fit-result">`);
					if (result.value.shapeMatch !== null) _push(`<span class="${ssrRenderClass({ missed: !result.value.shapeMatch })}">${ssrInterpolate(result.value.shapeMatch ? "✓" : "×")} Форма</span>`);
					else _push(`<!---->`);
					if (result.value.lengthMatch !== null) _push(`<span class="${ssrRenderClass({ missed: !result.value.lengthMatch })}">${ssrInterpolate(result.value.lengthMatch ? "✓" : "×")} Длина</span>`);
					else _push(`<!---->`);
					_push(`<span class="${ssrRenderClass({ missed: result.value.reputationDelta < 0 })}">${ssrInterpolate(result.value.reputationDelta > 0 ? "+" : "")}${ssrInterpolate(result.value.reputationDelta)} репутации</span></div>`);
				} else _push(`<!---->`);
				if (result.value?.material) _push(`<p class="at-material-result">${ssrInterpolate(unref(supplyById)(result.value.material.id)?.name)} · использована 1 порция<b>${ssrInterpolate(result.value.material.bonus ? `+${result.value.material.bonus} монет за подбор материала и аккуратность` : "Без бонуса: нужны подходящий тип работы, 4–5 звёзд и точность от 85%.")}</b><small>Осталось на полке: ${ssrInterpolate(result.value.material.remaining)} приёмов</small></p>`);
				else _push(`<!---->`);
				if (result.value && result.value.tip) _push(`<p class="at-tip-note">В оплату входят ${ssrInterpolate(result.value.tip)} монет чаевых постоянного клиента.</p>`);
				else _push(`<!---->`);
				if (result.value) _push(`<p class="at-trust-note">Доверие ${ssrInterpolate(result.value.brief.customer)}: ${ssrInterpolate(result.value.trust)}/5 · ${ssrInterpolate(result.value.visits > 1 ? `Визит № ${result.value.visits}` : "Начало нового знакомства")}</p>`);
				else _push(`<!---->`);
				if (result.value || questReward.value) {
					_push(`<div class="at-earned">`);
					_push(ssrRenderComponent(unref(Coins), { size: 23 }, null, _parent));
					_push(`+${ssrInterpolate(result.value?.reward ?? questReward.value?.reward)}<small>игровых монет</small></div>`);
				} else _push(`<!---->`);
				_push(`<button class="at-btn at-primary">${ssrInterpolate(shiftFull.value ? "Итоги смены" : result.value ? "Следующий гость" : "В мою студию")} `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 18 }, null, _parent));
				_push(`</button><button class="at-text-button">`);
				_push(ssrRenderComponent(unref(Download), { size: 15 }, null, _parent));
				_push(` Скачать работу</button></div><!--]-->`);
			} else if (modal.value === "design" && viewedDesign.value) {
				_push(`<!--[--><div class="at-result-art">`);
				_push(ssrRenderComponent(NailArt_default, {
					design: viewedDesign.value,
					"image-url": asset(viewedDesign.value.kind === "manicure" ? "hand-realistic-v1.png" : "foot-realistic-v1.png")
				}, null, _parent));
				_push(`</div><div class="at-result-copy"><span class="at-eyebrow">ВАШЕ ПОРТФОЛИО</span><h2>${ssrInterpolate(viewedDesign.value.name)}</h2>`);
				if (unref(supplyById)(viewedDesign.value.material)) _push(`<p class="at-portfolio-material">Материал: ${ssrInterpolate(unref(supplyById)(viewedDesign.value.material)?.name)} SARKISIAN</p>`);
				else _push(`<!---->`);
				_push(`<button class="at-btn at-primary">`);
				_push(ssrRenderComponent(unref(Download), { size: 17 }, null, _parent));
				_push(` Скачать изображение</button></div><!--]-->`);
			} else if (modal.value === "settings") {
				_push(`<form class="at-dialog-content"><span class="at-eyebrow">УСТРАИВАЙТЕСЬ ПОУДОБНЕЕ</span><h2>Всё по-вашему</h2><label class="at-field">Название студии<input${ssrRenderAttr("value", settingsName.value)} maxlength="24"></label><label class="at-field">Громкость · ${ssrInterpolate(Math.round(state.value.volume * 100))}%<input${ssrRenderAttr("value", state.value.volume)} type="range" min="0" max="1" step=".01"></label><div class="at-segmented"><button type="button"${ssrRenderAttr("aria-pressed", state.value.track === 0)}>Chic &amp; Cheerful I</button><button type="button"${ssrRenderAttr("aria-pressed", state.value.track === 1)}>Chic &amp; Cheerful II</button></div><button type="button" class="at-btn at-secondary">`);
				_push(ssrRenderComponent(unref(Volume2), { size: 17 }, null, _parent));
				_push(`${ssrInterpolate(playing.value ? "Выключить музыку" : "Слушать музыку")}</button><p class="at-subtle">Прогресс хранится в этом браузере. Музыка затихает, когда вы переключаете вкладку.</p><button class="at-btn at-primary" type="submit">Сохранить `);
				_push(ssrRenderComponent(unref(Check), { size: 17 }, null, _parent));
				_push(`</button></form>`);
			} else if (modal.value === "shift") {
				_push(`<div class="at-dialog-content at-shift-dialog"><span class="at-eyebrow">СМЕНА ${ssrInterpolate(day.value)} · ${ssrInterpolate(shiftFull.value ? "ПОДВОДИМ ИТОГИ" : "ВАШИ ЦЕЛИ")}</span><h2>${ssrInterpolate(shiftFull.value ? "Маленькие победы дня" : "Какой будет эта смена?")}</h2><p>Выберите три приёма под цели смены. Хорошие работы повышают репутацию, а выполненные цели приносят дополнительные монеты.</p>`);
				_push(ssrRenderComponent(ShiftGoals_default, { shift: state.value.career.shift }, null, _parent));
				if (state.value.career.shift.visits.length) {
					_push(`<div class="at-shift-visits"><!--[-->`);
					ssrRenderList(state.value.career.shift.visits, (visit, i) => {
						_push(`<div><span>${ssrInterpolate(visit.customer)}<small>${ssrInterpolate(visit.kind === "manicure" ? "Маникюр" : "Педикюр")}</small></span><b>${ssrInterpolate(visit.stars)} `);
						_push(ssrRenderComponent(unref(Star), { size: 12 }, null, _parent));
						_push(`</b><span>+${ssrInterpolate(visit.reward)}</span></div>`);
					});
					_push(`<!--]--></div>`);
				} else _push(`<!---->`);
				_push(`<div class="at-shift-bonus"><span>${ssrInterpolate(shiftFull.value ? "Награда за смену" : "Заработано награды")}<small>50 за смену + выполненные цели</small></span><b>`);
				_push(ssrRenderComponent(unref(Coins), { size: 20 }, null, _parent));
				_push(`+${ssrInterpolate(unref(shiftReward)(state.value.career.shift))}</b></div><button class="at-btn at-primary"${ssrIncludeBooleanAttr(!shiftFull.value || busy.value) ? " disabled" : ""} data-testid="close-shift">Забрать награду и открыть смену ${ssrInterpolate(day.value + 1)} `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 16 }, null, _parent));
				_push(`</button>`);
				if (!shiftFull.value) _push(`<p class="at-subtle">Осталось завершить приёмов: ${ssrInterpolate(3 - state.value.career.shift.visits.length)}. Практика не расходует запись.</p>`);
				else _push(`<!---->`);
				_push(`</div>`);
			} else if (modal.value === "clients") {
				_push(`<div class="at-dialog-content at-clients-dialog"><span class="at-eyebrow">ЛЮДИ, КОТОРЫЕ ВОЗВРАЩАЮТСЯ</span><h2>Книга ваших клиентов</h2><p>За работу на 4–5 звёзд растёт доверие. После двух удачных визитов гость начинает оставлять чаевые. За 1–2 звезды доверие снижается.</p>`);
				if (!clientBook.value.length) _push(`<div class="at-clients-empty">Первое знакомство начинается с первого приёма.</div>`);
				else _push(`<!---->`);
				_push(`<!--[-->`);
				ssrRenderList(clientBook.value, (client) => {
					_push(`<article class="at-client-record"><span class="at-guest-avatar">`);
					_push(ssrRenderComponent(KeriPortrait_default, {
						look: customerLook(client.order),
						"asset-base": root.value
					}, null, _parent));
					_push(`</span><div><b>${ssrInterpolate(client.order.customer)} <small>${ssrInterpolate(client.trust >= 3 ? "Постоянный гость" : "Знакомимся")}</small></b><span>Визитов: ${ssrInterpolate(client.visits)} · последняя оценка ${ssrInterpolate(client.lastStars)}/5</span><div class="at-trust-stars"${ssrRenderAttr("aria-label", `Доверие ${client.trust} из 5`)}><!--[-->`);
					ssrRenderList(5, (n) => {
						_push(ssrRenderComponent(unref(Star), {
							key: n,
							size: 12,
							fill: n <= client.trust ? "currentColor" : "none"
						}, null, _parent));
					});
					_push(`<!--]--></div></div><span class="at-client-tip">${ssrInterpolate(client.trust >= 2 ? `до +${Math.min(45, client.trust * 8)}` : "—")}<small>чаевые</small></span></article>`);
				});
				_push(`<!--]--><p class="at-subtle">Чаевые начисляются за удачный повторный приём. Новые особые записи открываются при репутации 20 и 50.</p><button class="at-btn at-primary">К своей студии `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
				_push(`</button></div>`);
			} else if (modal.value === "help") {
				_push(`<div class="at-dialog-content"><span class="at-eyebrow">ВАША СТУДИЯ. ВАША ИСТОРИЯ.</span><h2>Мастер здесь — вы</h2><ol class="at-lesson-steps"><li><span>1</span>Выберите гостя в записи и прочитайте пожелание.</li><li><span>2</span>Выберите форму и длину по пожеланию, подготовьте пять ногтей. Подберите цвет и рисунок.</li><li><span>3</span>Поймайте блик на финише и покажите результат. Точность заказа влияет на оценку и оплату.</li><li><span>4</span>Подведите итоги после трёх приёмов. Выполняйте цели смены, развивайте студию и возвращайте постоянных гостей.</li></ol><p class="at-subtle">В практике можно экспериментировать. Переходы между разделами и перезагрузка сохраняют текущую работу. Нажмите на правые полки в студии, чтобы пополнить материалы. Подходящий материал даёт бонус за работу на 4–5 звёзд с точностью от 85%. Базовый набор безлимитный.</p><button class="at-btn at-primary">Начнём `);
				_push(ssrRenderComponent(unref(ArrowUpRight), { size: 17 }, null, _parent));
				_push(`</button><p class="at-credits">Персонажи Keri: Konett · адаптация LunaLucid / Namastaii, CC BY. Интерьер создан для игры. Музыка предоставлена владельцем проекта.</p></div>`);
			} else _push(`<!---->`);
			if (saveError.value) _push(`<p class="at-dialog-error" role="alert">${ssrInterpolate(saveError.value)}</p>`);
			else _push(`<!---->`);
			_push(`</dialog>`);
			if (!loaded.value) _push(`<div class="at-loading" role="status"><span></span> Открываем вашу студию…</div>`);
			else _push(`<!---->`);
			_push(`</div>`);
		};
	}
});
// components/sarkisian-studio/SarkisianStudio.vue
var _sfc_setup$1 = SarkisianStudio_vue_vue_type_script_setup_true_lang_default.setup;
SarkisianStudio_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/sarkisian-studio/SarkisianStudio.vue");
	return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
var SarkisianStudio_default = Object.assign(SarkisianStudio_vue_vue_type_script_setup_true_lang_default, { __name: "SarkisianStudio" });
// pages/studio.vue?vue&type=script&setup=true&lang.ts
var studio_vue_vue_type_script_setup_true_lang_default = /*@__PURE__*/ defineComponent({
	__name: "studio",
	__ssrInlineRender: true,
	setup(__props) {
		useHead({
			title: "SARKISIAN Studio — игра для мастеров",
			meta: [{
				name: "description",
				content: "Создавайте дизайн ногтей, принимайте игровые заказы и развивайте свою студию в браузерной игре SARKISIAN."
			}]
		});
		return (_ctx, _push, _parent, _attrs) => {
			const _component_SiteShell = SiteShell_default;
			const _component_ClientOnly = ClientOnly;
			_push(ssrRenderComponent(_component_SiteShell, mergeProps({ editorial: "" }, _attrs), {
				default: withCtx((_, _push, _parent, _scopeId) => {
					if (_push) {
						_push(`<div class="sb-studio-page" data-v-3554dfcb${_scopeId}>`);
						_push(ssrRenderComponent(_component_ClientOnly, null, { fallback: withCtx((_, _push, _parent, _scopeId) => {
							if (_push) _push(`<div class="sb-studio-loading" role="status" data-v-3554dfcb${_scopeId}>Открываем студию…</div>`);
							else return [createVNode("div", {
								class: "sb-studio-loading",
								role: "status"
							}, "Открываем студию…")];
						}) }, _parent, _scopeId));
						_push(`</div>`);
					} else return [createVNode("div", { class: "sb-studio-page" }, [createVNode(_component_ClientOnly, null, {
						fallback: withCtx(() => [createVNode("div", {
							class: "sb-studio-loading",
							role: "status"
						}, "Открываем студию…")]),
						default: withCtx(() => [createVNode(SarkisianStudio_default, {
							"asset-base": "/studio-assets/",
							"site-base": "/"
						})]),
						_: 1
					})])];
				}),
				_: 1
			}, _parent));
		};
	}
});
// pages/studio.vue
var _sfc_setup = studio_vue_vue_type_script_setup_true_lang_default.setup;
studio_vue_vue_type_script_setup_true_lang_default.setup = (props, ctx) => {
	const ssrContext = useSSRContext();
	(ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/studio.vue");
	return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};
var studio_default = /*#__PURE__*/ _plugin_vue_export_helper_default(studio_vue_vue_type_script_setup_true_lang_default, [["__scopeId", "data-v-3554dfcb"]]);

export { studio_default as default };;globalThis.__timing__.logEnd('Load chunks/build/studio-CWBAbGUb');
//# sourceMappingURL=studio-CWBAbGUb.mjs.map
