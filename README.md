# WordSnap — Production Ready

Система для изучения слов через контекст. Включает в себя браузерное расширение, бэкенд на Node.js и интеграцию с Firebase.

## Структура проекта

- `wordsnap-extension/` — Исходный код расширения.
- `server/` — Бэкенд API (Node.js + Express).
- `download.html` — Лендинг для скачивания.

## Быстрый старт (Backend)

### 1. Настройка переменных окружения
Перейдите в папку `server/` и создайте файл `.env`, скопировав содержимое из `.env.example`.

**Где взять ключи:**
- **DEEPL_API_KEY**: [DeepL API Free](https://www.deepl.com/pro-api) (нужна карта, но есть бесплатный лимит 500к символов).
- **FIREBASE**: 
  1. Создайте проект в [Firebase Console](https://console.firebase.google.com/).
  2. В настройках проекта -> Service Accounts -> Generate new private key.
  3. Вставьте значения из JSON в соответствующие поля `.env`.

### 2. Запуск локально
```bash
cd server
npm install
npm run dev
```

### 3. Запуск через Docker
```bash
docker-compose up --build
```

## Установка расширения

1. Откройте `chrome://extensions/`.
2. Включите "Developer mode" (Режим разработчика).
3. Нажмите "Load unpacked" (Загрузить распакованное расширение).
4. Выберите папку `wordsnap-extension/`.

**Важно:** По умолчанию расширение обращается к `http://localhost:3000`. При деплое бэкенда измените `BACKEND_URL` в `background.js`.

## Синхронизация (Firebase)

Для работы облачной синхронизации:
1. Скопируйте `firebase.config.example` в `wordsnap-extension/firebase.config.js`.
2. Заполните данными из Firebase Console (Web App configuration).
3. В `popup.html` подключите конфиг (в данной версии архитектурные заглушки позволяют тестировать UI без реальных ключей).

## Деплой

### Render / Railway
Бэкенд готов к деплою. Просто подключите репозиторий и настройте Environment Variables в панели управления сервисом.

## Платформы

### 1. Расширение (Extension)
Интерфейс входа в расширении находится в `popup.html` (кнопка профиля). Логика заглушек описана в `auth.js`.

### 2. Веб-платформа (Web App)
Файл `wordsnap_app.html` теперь содержит слой аутентификации. При открытии страницы пользователь видит экран входа. Доступ к основному интерфейсу открывается только после успешной (или имитированной) авторизации. Данные о сессии сохраняются в `localStorage`.

---
**WordSnap** — Your words, your world.
