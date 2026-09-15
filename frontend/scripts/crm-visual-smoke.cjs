const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const dotenv = require("../../backend/node_modules/dotenv");
const jwt = require("../../backend/node_modules/jsonwebtoken");
const { PrismaClient } = require("../../backend/node_modules/@prisma/client");

dotenv.config({ path: path.join(__dirname, "..", "..", "backend", ".env") });
const prisma = new PrismaClient();
let browser;

async function main() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN", isActive: true },
  });
  const token = jwt.sign(
    { sub: admin.id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "10m" },
  );
  browser = await chromium.launch({
    executablePath:
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1536, height: 960 },
    deviceScaleFactor: 1,
  });
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`page: ${error.message}`));
  page.on("response", (response) => {
    if (response.url().includes("/api/v1/") && response.status() >= 400)
      problems.push(`api: ${response.status()} ${response.url()}`);
  });
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem("sarkisian-workspace-token", token);
      localStorage.setItem("sarkisian-workspace-user", JSON.stringify(user));
    },
    {
      token,
      user: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
    },
  );
  const output = path.join(__dirname, "..", "..", ".screenshots");
  fs.mkdirSync(output, { recursive: true });

  await page.goto("http://localhost:3001/crm", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Обзор команды" }).waitFor();
  const menuLabels = [
    "Обзор",
    "Воронка продаж",
    "Клиенты 360°",
    "Организации B2B",
    "Задачи",
  ];
  for (const label of menuLabels) {
    if (
      !(await page.getByRole("link", { name: label, exact: true }).isVisible())
    )
      problems.push(`menu: отсутствует «${label}»`);
  }
  const kpis = await page.locator(".kpis article").count();
  await page.screenshot({
    path: path.join(output, "crm-dashboard.png"),
    fullPage: true,
  });

  await page.goto("http://localhost:3001/crm-pipeline", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "Основная воронка продаж" })
    .waitFor();
  const pipelineStages = await page.locator(".column").count();
  await page.screenshot({
    path: path.join(output, "crm-pipeline.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Настроить" }).click();
  await page.locator(".pipeline-settings").waitFor();
  const pipelineRequiredFields = await page
    .locator('.pipeline-settings fieldset input[type="checkbox"]')
    .count();
  const configurableStages = await page
    .locator(".pipeline-settings .stages article")
    .count();
  await page.screenshot({
    path: path.join(output, "crm-pipeline-settings.png"),
    fullPage: true,
  });
  await page.locator(".pipeline-settings > header > button").click();

  await page.goto("http://localhost:3001/crm-tasks", {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: "Работа команды" }).waitFor();
  const taskViews = await page.locator(".toolbar nav button").count();
  await page.getByRole("button", { name: /Гант/ }).click();
  await page.locator(".gantt").waitFor();
  await page.getByRole("button", { name: /Календарь/ }).click();
  await page.locator(".calendar").waitFor();
  await page.screenshot({
    path: path.join(output, "crm-tasks-calendar.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Автоматизация" }).click();
  await page.locator(".automation").waitFor();
  const automationTabs = await page.locator(".automation > nav button").count();
  const templateFields = await page
    .locator(
      ".automation form input, .automation form textarea, .automation form select",
    )
    .count();
  await page.screenshot({
    path: path.join(output, "crm-task-automation.png"),
    fullPage: true,
  });
  await page.locator(".automation > header > button").click();

  await page.getByRole("button", { name: /Чат платформы/ }).click();
  await page.getByRole("heading", { name: "Чат платформы" }).waitFor();
  await page
    .getByText("В реальном времени", { exact: true })
    .waitFor({ timeout: 10000 });
  const realtimeConnected = await page
    .locator(".realtime-state.connected")
    .count();
  await page.locator(".platform-chat .channels nav button").first().waitFor();
  const channels = await page
    .locator(".platform-chat .channels nav button")
    .count();
  await page.getByTitle("Добавить смайлик").click();
  const emojis = await page.locator(".emoji-picker button").count();
  await page.locator(".emoji-picker button").first().click();
  await page.getByTitle("Прикрепить карточку").click();
  const entityTypes = await page.locator(".entity-picker nav button").count();
  await page
    .locator('.platform-chat input[type="file"]')
    .setInputFiles({
      name: "preview.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  const pendingFiles = await page.locator(".pending > span").count();
  const pendingPreviews = await page.locator(".pending > span img").count();
  await page.locator(".entity-picker > header button").click();
  await page.screenshot({
    path: path.join(output, "platform-chat.png"),
    fullPage: true,
  });

  await page.goto("http://localhost:3001/admin-workspace?section=dashboard", {
    waitUntil: "networkidle",
  });
  const obsoleteSiteMenuItems = await page
    .locator(
      '.console-rail a[href*="section=warehouse"], .console-rail a[href*="section=settings"]',
    )
    .count();
  await page.screenshot({
    path: path.join(output, "site-admin-clean-menu.png"),
    fullPage: true,
  });

  if (kpis !== 4) problems.push(`dashboard: ожидалось 4 KPI, получено ${kpis}`);
  if (pipelineStages < 6)
    problems.push(
      `pipeline: ожидалось не менее 6 этапов, получено ${pipelineStages}`,
    );
  if (pipelineRequiredFields !== 9)
    problems.push(
      `pipeline: ожидалось 9 настраиваемых обязательных полей, получено ${pipelineRequiredFields}`,
    );
  if (configurableStages < 6)
    problems.push(
      `pipeline: конструктор показал только ${configurableStages} этапов`,
    );
  if (taskViews !== 4)
    problems.push(`tasks: ожидалось 4 представления, получено ${taskViews}`);
  if (automationTabs !== 2)
    problems.push(
      `tasks: ожидались вкладки шаблонов и напоминаний, получено ${automationTabs}`,
    );
  if (templateFields < 8)
    problems.push(`tasks: форма шаблона неполная (${templateFields} полей)`);
  if (channels < 4)
    problems.push(`chat: ожидалось не менее 4 каналов, получено ${channels}`);
  if (emojis < 20) problems.push(`chat: панель смайликов неполная (${emojis})`);
  if (entityTypes !== 4)
    problems.push(`chat: ожидалось 4 типа карточек, получено ${entityTypes}`);
  if (pendingFiles !== 1)
    problems.push("chat: выбранное изображение не появилось перед отправкой");
  if (pendingPreviews !== 1)
    problems.push(
      "chat: у выбранного изображения нет локального предпросмотра",
    );
  if (realtimeConnected !== 1)
    problems.push("chat: WebSocket-соединение не установлено");
  if (obsoleteSiteMenuItems !== 0)
    problems.push(
      `site-admin: осталось устаревших пунктов склада/настроек — ${obsoleteSiteMenuItems}`,
    );
  console.log(
    JSON.stringify(
      {
        success: problems.length === 0,
        kpis,
        pipelineStages,
        pipelineSettings: { pipelineRequiredFields, configurableStages },
        taskViews,
        taskAutomation: { automationTabs, templateFields },
        platformChat: {
          realtimeConnected: Boolean(realtimeConnected),
          channels,
          emojis,
          entityTypes,
          pendingFiles,
          pendingPreviews,
        },
        obsoleteSiteMenuItems,
        problems,
      },
      null,
      2,
    ),
  );
  await browser.close();
  await prisma.$disconnect();
  if (problems.length) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error);
  if (browser) await browser.close();
  await prisma.$disconnect();
  process.exitCode = 1;
});
