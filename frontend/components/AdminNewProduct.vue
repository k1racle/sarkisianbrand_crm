<script setup lang="ts">
import { ImagePlus, Plus, X } from "@lucide/vue";
const config = useRuntimeConfig();
const route = useRoute();
const router = useRouter();
const { token } = useWorkspaceSession();
const open = ref(false);
const saving = ref(false);
const error = ref("");
const categories = ref<any[]>([]);
const teleportReady = ref(false);
let headerObserver: MutationObserver | undefined;
let removeRouteGuard: (() => void) | undefined;
const form = ref<any>({
  sku: "",
  nameRu: "",
  descriptionRu: "",
  purposesText: "",
  featuresText: "",
  price: 0,
  salePrice:'',saleStartsAt:'',saleEndsAt:'',
  stock: 0,
  slug: "",
  images: [],
  categoryIds: [],
  metaTitle: "",
  metaDesc: "",
  canonical: "",
});
const initialForm = JSON.stringify(form.value);
const dirty = computed(() => JSON.stringify(form.value) !== initialForm);
function closeForm() {
  if (saving.value || (dirty.value && !window.confirm('Закрыть без создания товара? Введённые данные будут удалены.'))) return false;
  open.value = false; form.value = JSON.parse(initialForm); error.value = ''; return true;
}
const canShow = computed(
  () =>
    !!token.value &&
    (route.path === "/admin-workspace/products" ||
      (route.path === "/admin-workspace" && route.query.section === "products")),
);
function detectHeader() {
  teleportReady.value = Boolean(
    document.querySelector(".site-admin-header .header-actions"),
  );
}
onMounted(() => {
  detectHeader();
  headerObserver = new MutationObserver(detectHeader);
  headerObserver.observe(document.body, { childList: true, subtree: true });
  removeRouteGuard = router.beforeEach(() => !open.value || closeForm());
});
onBeforeUnmount(() => { headerObserver?.disconnect(); removeRouteGuard?.(); });
async function openForm() {
  if (saving.value) return;
  open.value = true;
  error.value = '';
  try { if (!categories.value.length)
    categories.value = await $fetch<any[]>("/admin/categories", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${token.value}` },
    }); }
  catch (reason:any) { error.value = typeof reason?.data?.message === 'string' ? reason.data.message : 'Не удалось загрузить категории. Закройте редактор и повторите попытку.'; }
}
function addImage() {
  form.value.images.push({ url: "", alt: "" });
}
async function create() {
  if (saving.value || !token.value) return;
  saving.value = true;
  error.value = "";
  try {
    const { purposesText, featuresText, ...payload } = form.value;
    await $fetch("/admin/products", {
      baseURL: config.public.apiBase,
      method: "POST",
      headers: { Authorization: `Bearer ${token.value}` },
      body: {
        ...payload,
        purposes: [...new Set((purposesText || '').split(',').map((v: string) => v.trim()).filter(Boolean))],
        features: [...new Set((featuresText || '').split(',').map((v: string) => v.trim()).filter(Boolean))],
        price: Number(form.value.price),
        salePrice:form.value.salePrice===''?null:Number(form.value.salePrice),
        saleStartsAt:form.value.salePrice!==''&&form.value.saleStartsAt?new Date(form.value.saleStartsAt).toISOString():null,
        saleEndsAt:form.value.salePrice!==''&&form.value.saleEndsAt?new Date(form.value.saleEndsAt).toISOString():null,
        stock: Number(form.value.stock),
        images: form.value.images.filter((image: any) => image.url),
      },
    });
    open.value = false;
    location.reload();
  } catch (e: any) {
    error.value = Array.isArray(e?.data?.message) ? e.data.message.join(' · ') : e?.data?.message || "Не удалось создать товар";
  } finally {
    saving.value = false;
  }
}
</script>
<template>
  <Teleport
    v-if="canShow && teleportReady"
    to=".site-admin-header .header-actions"
  >
    <button data-v-ui-7e270666b4a9 class="new-product" @click="openForm">
      <Plus data-v-ui-7e270666b4a9 :size="16" /> Новый товар
    </button>
  </Teleport>
  <aside data-v-ui-7e270666b4a9 v-if="open" class="new-backdrop admin-dialog-backdrop" @click.self="closeForm">
    <form data-v-ui-7e270666b4a9 class="new-drawer admin-dialog admin-dialog--drawer" @submit.prevent="create">
      <header data-v-ui-7e270666b4a9>
        <div data-v-ui-7e270666b4a9>
          <p data-v-ui-7e270666b4a9>КАТАЛОГ / НОВАЯ ПОЗИЦИЯ</p>
          <h2 data-v-ui-7e270666b4a9>Новый товар</h2>
        </div>
        <button data-v-ui-7e270666b4a9 type="button" class="close" :disabled="saving" aria-label="Закрыть создание товара" @click="closeForm">
          <X data-v-ui-7e270666b4a9 :size="18" />
        </button>
      </header>
      <div data-v-ui-7e270666b4a9 class="form-scroll">
        <label data-v-ui-7e270666b4a9
          >Название товара<input data-v-ui-7e270666b4a9
            v-model="form.nameRu"
            required
            placeholder="Например, Кисть SARKISIAN"
        /></label>
        <label data-v-ui-7e270666b4a9>Для чего<input data-v-ui-7e270666b4a9 v-model="form.purposesText" maxlength="1600" placeholder="Назначения через запятую" /></label>
        <label data-v-ui-7e270666b4a9>Акционная цена, ₽<input data-v-ui-7e270666b4a9 v-model="form.salePrice" type="number" min="0" step="0.01" placeholder="Без акции"/></label><div data-v-ui-7e270666b4a9 class="two"><label data-v-ui-7e270666b4a9>Начало акции<input data-v-ui-7e270666b4a9 v-model="form.saleStartsAt" type="datetime-local" :disabled="form.salePrice===''"/></label><label data-v-ui-7e270666b4a9>Окончание акции<input data-v-ui-7e270666b4a9 v-model="form.saleEndsAt" type="datetime-local" :disabled="form.salePrice===''"/></label></div>
        <label data-v-ui-7e270666b4a9>Особенности<input data-v-ui-7e270666b4a9 v-model="form.featuresText" maxlength="1600" placeholder="Подтверждённые характеристики через запятую" /></label>
        <div data-v-ui-7e270666b4a9 class="two">
          <label data-v-ui-7e270666b4a9
            >Артикул / SKU<input data-v-ui-7e270666b4a9
              v-model="form.sku"
              required
              placeholder="SB-001" /></label
          ><label data-v-ui-7e270666b4a9
            >Slug<input data-v-ui-7e270666b4a9
              v-model="form.slug"
              placeholder="создастся автоматически"
          /></label>
        </div>
        <label data-v-ui-7e270666b4a9
          >Описание<textarea data-v-ui-7e270666b4a9 v-model="form.descriptionRu" rows="5"></textarea>
        </label>
        <div data-v-ui-7e270666b4a9 class="two">
          <label data-v-ui-7e270666b4a9
            >Цена, ₽<input data-v-ui-7e270666b4a9
              v-model.number="form.price"
              type="number"
              min="0"
              required /></label
          ><label data-v-ui-7e270666b4a9
            >Остаток<input data-v-ui-7e270666b4a9
              v-model.number="form.stock"
              type="number"
              min="0"
              required
          /></label>
        </div>
        <label data-v-ui-7e270666b4a9
          >Категории<select data-v-ui-7e270666b4a9 v-model="form.categoryIds" multiple>
            <option data-v-ui-7e270666b4a9
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.nameRu }}
            </option>
          </select></label
        >
        <div data-v-ui-7e270666b4a9 class="images">
          <div data-v-ui-7e270666b4a9 class="title">
            <span data-v-ui-7e270666b4a9>Изображения</span
            ><button data-v-ui-7e270666b4a9 type="button" @click="addImage">
              <ImagePlus data-v-ui-7e270666b4a9 :size="14" /> Добавить
            </button>
          </div>
          <div data-v-ui-7e270666b4a9
            v-for="(image, index) in form.images"
            :key="index"
            class="image-line"
          >
            <AdminMediaPicker v-model="image.url" :disabled="saving" label="Изображение товара" /><input data-v-ui-7e270666b4a9
              v-model="image.alt"
              placeholder="Alt-текст"
            />
          </div>
        </div>
        <div data-v-ui-7e270666b4a9 class="seo">
          <p data-v-ui-7e270666b4a9>SEO</p>
          <input data-v-ui-7e270666b4a9 v-model="form.metaTitle" placeholder="Meta Title" /><textarea data-v-ui-7e270666b4a9
            v-model="form.metaDesc"
            rows="3"
            placeholder="Meta Description"
          ></textarea
          ><input data-v-ui-7e270666b4a9 v-model="form.canonical" placeholder="Canonical URL" />
        </div>
        <span data-v-ui-7e270666b4a9 v-if="error" class="error">{{ error }}</span>
      </div>
      <footer data-v-ui-7e270666b4a9>
        <button data-v-ui-7e270666b4a9 type="button" class="cancel" :disabled="saving" @click="closeForm">
          Отмена</button
        ><button data-v-ui-7e270666b4a9 class="save" :disabled="saving">
          {{ saving ? "Создаём…" : "Создать товар" }}
        </button>
      </footer>
    </form>
  </aside>
</template>


