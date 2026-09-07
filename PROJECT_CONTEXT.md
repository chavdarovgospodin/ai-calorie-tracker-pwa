# PROJECT_CONTEXT.md

> **Цел на този файл:** единствен източник на пълен контекст за проекта. Всеки бъдещ AI агент трябва да
> прочете САМО този файл и да има достатъчно знание за системата, без да преоткрива нещата от кода.
>
> **Последна актуализация:** 2026-09-07 (втора итерация — locale колона + дребни fix-ове)
>
> **ЗАДЪЛЖИТЕЛНО:** при всяка значима промяна по кода/схемата/конфигурацията — добави ред в
> [раздел 10 «Дневник на промените»](#10-дневник-на-промените) и обнови датата горе.

---

## 1. Какво представлява проектът

**Calio** — AI-powered калориен и макро тракер като **PWA** (installable mobile-first web app).
Потребителят логва храна със снимка или текстово описание, или ръчно; активности с текстово описание
или ръчно. AI-ят (Google Gemini) оценява калории/макроси/изгорени калории. Приложението показва
дневен «пръстен» с калории, макро-барове, вода, история по месеци.

- **Аудитория:** краен потребител, който следи хранене/тегло. UI е двуезичен (EN/BG).
- **Deploy модел:** Next.js App Router, предвиден за Vercel (serverless functions за API routes).
  PWA service worker се генерира от `@ducanh2912/next-pwa` в `public/` при `next build`
  (изключен в development).
- **Single repo.** Няма отделен backend — «backend»-ът е Supabase (Postgres + Auth + RLS)
  плюс двата Next.js API route-а за Gemini.

### Технологичен стек

| Слой | Технология |
|---|---|
| Framework | Next.js **16.1.6** (App Router, Turbopack), React **19.2.3** |
| Език | TypeScript 5, strict |
| Стилове | Tailwind CSS v4 (`@tailwindcss/postcss`), tw-animate-css. Тъмна тема хардкоднато. |
| UI примитиви | локални shadcn-style компоненти в `components/ui/`, `@base-ui/react`, lucide-react икони, `sonner` за toasts |
| Данни/кеш | `@tanstack/react-query` v5 (+ devtools) |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres, Row Level Security, Google OAuth + email/password |
| AI | `@google/generative-ai`, модел **`gemini-2.5-flash`** |
| Валидация | `zod` v4 (само в API routes, за парсване на Gemini отговора) |
| PWA | `@ducanh2912/next-pwa` |

Име на пакета: `calio` (`package.json`). Node в разработка: v22.14.0.

---

## 2. Топология и конфигурация

### Environment променливи

Файл `.env.local` (в git-ignore чрез `.env*`). Пример: `.env.local.example`.

| Променлива | Употреба | Изложена на клиента? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | **Да** (`NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable ключ | **Да** |
| `GEMINI_API_KEY` | Google Gemini API ключ | Не — само server-side в API routes |

> ⚠️ **Секрет в git-ignore-нат файл, но реален.** `.env.local` съдържа продукционни-изглеждащи
> стойности (Supabase URL `https://aopabzievltpcufinzte.supabase.co` и жив Gemini ключ). Не
> комитвай `.env.local`. Ако ключът течe — ротирай в Google AI Studio. Няма `.env.production`
> или Vercel config в repo-то — предполага се, че env-ите се задават в Vercel dashboard.

### Външни сервиси

| Сервис | За какво | Къде се конфигурира |
|---|---|---|
| **Supabase** | Postgres DB, Auth (session cookies), RLS | `NEXT_PUBLIC_SUPABASE_*`; клиенти в `lib/supabase/` |
| **Google Gemini** | оценка на храна/активност | `GEMINI_API_KEY`; извиква се в `app/api/analyze-*/route.ts` |
| **Google OAuth** | «Sign in with Google» | Конфигурира се в Supabase Auth providers; redirect към `/auth/callback` |

### Auth модел

- **Supabase session през cookies** (SSR). Няма собствен JWT.
- Три Supabase клиента:
  - `lib/supabase/client.ts` — browser (`createBrowserClient`), използва се навсякъде в client компонентите.
  - `lib/supabase/server.ts` — server components/route handlers (`createServerClient` + `next/headers` cookies). **Дефиниран, но реално почти не се ползва** — API routes създават клиента inline.
  - `middleware.ts` — свой `createServerClient` за guard логиката.
- **`middleware.ts`** пази всички рутове (matcher изключва статики, `manifest.json`, `icon*.png`,
  `apple-touch-icon.png`, `/api/`, `/auth/callback`):
  1. lognat user на `/login`|`/register` → redirect към `/`
  2. non-user навсякъде освен `/login`|`/register` → redirect към `/login`
  3. чете `user_profiles.onboarding_completed`; ако не е завършен и рутът не е `/onboarding` → redirect към `/onboarding`; ако е завършен и рутът е `/onboarding` → redirect към `/`
- API routes (`analyze-food`, `analyze-activity`) правят собствен `supabase.auth.getUser()` и връщат
  401 ако няма user. **`/api/*` е изключен от middleware**, така че тази вътрешна проверка е
  единствената защита на endpoint-ите.
- OAuth callback: `app/auth/callback/route.ts` разменя `code` за сесия, после redirect-ва към `/`
  с query params `cb_email` и `cb_provider=google`; клиентът (`app/(app)/page.tsx`) ги чете и
  ги записва в `localStorage` (`lib/lastUser.ts`) за «Continue as last user» на login екрана,
  след което ги маха от URL-а.

### Разминавания / TEMP настройки в конфигурацията

| Място | Проблем |
|---|---|
| `app/api/analyze-food/route.ts:23-29` | `export const config = { api: { bodyParser: { sizeLimit } } }` — това е **Pages Router** синтаксис и **няма ефект** в App Router route handlers. Реалният лимит се контролира от `maxDuration = 30` + client-side resize. Виж [раздел 7 #4](#7-известни-несъответствия-и-бъгове). `analyze-activity` няма този блок изобщо. |
| `app/api/analyze-food/route.ts:33` `MAX_BASE64_LENGTH` | базиран на 5 MB; коментарите в промпта и грешката казват «max 5MB», но клиентът праща resize-нат JPEG ≤1024px @ 0.85 quality, обикновено много под това. |
| `next.config.ts:11` | `images.remotePatterns` разрешава `https://**` (всеки хост). Широко отворено; `photo_url` така или иначе не се попълва никъде (виж #6). |
| `app/layout.tsx:70` | `<html lang="en" className="dark">` — темата е винаги `dark` (няма light палитра, нарочно). `lang` в SSR е `en`, но `LocaleProvider` го пренасочва към активния locale при mount (от 2026-09-07). |
| `.claude/settings.local.json` | Съдържа allow-правила и пътища от **друг проект** (`agency-site`) — наследени, не се отнасят за Calio. |

---

## 3. Структура на кода

```
app/
  layout.tsx                 Root layout: <html lang="en" dark>, metadata/PWA, Inter font, Toaster, Providers
  providers.tsx              React Query QueryClientProvider (staleTime 5m, gcTime 10m, retry 1)
  globals.css                Tailwind v4 entry + тема токени
  not-found.tsx              404 страница
  (auth)/
    login/page.tsx           Google OAuth + email/парола вход; "Continue as last user" от localStorage
    register/page.tsx        Google OAuth + email sign-up (детектира "already exists")
  (app)/
    layout.tsx               Client layout: prefetch ['user'] + ['profile'], BottomNav, LocaleProvider, max-w 430px
    page.tsx                 ДАШБОРД (главен екран): CalorieRing, MacroBar x3, WaterSection, food/activity списъци, date nav, sheets
    add/page.tsx             Добавяне на храна: табове text | photo | manual; AI анализ; favorites quick-add
    activity/page.tsx        Добавяне на активност: табове ai | manual; AI анализ; favorites quick-log
    history/page.tsx         История по месеци: агрегати food/activity/water по ден, навигация месеци
    settings/page.tsx        Профил (age/weight/height/gender/goal/activity_level), water goal, език, logout
    onboarding/page.tsx      Обвивка около OnboardingSteps; upsert на профила при завършване
  api/
    analyze-food/route.ts    POST: auth → валидира вход → 1 извикване на Gemini (validate+analyze) → zod parse
    analyze-activity/route.ts POST: същото за активност; връща error_type enum
  auth/callback/route.ts     GET: OAuth code exchange → redirect с cb_email/cb_provider

components/
  BottomNav.tsx              Долна навигация (Home/History/+/Settings) + action sheet за "+" (Food|Activity)
  CalorieRing.tsx            SVG пръстен: consumed / (target = base + burned); червено при over
  MacroBar.tsx               Прогрес бар за протеин/въглехидрати/мазнини
  FoodCard.tsx               Ред за храна в списъка; двойно-тап за delete; тап отваря detail sheet
  ActivityCard.tsx           Ред за активност; същия delete pattern
  FoodDetailSheet.tsx        Модал за храна: "Log again" (+ избор ден за минали дни), toggle favorite
  ActivityDetailSheet.tsx    Модал за активност: същото
  WaterSection.tsx           Вода: quick-add [200/250/350/500], прогрес, collapsible списък със записи
  DateNav.tsx                Стрелки ден напред/назад; "Днес"/"Вчера"/дата; спира на earliestDate и на днес
  ProfileSheet.tsx           Dropdown от аватара: Settings / History / Log out
  OnboardingSteps.tsx        4-стъпков онбординг: пол → мерки → цел → ниво активност; live calorie preview
  ui/                        shadcn-style примитиви (button, card, input, label, badge, avatar, progress,
                             separator, tabs, sonner). Част от тях може да не се ползват.

lib/
  types.ts                   Всички TS интерфейси (UserProfile, FoodEntry, ActivityEntry, WaterEntry,
                             Favorite*, *Analysis, DailyStats). ⚠️ include-ва daily_water_goal и (косвено) locale
  calculations.ts            BMR (Mifflin-St Jeor) → TDEE (activity multiplier) → daily target (goal adjust)
                             lose -500 / maintain 0 / gain +300. getDynamicTarget(base, burned) = base+burned
  i18n.ts                    translations.en / translations.bg (голям обект), type Locale = 'en'|'bg'
  locale-context.tsx         LocaleProvider: чете/пише user_profiles.locale; hook useLocale() → { locale, t, setLocale }
  lastUser.ts                localStorage helpers: calio_last_user, calio_has_logged_in
  supabase/client.ts         createBrowserClient
  supabase/server.ts         createServerClient (SSR) — дефиниран, слабо използван
  utils.ts                   cn() (clsx + tailwind-merge)

supabase/
  schema.sql                 Пълна начална схема (таблици, RLS, индекси, триггери, CHECK constraints)
  migrations/
    20260316135148_add_favorite_activities_unique.sql   UNIQUE(user_id, name) на favorite_activities
    20260317_add_water.sql                              daily_water_goal колона + water_entries таблица

middleware.ts                Auth + onboarding guard (виж раздел 2)
next.config.ts               withPWA wrapper + images.remotePatterns https://**  + turbopack:{}
```

### Конвенции, които агентът трябва да спазва

- **Route groups:** `(auth)` = неавтентикирани екрани, `(app)` = автентикирани (guard-нати от middleware).
- **Всички страници в `(app)` са `'use client'`.** Данните се теглят client-side с React Query
  директно от Supabase (не през API routes). Query keys навсякъде:
  `['user']`, `['profile', userId]`, `['food_entries', date, userId]`,
  `['activity_entries', date, userId]`, `['water_entries', date, userId]`,
  `['favorite_foods', userId]`, `['favorite_activities', userId]`,
  `['history', year, month, userId]`, `['earliest_date', userId]`, `['earliest_month', userId]`.
  ⚠️ Invalidation често е с **частичен** key (напр. `['food_entries', date]` без userId) —
  разчита на prefix-match на React Query.
- `['user']` и `['profile']` са със `staleTime: Infinity` — четат се веднъж и се прегенерират само
  при явен invalidate/clear (logout прави `queryClient.clear()`).
- **Дати:** навсякъде `new Date().toLocaleDateString('en-CA')` → `YYYY-MM-DD` низ. Сравнения на
  дати са лексикографски върху низа (`date < today`). DB колоната е `DATE`.
- **i18n:** всеки видим текст минава през `const { t } = useLocale()` и ключ в `lib/i18n.ts`.
  Нов текст → добави ключа И в `en`, И в `bg`. Не хардкодвай стрингове в JSX.
  Изключения, които вече са хардкоднати (за поправка): виж [раздел 7 #6](#7-известни-несъответствия-и-бъгове).
- **Цветове:** тъмна палитра с хекс литерали в className-и (`#0A0A0F` фон, `#111118` карти,
  `#1E1E2E` бордъри, `#F8FAFC` текст, `#64748B` muted, indigo/emerald/amber/red акценти).
  Няма CSS-променливи за тях — копирай стиловете от съседни компоненти.
- **Delete UX:** двойно кликване с 3s таймаут за потвърждение (`confirmRef` + `setTimeout`).
  Копиран в FoodCard, ActivityCard, WaterSection, Favorite*Row.
- **Favorite match:** по име, case-insensitive (`.ilike('name', ...)`), не по id.

---

## 4. Backend / API / данни

### Supabase Postgres схема

Дефиниция: `supabase/schema.sql` + 2 миграции. **RLS е ВКЛЮЧЕН на всички таблици**; политиката
навсякъде е `USING (auth.uid() = user_id)` за `FOR ALL` — т.е. потребител вижда/пипа само своите
редове. Затова client-side заявките директно към таблиците са безопасни.

#### `user_profiles`
| Поле | Тип | Бележки |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK→auth.users, UNIQUE, NOT NULL | ON DELETE CASCADE |
| `age` | INTEGER NOT NULL | CHECK 10–120 |
| `weight` | DECIMAL(5,2) NOT NULL | kg, CHECK 20–300 |
| `height` | DECIMAL(5,2) NOT NULL | cm, CHECK 100–250 |
| `gender` | TEXT NOT NULL | CHECK IN (`male`,`female`) |
| `goal` | TEXT NOT NULL | CHECK IN (`lose`,`maintain`,`gain`) |
| `activity_level` | TEXT NOT NULL | CHECK IN (`sedentary`,`lightly_active`,`moderately_active`,`very_active`,`extremely_active`) |
| `daily_calorie_target` | INTEGER NOT NULL | изчислено от `calculateFromProfile()` |
| `daily_water_goal` | INTEGER NOT NULL DEFAULT 2000 | добавено в `20260317_add_water.sql`; UI валидира 500–5000 |
| `onboarding_completed` | BOOLEAN DEFAULT false | чете се от middleware |
| `locale` | TEXT NOT NULL DEFAULT `'en'`, CHECK IN (`en`,`bg`) | ✅ добавена в `20260907094605_add_locale.sql`. Чете се/пише от `lib/locale-context.tsx`. (Преди 2026-09-07 колоната липсваше в прод и изборът на език не се пазеше.) |
| `created_at`, `updated_at` | TIMESTAMPTZ DEFAULT now() | `updated_at` авто чрез триггер |

#### `food_entries`
| Поле | Тип | Бележки |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK, NOT NULL | |
| `date` | DATE NOT NULL | ден на записа (YYYY-MM-DD) |
| `name` | TEXT NOT NULL | |
| `calories` | INTEGER NOT NULL | CHECK 0–10000 |
| `protein`,`carbs`,`fat` | DECIMAL(6,2) NULL | CHECK 0–1000 |
| `fiber` | DECIMAL(6,2) NULL | CHECK 0–500 |
| `quantity` | TEXT NULL | свободен текст («1 чиния», «200г») |
| `photo_url` | TEXT NULL | **никога не се записва** (виж #6) |
| `ai_confidence` | DECIMAL(3,2) NULL | 0–1; NULL за ръчни/favorite записи |
| `notes` | TEXT NULL | |
| `created_at`,`updated_at` | TIMESTAMPTZ | триггер за updated_at |

Индекс: `idx_food_entries_user_date (user_id, date)`.

#### `activity_entries`
| Поле | Тип | Бележки |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK, NOT NULL | |
| `date` | DATE NOT NULL | |
| `description` | TEXT NOT NULL | (не `name`!) |
| `calories_burned` | INTEGER NOT NULL | CHECK 0–10000 |
| `ai_confidence` | DECIMAL(3,2) NULL | |
| `notes` | TEXT NULL | |
| `created_at`,`updated_at` | TIMESTAMPTZ | триггер |

Индекс: `idx_activity_entries_user_date (user_id, date)`.

#### `water_entries` (миграция `20260317_add_water.sql`)
| Поле | Тип | Бележки |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK, NOT NULL | |
| `date` | DATE NOT NULL | |
| `amount_ml` | INTEGER NOT NULL | CHECK > 0 AND ≤ 5000 |
| `created_at` | TIMESTAMPTZ DEFAULT now() | няма `updated_at` |

Индекс: `idx_water_entries_user_date (user_id, date)`.

#### `favorite_foods`
`id`, `user_id` (FK, NOT NULL), `name` TEXT NOT NULL, `calories` INTEGER NOT NULL,
`protein`/`carbs`/`fat`/`fiber` DECIMAL(6,2) NULL, `use_count` INTEGER NOT NULL DEFAULT 1,
`created_at`. Индекс `idx_favorite_foods_user (user_id)`. **Няма UNIQUE constraint** —
дедупликацията е приложна (`.ilike('name', ...)` преди insert).

#### `favorite_activities`
`id`, `user_id` (FK, NOT NULL), `name` TEXT NOT NULL, `calories_burned` INTEGER NOT NULL,
`duration_minutes` INTEGER NULL, `use_count` INTEGER NOT NULL DEFAULT 1, `created_at`.
**`UNIQUE (user_id, name)`** — `favorite_activities_user_id_name_key` (в schema.sql + отделна миграция).
`lib/types.ts::FavoriteActivity` вече include-ва `duration_minutes: number | null` (от 2026-09-07).
⚠️ Стойността обаче никъде не се записва при insert и не се персистира в `activity_entries`
(там няма такава колона).

#### Триггери
`update_updated_at()` PL/pgSQL функция + `BEFORE UPDATE` триггери на `user_profiles`,
`food_entries`, `activity_entries` (не на water/favorites).

### API endpoints (Next.js route handlers)

Само два, и двата `POST`, и двата с еднаква структура:

#### `POST /api/analyze-food`
- **Body:** `{ text?, imageBase64?, mimeType?, description?, locale }` (JSON).
- **Auth:** inline Supabase server client → `getUser()`; 401 ако липсва.
- **Валидация:** `text` ≤ 500 знака; `imageBase64` низ ≤ `MAX_BASE64_LENGTH` (~5MB); поне едно от text/image.
- **Логика:** едно извикване на `gemini-2.5-flash`. Различен промпт за текст vs снимка.
  Промптът кара Gemini да: (1) реши дали е храна, (2) ако да — оцени калории/protein/carbs/fat/fiber/confidence,
  (3) ако не — дружелюбна причина. Снимковият промпт е много подробен за «цяла опаковка vs per-100g».
  Отговорът се иска на английски или български според `locale` (`bg` → Bulgarian, иначе English).
- **Парсване:** маха ```json ограждения, regex `\{[\s\S]*\}` за да хване JSON обекта, после `zod`.
  При провал връща `200` с `{ valid: false, reason: 'Could not parse AI response', result: null }`.
- **Timeout:** `Promise.race` с 25s + `maxDuration = 30`.
- **Отговор:** `{ valid: boolean, reason: string|null, result: {name, calories, protein, carbs, fat, fiber, confidence} | null }`.

#### `POST /api/analyze-activity`
- **Body:** `{ text, weightKg?, locale }`.
- `weightKg` се clamp-ва към 20–300, иначе fallback 70.
- Един промпт (само текст). Иска MET-базирана оценка спрямо теглото.
- Допълнително поле в отговора: `error_type: 'not_an_activity' | 'too_vague' | 'other' | null`
  (клиентът мапва към локализирани съобщения).
- **Отговор:** `{ valid, reason, error_type?, result: {activityName, caloriesBurned, durationMinutes, confidence} | null }`.

### Бизнес-правила, валидни за цялата система

- **Дневна калорийна цел е ДИНАМИЧНА:** `target = daily_calorie_target + Σ calories_burned за деня`.
  Т.е. логването на активност вдига целта, не намалява консумацията. Прилага се в
  `app/(app)/page.tsx:152-153` и `history/page.tsx`. Онбордингът съветва потребителя да избере
  по-ниско ниво на активност, ако ще логва тренировки ръчно.
- **Макро таргети** се извеждат от (динамичната) цел с фиксирани %: протеин 25% / въглехидрати 45% /
  мазнини 30%, при 4/4/9 kcal/g (`app/(app)/page.tsx:154-156`). Не се пазят в DB.
- **BMR:** Mifflin-St Jeor. Multipliers: sedentary 1.2 / lightly 1.375 / moderately 1.55 /
  very 1.725 / extremely 1.9. Goal adjust: lose −500 / maintain 0 / gain +300 (`lib/calculations.ts`).
- **`calories_burned` винаги се закръгля** (`Math.round`) преди запис.
- **`fiber` при ръчно въвеждане на храна е винаги `null`** (manual tab няма поле за фибри).
- **Favorite «use_count»** се инкрементира при всяко логване от favorites и при повторно
  добавяне в любими.

---

## 5. ⚠️ Закоментирано / временно изключено

Проектът **няма закоментирани блокове код, feature flags, TODO/FIXME маркери или «temporarily
disabled» секции.** Единствените `eslint-disable` са локални и легитимни:

| Файл:ред | Състояние | Защо | Как се «връща» |
|---|---|---|---|
| `app/(app)/layout.tsx:38` | `// eslint-disable-line react-hooks/exhaustive-deps` | Prefetch effect трябва да тече веднъж при mount; deps нарочно празни | Не се пипа освен ако prefetch логиката се променя |
| `app/(app)/add/page.tsx:488` | `{/* eslint-disable-next-line @next/next/no-img-element */}` | Локален preview на снимка през `<img>` (blob URL), не иска `next/image` | Ако мине на `next/image` — махни коментара |
| `components/FoodDetailSheet.tsx:68`, `ActivityDetailSheet.tsx:47` | `// eslint-disable-line react-hooks/exhaustive-deps` | Effect зависи само от `entry?.id`, не от целия `entry`/`supabase` | Без промяна |

**Функционалности, изключени в конфигурация (не в код):**

| Какво | Къде | Статус |
|---|---|---|
| PWA service worker | `next.config.ts:6` `disable: process.env.NODE_ENV === 'development'` | Нарочно изключен в dev; активен в production build. Това е стандартно, не е бъг. |

---

## 6. Състояние на функционалностите

### ✅ Работи (предполага се в production)

- **Auth:** Google OAuth + email/парола вход и регистрация (`(auth)/login`, `(auth)/register`,
  `auth/callback/route.ts`). Детекция на «вече съществуващ email» при sign-up.
- **«Continue as last user»** на login екрана от `localStorage` (`lib/lastUser.ts`).
- **Middleware guard** — auth + onboarding redirect flow (`middleware.ts`).
- **Онбординг** 4 стъпки с live calorie preview (`onboarding/page.tsx`, `OnboardingSteps.tsx`).
- **Дашборд** (`app/(app)/page.tsx`): calorie ring, 3 макро-бара, water секция, списъци храна/активност,
  навигация по дни назад до най-ранния запис, аватар dropdown.
- **Добавяне на храна** (`add/page.tsx`): три таба — **text** (AI), **photo** (AI, client resize
  до 1024px), **manual** (име + калории + опц. макроси/количество/бележки). Favorites quick-add.
  Save в дневника + toggle «любимо».
- **Добавяне на активност** (`activity/page.tsx`): таб **ai** (текстово описание + тегло от профила)
  и таб **manual**. Favorites quick-log. Локализирани грешки по `error_type`.
- **Gemini интеграция** — двата route-а, single-call validate+analyze, zod парсване, graceful
  fallback при невалиден JSON, 25s timeout.
- **Detail sheets** (Food/Activity): «Log again» за текущия ден; за минал ден — избор
  «за този ден» / «за днес»; toggle любимо.
- **Вода** (`WaterSection.tsx`): quick-add 200/250/350/500 ml, прогрес към `daily_water_goal`,
  collapsible списък със записи + delete.
- **История** (`history/page.tsx`): месечна навигация (спира на текущия месец и на най-ранния
  с данни), агрегати калории/изгорени/вода по ден, кумулативен месечен излишък/дефицит, тап
  върху ден → дашборд за тази дата.
- **Настройки** (`settings/page.tsx`): редакция на профил с live преизчисляване на целта,
  water goal (500–5000), превключвател EN/BG, logout.
- **i18n** EN/BG (`lib/i18n.ts`, `lib/locale-context.tsx`).
- **PWA манифест + икони** (`public/manifest.json`, `public/icon-*.png`), метаданни/OG в `app/layout.tsx`.

### 🟡 Частично / крехко / условно

- **`export const config` body size limit** — премахнат от `analyze-food` на 2026-09-07 (беше
  no-op в App Router). Реалната защита срещу големи заявки е client resize + `MAX_BASE64_LENGTH`.
- **`photo_url`** — колоната съществува, `FoodEntry` типът я има, но **никъде не се качва снимка
  и не се записва URL**. Снимката отива само към Gemini като base64 и се забравя.
- **`components/ui/*`** — генерирани shadcn примитиви; част (tabs, avatar, badge, progress,
  separator, card) може да не се използват от текущите екрани. Провери с grep преди да разчиташ.
- **`lib/supabase/server.ts`** — дефиниран, но API routes и middleware правят свои inline клиенти;
  почти m-ъртъв код.

### 🔴 Липсва / бъдеща работа

- **Няма тестове** (никакъв test runner, никакви `*.test.*` / `*.spec.*` файлове; `/coverage` в gitignore «за всеки случай»).
- **Няма CI/CD** конфигурация в repo-то (нито `.github/`, нито `vercel.json`).
- **Няма редакция на съществуващ запис** — само create + delete. «Log again» дублира записа.
- **Няма изтриване на акаунт / export на данни** от UI (само `ON DELETE CASCADE` на ниво DB).
- **Няма rate limiting** на AI endpoint-ите (освен per-request auth и timeout).
- **Няма offline режим** отвъд това, което next-pwa кешира по подразбиране; заявките към Supabase
  изискват мрежа.
- **Няма reset парола** flow.
- **`duration_minutes`** на favorite activities и `durationMinutes` от AI отговора **не се
  персистират** в `activity_entries` (няма такава колона там).

---

## 7. Известни несъответствия и бъгове

> Няма стари analysis/ANALYSIS файлове в repo-то, с които да се сверява. Списъкът е от текущия код.

1. ✅ **ПОПРАВЕНО 2026-09-07 — `user_profiles.locale` колона липсваше.**
   Потвърдено от прод схемата, че я нямаше. Добавена с миграция
   `20260907094605_add_locale.sql` (`TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en','bg'))`),
   синхронизиран `schema.sql`, добавен `locale` в `UserProfile` типа. **Миграцията трябва да се
   пусне ръчно в прод.**
   > Странично наблюдение: прод схемата на `user_profiles` НЯМА и CHECK constraint-ите за
   > `age`/`weight`/`height` от `schema.sql:136-142`. `schema.sql` е разминат с реалността на
   > няколко места — не разчитай сляпо на него, сверявай с реалната база.

2. ✅ **ПОПРАВЕНО 2026-09-07 — `FavoriteActivity` тип.**
   Добавено `duration_minutes: number | null` в `lib/types.ts`. Стойността все още не се записва
   при insert и няма колона за нея в `activity_entries` — това е отделна задача (виж раздел 6 🔴).

3. **Частичен query-key invalidation.**
   Напр. `queryClient.invalidateQueries({ queryKey: ['food_entries', date] })` без `userId`
   (напр. `app/(app)/page.tsx:129`, `add/page.tsx:327`). Работи заради prefix-match на React
   Query, но е чупливо — ако някой добави сегмент между `date` и `userId`, invalidation-ът ще
   спре да хваща. `add/page.tsx` дори invalidatва само `['food_entries']` (целия prefix).

4. ✅ **ПОПРАВЕНО 2026-09-07 — no-op `export const config`** премахнат от `analyze-food`.
   `maxDuration = 30` остава. `analyze-activity` никога не е имал такъв блок.

5. **In-memory `setTimeout` timeout в serverless.**
   `Promise.race([model.generateContent(...), timeoutPromise])` с 25s. На Vercel, ако функцията
   се killне на `maxDuration`, timeout-ът не помага; при бавен Gemini клиентът получава 500.
   Не е race condition, но е крехко под натоварване / cold start.

6. **Хардкоднати стрингове, които заобикалят i18n:**
   - `settings/page.tsx:116,385` — `'Water goal must be between 500 and 5000 ml'` (има ключ
     `t.invalidAmount` / `t.invalidWaterAmount`, но не се ползва тук).
   - `settings/page.tsx:223` — `<h2>Profile</h2>`.
   - `OnboardingSteps.tsx` — «Back», «We'll use these to calculate…», «Stay at current weight»,
     «500 kcal deficit per day», «300 kcal surplus per day», «Choose your typical weekly activity
     level», info hint параграфа — всички твърд английски.
   - `ProfileSheet.tsx:77,84,94` — «Settings», «History», «Log out» твърд английски (менюто от аватара).
   - `not-found.tsx` — цялата 404 страница на английски.
   - `login/page.tsx` / `register/page.tsx` — почти изцяло твърд английски, макар `lib/i18n.ts`
     да има auth ключове.

7. ✅ **ПОПРАВЕНО 2026-09-07 — `formatTime` в detail sheets** сега ползва `t.dateLocale`
   (`FoodDetailSheet.tsx`, `ActivityDetailSheet.tsx`) вместо закованото `'bg-BG'`.

8. ✅ **ПОПРАВЕНО 2026-09-07 — `<html lang>`.** `LocaleProvider` вече синхронизира
   `document.documentElement.lang` с активния locale (`lib/locale-context.tsx`). Server-ът
   пак рендерира `lang="en"` в `app/layout.tsx` (root layout е server компонент, locale-ът е
   client state) — коригира се при mount на provider-а. Ефектът важи само под `(app)` layout-а;
   `(auth)` страниците са английски така или иначе (TASK-3).

9. **Онбординг: race при първи `select('locale')`.**
   `LocaleProvider` mount-ва се едновременно с onboarding; ако профил още няма ред, `.single()`
   връща грешка (игнорира се). Безвредно, но шумно в конзолата.

10. **`middleware.ts` прави DB заявка (`user_profiles.onboarding_completed`) на всяка навигация.**
    Не е кеширано — по едно четене на профил на request към guard-нат рут. Приемливо за мащаба,
    но е N+1-ишко при много навигации.

11. **`register` детекция на съществуващ email разчита на низов match** (`error.message.includes('already')`)
    и на Supabase quirk (`data.user.identities.length === 0`). Крехко спрямо промени в Supabase.

---

## 8. Deploy / билд

### Команди (`package.json`)

| Команда | Действие |
|---|---|
| `npm run dev` | `next dev` (Turbopack). PWA изключен. localhost:3000 |
| `npm run build` | `next build`. Генерира PWA service worker + workbox в `public/` |
| `npm run start` | `next start` (production сервър след build) |
| `npm run lint` | `eslint` (flat config, `eslint-config-next` core-web-vitals + typescript) |

Type-check: `npx tsc --noEmit` (в allow-листа на `.claude/settings.local.json`).

### Билд / хостинг

- **Целева платформа: Vercel** (README е дефолтният create-next-app; `.gitignore` има `.vercel`).
  Няма `vercel.json` — конфигурацията е имплицитна (App Router auto-detect).
- API routes стават serverless functions. `analyze-food` има `maxDuration = 30`.
- **PWA артефакти** (`sw.js`, `workbox-*.js`) се генерират в `public/` при `build` и **не са в git**
  (в момента ги няма в `public/`, значи няма пресен production build локално).
- Env променливите се задават в хостинг dashboard-а (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`).
- **Supabase миграции** не се пускат от CI — прилагат се ръчно (Supabase dashboard / CLI).
  Няма `supabase/config.toml`, така че `supabase` CLI линк към проекта не е коммитнат.

### CI/CD

Няма (`.github/` отсъства). Deploy се предполага през Vercel Git integration (push → build → deploy).

---

## 9. Правила за работа по проекта (за AI агенти)

1. **Не комитвай `.env.local`** и не поставяй секрети в код/докове. Ако видиш изтекъл ключ — кажи.
2. **Всеки нов видим текст минава през `lib/i18n.ts`** — добави ключа И в `en`, И в `bg`, ползвай
   `const { t } = useLocale()`. Не хардкодвай стрингове в JSX.
3. **Схема на базата:** при промяна на таблица/колона — нов файл в `supabase/migrations/`
   с timestamp префикс (`YYYYMMDDHHMMSS_описание.sql`) **и** синхронизирай `supabase/schema.sql`.
   Използвай `IF NOT EXISTS` / `IF EXISTS`. Не разчитай, че миграциите се пускат автоматично —
   отбележи в PR-а, че трябва ръчно прилагане.
4. **RLS:** всяка нова таблица с потребителски данни трябва да има `ENABLE ROW LEVEL SECURITY` +
   политика `USING (auth.uid() = user_id)`. Иначе client-side заявките ще течат чужди данни.
5. **React Query keys:** спазвай съществуващата схема (раздел 3). Ако добавяш сегмент, провери
   всички `invalidateQueries` с частичен key да продължат да хващат.
6. **Дати:** винаги `toLocaleDateString('en-CA')` за `YYYY-MM-DD`. Не въвеждай `Date` обекти в
   query keys или DB заявки.
7. **API routes:** запази structure-а — auth check пръв, после валидация на входа, после Gemini,
   после zod parse с graceful fallback (връщай `200` + `{valid:false}` при parse провал, не 500).
8. **Не добавяй light тема** без изрично искане — целият UI е dark с хекс литерали.
9. **Не пипай `middleware.ts` guard логиката** без потвърждение — тя контролира целия достъп
   и onboarding flow.
10. **Изгорени калории и `caloriesBurned`** — винаги `Math.round` преди запис в `activity_entries`.
11. **Актуализирай [раздел 10](#10-дневник-на-промените)** при всяка значима промяна и обнови
    датата в header-а.
12. Преди да разчиташ на компонент от `components/ui/` — `grep` дали изобщо се внася някъде.

---

## 10. Дневник на промените

| Дата | Промяна | Файлове |
|---|---|---|
| 2026-09-07 | Създаване на `PROJECT_CONTEXT.md` — първоначален пълен анализ на проекта (стек, топология, схема, API, състояние на функционалностите, известни бъгове). | `PROJECT_CONTEXT.md` |
| 2026-09-07 | **Fix #1:** добавена липсваща `user_profiles.locale` колона (миграция + schema.sql + тип) → изборът на език вече се персистира. **Миграцията трябва да се пусне ръчно в прод.** | `supabase/migrations/20260907094605_add_locale.sql`, `supabase/schema.sql`, `lib/types.ts` |
| 2026-09-07 | **Fix #2:** `FavoriteActivity` тип получи `duration_minutes: number \| null` (изравняване със схемата). | `lib/types.ts` |
| 2026-09-07 | **Fix #4:** премахнат no-op `export const config` (Pages Router bodyParser синтаксис) от `analyze-food`. | `app/api/analyze-food/route.ts` |
| 2026-09-07 | **Fix #7:** `formatTime` в двата detail sheet-а ползва `t.dateLocale` вместо закованото `'bg-BG'`. | `components/FoodDetailSheet.tsx`, `components/ActivityDetailSheet.tsx` |
| 2026-09-07 | Добавен раздел 11 «Backlog / отворени задачи» (TASK-1 = schema.sql vs прод разминаване; TASK-2..5). | `PROJECT_CONTEXT.md` |
| 2026-09-07 | **Fix #8:** `LocaleProvider` синхронизира `<html lang>` с активния locale през effect. | `lib/locale-context.tsx` |

<!-- Формат на нов ред: | YYYY-MM-DD | какво се промени и защо | засегнати файлове | -->

---

## 11. Backlog / отворени задачи

Подредени по приоритет. Отметни (✅ + дата) при изпълнение и добави ред в дневника.

### TASK-1 · `supabase/schema.sql` е разминат с реалната прод база
**Приоритет:** среден · **Тип:** tech-debt / точност на документацията

`schema.sql` описва обекти, които реалната прод база **няма**:
- CHECK constraint-ите за `user_profiles.age` (10–120), `weight` (20–300), `height` (100–250)
  от `schema.sql:137-143` — липсват в прод (потвърдено от `CREATE TABLE` дъмп на 2026-09-07).
- Възможно е и други разминавания (CHECK-овете за food/activity калории/макроси, триггерите) —
  не е сверявано обект по обект.

**Защо е проблем:** агент/разработчик, който чете `schema.sql`, приема че тези защити ги има на
DB ниво и може да пропусне клиентска валидация; или пише миграция, която конфликтва.

**Как да се затвори:**
1. Извади реалната схема: `pg_dump --schema-only --no-owner --no-privileges` (или Supabase
   dashboard → Database → Schema visualizer / SQL `pg_dump`).
2. Сравни обект по обект с `supabase/schema.sql`.
3. Или (а) допиши липсващите constraint-и с idempotent миграция и остави `schema.sql` като
   истина, или (б) пренапиши `schema.sql` да отразява точно прода и маркирай кои constraint-и
   са само «желани, не приложени».
4. Реши политиката: `schema.sql` = канонична цел, или = огледало на прода. Запиши я в раздел 9.

**Внимание:** добавянето на CHECK на съществуваща таблица гърми, ако има редове извън диапазона —
първо `SELECT` за нарушители, чак после `ADD CONSTRAINT`.

### TASK-2 · `duration_minutes` от AI не се персистира
**Приоритет:** нисък · **Тип:** липсваща функционалност

`activity_entries` няма `duration_minutes` колона. AI връща `durationMinutes`, показва се в UI,
но не се записва. `favorite_activities.duration_minutes` съществува, но също не се попълва при insert.
За да работи: миграция + добавяне на полето в `activity_entries` insert-ите (`activity/page.tsx`,
`ActivityDetailSheet.tsx`) + `ActivityEntry` тип.

### TASK-3 · i18n: хардкоднати английски стрингове
**Приоритет:** нисък-среден · **Тип:** i18n · виж [раздел 7 #6](#7-известни-несъответствия-и-бъгове)

login/register, `not-found.tsx`, `ProfileSheet.tsx` меню, целия `OnboardingSteps.tsx`, water
валидации в `settings/page.tsx`. Изисква нови ключове в `en` + `bg`. Собствен PR.

### TASK-4 · Частичен React Query invalidation
**Приоритет:** нисък · виж [раздел 7 #3](#7-известни-несъответствия-и-бъгове). Кръпка, не бъг.

### TASK-5 · middleware DB заявка на всяка навигация
**Приоритет:** нисък · виж [раздел 7 #10](#7-известни-несъответствия-и-бъгове). Оптимизация.
