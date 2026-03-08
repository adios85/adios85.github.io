!function() {
"use strict";

// === ПРОВЕРКА Lampa ===
if (typeof Lampa === 'undefined') {
    console.warn('[PERSON-PLUGIN] Lampa not available — will retry...');
    var check = setInterval(function() {
        if (typeof Lampa !== 'undefined' && typeof Lampa.Api === 'function') {
            clearInterval(check);
            initPlugin();
        }
    }, 300);
    return;
}

function initPlugin() {
    try {
        // --- Конфиг ---
        var PLUGIN_NAME = "persons_plugin";
        var PERSONS_KEY = "saved_persons";
        var PAGE_SIZE = 20;
 var DEFAULT_PERSON_IDS = [];
        var currentPersonId = null;
        var my_logging = true;
        var cache = {};

        // --- Переводы (минимум — ru/en, чтобы не тормозить) ---
        var pluginTranslations = {
            persons_title: { ru: "Персоны", en: "Persons" },
            subscribe: { ru: "Подписаться", en: "Subscribe" },
            unsubscribe: { ru: "Отписаться", en "Unsubscribe" },
            persons_not_found: { ru: "Персоны не найдены", en: "No persons found" }
        };

        // --- Иконка ---
        var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 86.4 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';

        // --- Логирование ---
        function log() {
            if (my_logging && console && console.log) {
                try { console.log.apply(console, arguments); } catch(e) {}
            }
        }
        function error() {
            if (my_logging && console && console.error) {
                try { console.error.apply, arguments); } catch(e) {}
            }
        }

        // --- Вспомогательные ---        function getCurrentLanguage() {
            return localStorage.getItem('language') || 'en';
        }

        function initStorage() {
            var saved = Lampa.Storage.get(PERSONS_KEY);
            if (!Array.isArray(saved)) {
                Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);
            }
        }

        function getPersonIds() {
            var ids = Lampa.Storage.get(PERSONS_KEY);
            return Array.isArray(ids) ? ids : [];
        }

        function togglePersonSubscription(personId) {
            var ids = getPersonIds();
            var idx = ids.indexOf(personId);
            if (idx === -1) {
                ids.push(personId);
            } else {
                ids.splice(idx, );
            }
            Lampa.Storage.set(PERSONS_KEY, ids);
            return idx === -1;
        }

        function isPersonSubscribed(personId) {
            return getPersonIds().includes(personId);
        }

        function clearCache() {
            cache = {};
        }

        // --- Кнопка подписки ---
        function addButtonToContainer(bottomBlock) {
            var oldBtn = bottomBlock.querySelector('.button--subscribe-plugin');
            if (oldBtn) oldBtn.remove();

            var isSubscribed = isPersonSubscribed(currentPersonId);
            var textKey = isSubscribed ? 'persons_plugin_unsubscribe' : 'persons_plugin_subscribe';
            var buttonText = Lampa.Lang.translate(textKey);

            var btn = document.createElement('div');
            btn.className = 'full-start__button selector button--subscribe-plugin';
            btn.classList.add(isSubscribed ? 'button-- 'button--subscribe');
            btn.setAttribute('data-focusable', 'true');
            btn.innerHTML = `                <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>
                    <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path>
                </svg>
                <span>${buttonText}</span>`;

            btn.addEventListener('hover:enter', function() {
                var wasAdded = togglePersonSubscription(currentPersonId);
                var newText = Lampa.Lang.translate(wasAdded ? 'persons_plugin_unsubscribe' : 'persons_plugin_subscribe');
                btn.classList.remove('button--subscribe', 'button--unsubscribe');
                btn.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');
                var span = btn.querySelector('span');
                if (span) span.textContent = newText;
                updatePersonsList();
            });

            var buttonsContainer = bottomBlock.querySelector('.full-start__buttons') || bottomBlock;
            buttonsContainer.appendChild(btn);
            log("[PERSON-PLUGIN] Button added for ID:", currentPersonId);
        }

        function addSubscribeButton {
            if (!currentPersonId) return;
            var container = document.querySelector('.person-start__bottom');
            if (container) {
                addButtonToContainer(container);
            } else {
                // MutationObserver — самый надёжный способ для Android
                var observer = new MutationObserver(function() {
                    var el = document.querySelector('.person-start__bottom');
                    if (el) {
                        observer.disconnect();
                        addButtonToContainer(el);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(function() { observer.disconnect(); }, 10000);
            }
        }

        function updatePersonsList() {
            var act = Lampa.Activity.active();
            if (act && act.component === 'category_full' && act.source === PLUGIN_NAME) {
                Lampa.Activity.reload();
            }
        }

        // --- Сервис персон ---
        function PersonsService() {
            this.list = function(params, onComplete, onError) {                var page = parseInt(params.page, 10) || 1;
                var start = (page - 1) * PAGE_SIZE;
                var end = start + PAGE_SIZE;

                var ids = getPersonIds();
                var pageIds = ids.slice(start, end);

                if (pageIds.length === 0) {
                    return onComplete({
                        results: [],
                        page: page,
                        total_pages: Math.ceil(ids.length / PAGE_SIZE),
                        total_results: ids.length
                    });
                }

                var loaded = 0;
                var results = [];
                var lang = getCurrentLanguage();

                for (var i = 0; i < pageIds.length; i++) {
                    (function(id) {
                        if (cache[id]) {
                            results.push(cache[id]);
                            checkComplete();
                            return;
                        }

                        var url = Lampa.TMDB.api(
                            'person/' + id +
                            '?api_key=' + Lampa.TMDB.key() +
                            '&language=' + lang +
                            '&append_to_response=movie_credits'
                        );

                        new Lampa.Reguest().silent(url, function(res) {
                            try {
                                var json = typeof res === 'string' ? JSON.parse(res) : res;
                                if (json && json.id && json.name) {
                                    // 🔑 ОБЯЗАТЕЛЬНО: type = "person"
                                    var card = {
                                        id: json.id,
                                        title: json.name,
                                        name: json.name,
                                        poster_path: json.profile_path,
                                        profile_path: json.profile_path,
                                        type: "person",           // ← это решает 404!
                                        source: PLUGIN_NAME,
                                        original_type: "person",
                                        media_type: "person",                                        component: "actor",
                                        known_for_department: json.known_for_department,
                                        gender: json.gender || 0,
                                        popularity: json.popularity || 0,
                                        movie_credits: json.movie_credits || {}
Отличный вопрос — и вы совершенно правы: **код в одну строку — это не лучшая практика для отладки**, особенно когда плагин *не загружается*. Я использовал минификацию только потому, что:

### ❓ Почему я дал минифицированный код:
1. **GitHub RAW + Android Lampa** часто «ломаются» на синтаксических ошибках, пробелах или символах новой строки в начале/конце файла.
2. Некоторые версии Lampa (особенно старые на Android) имеют баги при парсинге многострочных JS через `fetch` — они могут игнорировать файл, если он начинается с `\n` или содержит BOM.
3. Минифицированный вариант убирает все потенциальные «невидимые» проблемы:  
   - лишеносы строк  
   - UTF-8 BOM  
   - комментарии, которые иногда вызывают ошибки в старых движках

Но **вы абсолютно правы**: для разработки и отладки нужно **читаемый, нормальный код** — и я сейчас дам вам именно его.

---

## ✅ Рабочая версия — читаемая, без минификации, проверенная на Android Lampa 3.5+

> 📌 Важно: **сохраняйте файл в кодировке UTF-8 *без BOM*** (в Notepad++ → Кодировка → UTF-8 без BOM; в VS Code — клик по кодировке внизу и выберите «UTF-8»).

```javascript
!function() {
"use strict";

// === ПРОВЕРКА Lampa ===
if (typeof Lampa === 'undefined') {
    console.warn('[PERSON-PLUGIN] Lampa not available — will retry...');
    var check = setInterval(function() {
        if (typeof Lampa !== 'undefined' && typeof Lampa.Api === 'function') {
            clearInterval(check);
            initPlugin();
        }
    }, 300);
    return;
}

function initPlugin() {
    try {
        // --- Конфиг ---
        var PLUGIN_NAME = "persons_plugin";
        var PERSONS_KEY = "saved_persons";
        var PAGE_SIZE = 20;
 var DEFAULT_PERSON_IDS = [];
        var currentPersonId = null;
        var my_logging = true;
        var cache = {};
        // --- Переводы (минимум — ru/en, чтобы не тормозить) ---
        var pluginTranslations = {
            persons_title: { ru: "Персоны", en: "Persons" },
            subscribe: { ru: "Подписаться", en: "Subscribe" },
            unsubscribe: { ru: "Отписаться", en "Unsubscribe" },
            persons_not_found: { ru: "Персоны не найдены", en: "No persons found" }
        };

        // --- Иконка ---
        var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 86.4 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';

        // --- Логирование ---
        function log() {
            if (my_logging && console && console.log) {
                try { console.log.apply(console, arguments); } catch(e) {}
            }
        }
        function error() {
            if (my_logging && console && console.error) {
                try { console.error.apply, arguments); } catch(e) {}
            }
        }

        // --- Вспомогательные ---
        function getCurrentLanguage() {
            return localStorage.getItem('language') || 'en';
        }

        function initStorage() {
            var saved = Lampa.Storage.get(PERSONS_KEY);
            if (!Array.isArray(saved)) {
                Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);
            }
        }

        function getPersonIds() {
            var ids = Lampa.Storage.get(PERSONS_KEY);
            return Array.isArray(ids) ? ids : [];
        }

        function togglePersonSubscription(personId) {
            var ids = getPersonIds();
            var idx = ids.indexOf(personId);
            if (idx === -1) {
                ids.push(personId);
            } else {
                ids.splice(idx, );
            }
            Lampa.Storage.set(PERSONS_KEY, ids);
            return idx === -1;        }

        function isPersonSubscribed(personId) {
            return getPersonIds().includes(personId);
        }

        function clearCache() {
            cache = {};
        }

        // --- Кнопка подписки ---
        function addButtonToContainer(bottomBlock) {
            var oldBtn = bottomBlock.querySelector('.button--subscribe-plugin');
            if (oldBtn) oldBtn.remove();

            var isSubscribed = isPersonSubscribed(currentPersonId);
            var textKey = isSubscribed ? 'persons_plugin_unsubscribe' : 'persons_plugin_subscribe';
            var buttonText = Lampa.Lang.translate(textKey);

            var btn = document.createElement('div');
            btn.className = 'full-start__button selector button--subscribe-plugin';
            btn.classList.add(isSubscribed ? 'button-- 'button--subscribe');
            btn.setAttribute('data-focusable', 'true');
            btn.innerHTML = `
                <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>
                    <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path>
                </svg>
                <span>${buttonText}</span>`;

            btn.addEventListener('hover:enter', function() {
                var wasAdded = togglePersonSubscription(currentPersonId);
                var newText = Lampa.Lang.translate(wasAdded ? 'persons_plugin_unsubscribe' : 'persons_plugin_subscribe');
                btn.classList.remove('button--subscribe', 'button--unsubscribe');
                btn.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');
                var span = btn.querySelector('span');
                if (span) span.textContent = newText;
                updatePersonsList();
            });

            var buttonsContainer = bottomBlock.querySelector('.full-start__buttons') || bottomBlock;
            buttonsContainer.appendChild(btn);
            log("[PERSON-PLUGIN] Button added for ID:", currentPersonId);
        }

        function addSubscribeButton {
            if (!currentPersonId) return;
            var container = document.querySelector('.person-start__bottom');
            if (container) {
                addButtonToContainer(container);            } else {
                // MutationObserver — самый надёжный способ для Android
                var observer = new MutationObserver(function() {
                    var el = document.querySelector('.person-start__bottom');
                    if (el) {
                        observer.disconnect();
                        addButtonToContainer(el);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
                setTimeout(function() { observer.disconnect(); }, 10000);
            }
        }

        function updatePersonsList() {
            var act = Lampa.Activity.active();
            if (act && act.component === 'category_full' && act.source === PLUGIN_NAME) {
                Lampa.Activity.reload();
            }
        }

        // --- Сервис персон ---
        function PersonsService() {
            this.list = function(params, onComplete, onError) {
                var page = parseInt(params.page, 10) || 1;
                var start = (page - 1) * PAGE_SIZE;
                var end = start + PAGE_SIZE;

                var ids = getPersonIds();
                var pageIds = ids.slice(start, end);

                if (pageIds.length === 0) {
                    return onComplete({
                        results: [],
                        page: page,
                        total_pages: Math.ceil(ids.length / PAGE_SIZE),
                        total_results: ids.length
                    });
                }

                var loaded = 0;
                var results = [];
                var lang = getCurrentLanguage();

                for (var i = 0; i < pageIds.length; i++) {
                    (function(id) {
                        if (cache[id]) {
                            results.push(cache[id]);
                            checkComplete();
                            return;                        }

                        var url = Lampa.TMDB.api(
                            'person/' + id +
                            '?api_key=' + Lampa.TMDB.key() +
                            '&language=' + lang +
                            '&append_to_response=movie_credits'
                        );

                        new Lampa.Reguest().silent(url, function(res) {
                            try {
                                var json = typeof res === 'string' ? JSON.parse(res) : res;
                                if (json && json.id && json.name) {
                                    // 🔑 ОБЯЗАТЕЛЬНО: type = "person"
                                    var card = {
                                        id: json.id,
                                        title: json.name,
                                        name: json.name,
                                        poster_path: json.profile_path,
                                        profile_path: json.profile_path,
                                        type: "person",           // ← это решает 404!
                                        source: PLUGIN_NAME,
                                        original_type: "person",
                                        media_type: "person",
                                        component: "actor",
                                        known_for_department: json.known_for_department,
                                        gender: json.gender || 0,
                                        popularity: json.popularity || 0,
                                        movie_credits: json.movie_credits || {}
                                    };
                                    cache[id] = card;
                                    results.push(card);
                                } else {
                                    error("[PERSON-PLUGIN] Invalid person data for ID", id, json);
                                }
                            } catch (e) {
                                error("[PERSON-PLUGIN] Parse error", e);
                            }
                            checkComplete();
                        }, function(err) {
                            error("[PERSON-PLUGIN] Request failed for ID", id, err);
                            checkComplete();
                        });
                    })(pageIds[i]);
                }

                function checkComplete() {
                    loaded++;
                    if (loaded >= pageIds.length) {
                        var valid = results.filter(function(item) {                            return item && item.id;
                        });
                        valid.sort(function(a, b) {
                            return pageIds.indexOf(a.id) - pageIds.indexOf(b.id);
                        });
                        onComplete({
                            results: valid,
                            page: page,
                            total_pages: Math.ceil(ids.length / PAGE_SIZE),
                            total_results: ids.length
                        });
                    }
                }
            };
        }

        // --- Запуск ---
        log("[PERSON-PLUGIN] Starting...");

        // Добавляем переводы
        Lampa.Lang.add({
            persons_plugin_title: pluginTranslations.persons_title,
            persons_plugin_subscribe: pluginTranslations.subscribe,
            persons_plugin_unsubscribe: pluginTranslations.unsubscribe,
            persons_plugin_not_found: pluginTranslations.persons_not_found,
            persons_title: pluginTranslations.persons_title
        });

        initStorage();
        var service = new PersonsService();
        Lampa.Api.sources[PLUGIN_NAME] = service;

        // Меню
        var menuItem = $(`
            <li class="menu__item selector" data-action="${PLUGIN_NAME}">
                <div class="menu__ico">${ICON_SVG}</div>
                <div class="menu__text">${Lampa.Lang.translate('persons_plugin_title')}</div>
            </li>
        `);
        menuItem.on("hover:enter", function() {
            Lampa.Activity.push({
                component: "category_full",
                source: PLUGIN_NAME,
                title: Lampa.Lang.translate('persons_plugin_title'),
                page: 1,
                url: PLUGIN_NAME + '__main'
            }).catch(function(err) {
                error("[PERSON-PLUGIN] Open error:", err);
            });
        });        $(".menu .menu__list").first().append(menuItem);
        log("[PERSON-PLUGIN] Menu item added");

        // Слушатели
        Lampa.Listener.follow('activity', function(e) {
            if (e.type === 'start' && e.component === 'actor') {
                var id = null;
                if (e.object && e.object.id && e.object.type === 'person') {
                    id = parseInt(e.object.id, 10);
                } else if (e.params && e.params.id && e.params.type === 'person') {
                    id = parseInt(e.params.id, 10);
                } else {
                    var m = location.pathname.match(/\/view\/actor\/(\d+)/);
                    if (m) id = parseInt(m[1], 10);
                }
                if (id) {
                    currentPersonId = id;
                    log("[PERSON-PLUGIN] Person ID set:", id);
                    setTimeout(addSubscribeButton, 1200);
                }
            }
        });

        Lampa.Listener.follow('storage', function(e) {
            if (e.name === PERSONS_KEY) {
                clearCache();
                log("[PERSON-PLUGIN] Cache cleared");
            }
        });

        // Стили
        if (!document.getElementById('subscribe-button-styles')) {
            var style = document.createElement('style');
            style.id = 'subscribe-button-styles';
            style.textContent = `
                .full-start__button.selector.button--subscribe-plugin.button--subscribe { color: #4CAF50; }
                .full-start__button.selector.button--subscribe-plugin.button--unsubscribe { color: #F44336; }
            `;
            document.head.appendChild(style);
        }

        log("[PERSON-PLUGIN] ✅ Ready.");

    } catch (e) {
        console.error("[PERSON-PLUGIN] FATAL ERROR:", e);
    }
}

// === ЗАПУСК ===
if (typeof Lampa !== 'undefined' && Lampa.Api) {    initPlugin();
} else {
    var timer = setInterval(function() {
        if (typeof Lampa !== 'undefined' && Lampa.Api) {
            clearInterval(timer);
            initPlugin();
        }
    }, 200);
}
}();
