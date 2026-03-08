!function() {
"use strict";

// === Конфигурация ===
var PLUGIN_NAME = "persons_plugin";
var PERSONS_KEY = "saved_persons";
var PAGE_SIZE = 20;
var DEFAULT_PERSON_IDS = [];
var currentPersonId = null;
var my_logging = true; // Включить/выключить логирование
var cache = {}; // Кэш персон

// === Переводы ===
var pluginTranslations = {  
    persons_title: { ru: "Персоны", en: "Persons", uk: "Персони", be: "Асобы", pt: "Pessoas", zh: "人物", he: "אנשים", cs: "Osobnosti", bg: "Личности" },
    subscribe: { ru: "Подписаться", en: "Subscribe", uk: "Підписатися", be: "Падпісацца", pt: "Inscrever", zh: "订阅", he: "הירשם", cs: "Přihlásit se", bg: "Абонирай се" },
    unsubscribe: { ru: "Отписаться", en: "Unsubscribe", uk: "Відписатися", be: "Адпісацца", pt: "Cancelar inscrição", zh: "退订", he: "בטל מנוי", cs: "Odhlásit se", bg: "Отписване" },
    persons_not_found: { ru: "Персоны не найдены", en: "No persons found", uk: "Особи не знайдені", be: "Асобы не знойдзены", pt: "Nenhuma pessoa encontrada", zh: "未找到人物", he: "לא נמצאו אנשים", cs: "Nebyly nalezeny žádné osoby", bg: "Не са намерени хора" }
};

// === Иконка меню ===
var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';

// === Логирование ===
function log() { if (my_logging && console && console.log) try { console.log.apply(console, arguments); } catch(e){} }
function error() { if (my_logging && console && console.error) try { console.error.apply(console, arguments); } catch(e){} }

// === Вспомогательные функции ===
function getCurrentLanguage() {
    return localStorage.getItem('language') || 'en';
}

function initStorage() {
    var saved = Lampa.Storage.get(PERSONS_KEY);
    if (!Array.isArray(saved) || saved.length === 0) {
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
    } else {        ids.splice(idx, 1);
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

// === Кнопка подписки ===
function addButtonToContainer(bottomBlock) {
    // Удаляем старую кнопку
    var oldBtn = bottomBlock.querySelector('.button--subscribe-plugin');
    if (oldBtn) oldBtn.remove();

    var isSubscribed = isPersonSubscribed(currentPersonId);
    var textKey = isSubscribed ? 'persons_plugin_unsubscribe' : 'persons_plugin_subscribe';
    var buttonText = Lampa.Lang.translate(textKey);

    var btn = document.createElement('div');
    btn.className = 'full-start__button selector button--subscribe-plugin';
    btn.classList.add(isSubscribed ? 'button--unsubscribe' : 'button--subscribe');
    btn.setAttribute('data-focusable', 'true');

    btn.innerHTML = `
        <svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>
            <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.413321.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path>
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
    buttonsContainer.appendChild(btn);    log("[PERSON-PLUGIN] Button added for person ID:", currentPersonId);
    return btn;
}

function addSubscribeButton() {
    if (!currentPersonId) {
        error("[PERSON-PLUGIN] ❌ No person ID — cannot add button");
        return;
    }

    var container = document.querySelector('.person-start__bottom');
    if (container) {
        addButtonToContainer(container);
    } else {
        log("[PERSON-PLUGIN] ⏳ Waiting for .person-start__bottom...");
        var attempts = 0;
        var timer = setInterval(function() {
            attempts++;
            container = document.querySelector('.person-start__bottom');
            if (container) {
                clearInterval(timer);
                addButtonToContainer(container);
            } else if (attempts >= 15) {
                clearInterval(timer);
                error("[PERSON-PLUGIN] ❌ Container not found after 15 attempts");
            }
        }, 200);
    }
}

function updatePersonsList() {
    var act = Lampa.Activity.active();
    if (act && act.component === 'category_full' && act.source === PLUGIN_NAME) {
        log("[PERSON-PLUGIN] 🔄 Reloading persons list");
        Lampa.Activity.reload();
    }
}

// === Стили кнопки ===
function addButtonStyles() {
    if (document.getElementById('subscribe-button-styles')) return;
    var style = document.createElement('style');
    style.id = 'subscribe-button-styles';
    style.textContent = `
        .full-start__button.selector.button--subscribe-plugin.button--subscribe { color: #4CAF50; }
        .full-start__button.selector.button--subscribe-plugin.button--unsubscribe { color: #F44336; }
    `;
    document.head.appendChild(style);
}
// === Сервис персон ===
function PersonsService() {
    this.list = function(params, onComplete, onError) {
        var page = parseInt(params.page, 10) || 1;
        var start = (page - 1) * PAGE_SIZE;
        var end = start + PAGE_SIZE;

        var ids = getPersonIds();
        var pageIds = ids.slice(start, end);

        if (pageIds.length === 0) {
            return onComplete({ results: [], page, total_pages: Math.ceil(ids.length / PAGE_SIZE), total_results: ids.length });
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

                var url = Lampa.TMDB.api(`person/${id}?api_key=${Lampa.TMDB.key()}&language=${lang}&append_to_response=movie_credits`);

                new Lampa.Reguest().silent(url function(res) {
                    try {
                        var json = typeof res === 'string' ? JSON.parse(res) : res;
                        if (json && json.id && json.name) {
                            var card = {
                                id: json.id,
                                title: json.name,
                                name: json.name,
                                poster_path: json.profile_path,
                                profile_path: json.profile_path,
                                type: "actor",
                                source: PLUGIN_NAME,           // ← КРИТИЧЕСКИ ВАЖНО
                                original_type: "person",
                                media_type: "person",
                                component: "actor",            // ← ОБЯЗАТЕЛЬНО для открытия как актёра
                                known_for_department: json.known_for_department,
                                gender: json.gender || 0,
                                popularity: json.popularity || 0,
                                movie_credits: json.movie_credits || {}
                            };
                            cache[id] = card;
                            results.push(card);                        } else {
                            error("[PERSON-PLUGIN] ❌ Invalid person response for ID", id, json);
                        }
                    } catch (e) {
                        error("[PERSON-PLUGIN] Parse error for ID", id, e);
                    }
                    checkComplete();
                }, function(err) {
                    error("[PERSON-PLUGIN] Request failed for person", id, err);
                    checkComplete();
                });
            })(pageIds[i]);
        }

        function checkComplete() {
            loaded++;
            if (loaded >= pageIds.length) {
                var valid = results.filter(item => item && item.id);
                valid.sort((a, b) => pageIds.indexOf(a.id) - page.indexOf(b.id));

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

// === Запуск плагина ===
function startPlugin() {
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
            <div class="menu__ico">${ICON_SVG}</div>            <div class="menu__text">${Lampa.Lang.translate('persons_plugin_title')}</div>
        </li>
    `);

    menuItem.on("hover:enter", function() {
        Lampa.Activity.push({
            component: "category_full",
            source: PLUGIN_NAME,
            title: Lampa.Lang.translate('persons_plugin_title'),
            page: 1,
            url: PLUGIN_NAME + '__main'
        }).catch(err => {
            error("[PERSON-PLUGIN] ❌ Failed to open persons list:", err);
            Lampa.Noty.show(Lampa.Lang.translate('persons_plugin_not_found'), 'error');
        });
    });

    $(".menu .menu__list").first().append(menuItem);

    // Обработчик активности
    Lampa.Listener.follow('activity', function(e) {
        if (e.type === 'start' && e.component === 'actor') {
            log("[PERSON-PLUGIN] 🎯 Actor page started");

            // Извлекаем ID безопасно
            var id = null;
            if (e.object && e.object.id && e.object.media_type === 'person') {
                id = parseInt(e.object.id, 10);
            } else if (e.params && e.params.id && e.params.media_type === 'person') {
                id = parseInt(e.params.id, 10);
            } else {
                var m = location.pathname.match(/\/view\/actor\/(\d+)/);
                if (m) id = parseInt(m[1], 10);
            }

            if (id) {
                currentPersonId = id;
                log("[PERSON-PLUGIN] ✅ Found person ID:", id);
                setTimeout(addSubscribeButton, 500); // небольшая задержка — чтобы DOM успел собраться
            } else {
                error("[PERSON-PLUGIN] ❌ No valid person ID in activity");
            }
        }

        if (e.type === 'resume' && e.component === 'category_full' && e.object?.source === PLUGIN_NAME) {
            log("[PERSON-PLUGIN] 📋 Persons list resumed — reloading");
            setTimeout(() => Lampa.Activity.reload(), 100);
        }
    });
    // Слушатель изменений в хранилище
    Lampa.Listener.follow('storage', function(e) {
        if (e.name === PERSONS_KEY) {
            log("[PERSON-PLUGIN] 🧹 Clearing cache after subscription change");
            clearCache();
        }
    });

    // Стили
    addButtonStyles();

    // Отладка (оставьте для диагностики)
    window.personsPluginDebug = {
        cache: () => cache,
        subscribed: getPersonIds,
        currentId: () => currentPersonId,
        clearCache: clearCache
    };

    log("[PERSON-PLUGIN] ✅ Plugin initialized successfully");
}

// === Запуск ===
if (window.appready) {
    startPlugin();
} else {
    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') startPlugin();
    });
}

}();
