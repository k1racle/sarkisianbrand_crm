<script setup lang="ts">
import { ImagePlus, Plus, X } from "@lucide/vue";
const config = useRuntimeConfig();
const route = useRoute();
const { token } = useWorkspaceSession();
const open = ref(false);
const saving = ref(false);
const error = ref("");
const categories = ref<any[]>([]);
const teleportReady = ref(false);
let headerObserver: MutationObserver | undefined;
const form = ref<any>({
  sku: "",
  nameRu: "",
  descriptionRu: "",
  purposesText: "",
  featuresText: "",
  price: 0,
  stock: 0,
  slug: "",
  images: [],
  categoryIds: [],
  metaTitle: "",
  metaDesc: "",
  canonical: "",
});
const canShow = computed(
  () =>
    !!token.value &&
    route.path === "/admin-workspace" &&
    route.query.section === "products",
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
});
onBeforeUnmount(() => headerObserver?.disconnect());
async function openForm() {
  open.value = true;
  if (!categories.value.length)
    categories.value = await $fetch<any[]>("/admin/categories", {
      baseURL: config.public.apiBase,
      headers: { Authorization: `Bearer ${token.value}` },
    });
}
function addImage() {
  form.value.images.push({ url: "", alt: "" });
}
async function create() {
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
        stock: Number(form.value.stock),
        images: form.value.images.filter((image: any) => image.url),
      },
    });
    open.value = false;
    location.reload();
  } catch (e: any) {
    error.value = e?.data?.message || "Не удалось создать товар";
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
    <button class="new-product" @click="openForm">
      <Plus :size="16" /> Новый товар
    </button>
  </Teleport>
  <aside v-if="open" class="new-backdrop" @click.self="open = false">
    <form class="new-drawer" @submit.prevent="create">
      <header>
        <div>
          <p>КАТАЛОГ / НОВАЯ ПОЗИЦИЯ</p>
          <h2>Новый товар</h2>
        </div>
        <button type="button" class="close" @click="open = false">
          <X :size="18" />
        </button>
      </header>
      <div class="form-scroll">
        <label
          >Название товара<input
            v-model="form.nameRu"
            required
            placeholder="Например, Кисть SARKISIAN"
        /></label>
        <label>Для чего<input v-model="form.purposesText" maxlength="1600" placeholder="Назначения через запятую" /></label>
        <label>Особенности<input v-model="form.featuresText" maxlength="1600" placeholder="Подтверждённые характеристики через запятую" /></label>
        <div class="two">
          <label
            >Артикул / SKU<input
              v-model="form.sku"
              required
              placeholder="SB-001" /></label
          ><label
            >Slug<input
              v-model="form.slug"
              placeholder="создастся автоматически"
          /></label>
        </div>
        <label
          >Описание<textarea v-model="form.descriptionRu" rows="5"></textarea>
        </label>
        <div class="two">
          <label
            >Цена, ₽<input
              v-model.number="form.price"
              type="number"
              min="0"
              required /></label
          ><label
            >Остаток<input
              v-model.number="form.stock"
              type="number"
              min="0"
              required
          /></label>
        </div>
        <label
          >Категории<select v-model="form.categoryIds" multiple>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.nameRu }}
            </option>
          </select></label
        >
        <div class="images">
          <div class="title">
            <span>Изображения</span
            ><button type="button" @click="addImage">
              <ImagePlus :size="14" /> Добавить
            </button>
          </div>
          <div
            v-for="(image, index) in form.images"
            :key="index"
            class="image-line"
          >
            <AdminMediaPicker v-model="image.url" :disabled="saving" label="Изображение товара" /><input
              v-model="image.alt"
              placeholder="Alt-текст"
            />
          </div>
        </div>
        <div class="seo">
          <p>SEO</p>
          <input v-model="form.metaTitle" placeholder="Meta Title" /><textarea
            v-model="form.metaDesc"
            rows="3"
            placeholder="Meta Description"
          ></textarea
          ><input v-model="form.canonical" placeholder="Canonical URL" />
        </div>
        <span v-if="error" class="error">{{ error }}</span>
      </div>
      <footer>
        <button type="button" class="cancel" @click="open = false">
          Отмена</button
        ><button class="save" :disabled="saving">
          {{ saving ? "Создаём…" : "Создать товар" }}
        </button>
      </footer>
    </form>
  </aside>
</template>
<style scoped>
.new-product {
  position: fixed;
  z-index: 120;
  right: 28px;
  top: 28px;
  height: 40px;
  padding: 0 15px;
  border: 0;
  background: #1d1e22;
  color: #fff;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}
.new-backdrop {
  position: fixed;
  inset: 0;
  background: #1115;
  z-index: 600;
}
.new-drawer {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: min(560px, 94vw);
  background: #fff;
  display: flex;
  flex-direction: column;
}
.new-drawer header {
  padding: 27px 30px 21px;
  border-bottom: 1px solid #e8e9ec;
  display: flex;
  justify-content: space-between;
}
.new-drawer header p {
  font-size: 10px;
  letter-spacing: 0.15em;
  color: #f15b49;
  margin: 0 0 8px;
}
.new-drawer h2 {
  font-size: 24px;
  margin: 0;
}
.close {
  border: 0;
  background: none;
  color: #858991;
}
.form-scroll {
  padding: 25px 30px;
  overflow: auto;
  display: grid;
  gap: 16px;
  flex: 1;
}
.form-scroll label {
  display: grid;
  gap: 7px;
  font-size: 11px;
  color: #74777f;
}
.form-scroll input,
.form-scroll textarea,
.form-scroll select {
  height: 40px;
  box-sizing: border-box;
  border: 1px solid #dfe1e5;
  padding: 0 10px;
  font: 12px var(--sb-font);
  resize: vertical;
}
.form-scroll textarea {
  height: auto;
  padding: 10px;
}
.form-scroll select {
  height: 80px;
}
.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.images,
.seo {
  border: 1px solid #e3e5e8;
  padding: 14px;
  display: grid;
  gap: 10px;
}
.title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}
.title button {
  border: 0;
  background: none;
  color: #f15b49;
  font-size: 11px;
  display: flex;
  gap: 5px;
  align-items: center;
}
.image-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 7px;
}
.image-line input {
  height: 34px;
}
.seo p {
  margin: 0;
  color: #f15b49;
  font-size: 10px;
  letter-spacing: 0.13em;
}
.error {
  color: #f15b49;
  font-size: 11px;
}
.new-drawer footer {
  padding: 18px 30px;
  border-top: 1px solid #e8e9ec;
  display: flex;
  justify-content: flex-end;
  gap: 9px;
}
.cancel,
.save {
  height: 40px;
  padding: 0 15px;
  border: 0;
  font-size: 11px;
}
.cancel {
  background: #fff;
}
.save {
  background: #1d1e22;
  color: #fff;
}
@media (max-width: 800px) {
  .new-product {
    right: 18px;
    top: 18px;
  }
  .new-drawer header,
  .form-scroll,
  .new-drawer footer {
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
<style scoped>
.new-product {
  position: static;
}
</style>
