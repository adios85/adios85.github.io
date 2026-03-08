!function() {
"use strict";

// ============================================
// КОНФИГУРАЦИЯ ПЛАГИНА
// ============================================
var PLUGIN_NAME = "persons_plugin";
var PERSONS_KEY = "saved_persons";
var PAGE_SIZE = 20;
var DEFAULT_PERSON_IDS = [];
var currentPersonId = null;
var my_logging = true; // Включить/выключить логирование
var observerTimeout = null;

// ============================================
// ПЕРЕВОДЫ ДЛЯ ПЛАГИНА
// ============================================
var pluginTranslations = {
    persons_title: {
        ru: "Персоны",
        en: "Persons",
        uk: "Персони",
        be: "Асобы",
        pt: "Pessoas",
        zh: "人物",
        he: "אנשים",
        cs: "Osobnosti",
        bg: "Личности"
    },
    subscribe: {
        ru: "Подписаться",
        en: "Subscribe",
        uk: "Підписатися",
        be: "Падпісацца",
        pt: "Inscrever",
        zh: "订阅",
        he: "הירשם",
        cs: "Přihlásit se",
        bg: "Абонирай се"
    },
    unsubscribe: {
        ru: "Отписаться",
        en: "Unsubscribe",
        uk: "Відписатися",
        be: "Адпісацца",
        pt: "Cancelar inscrição",
        zh: "退订",
        he: "בטל מנוי",
        cs: "Odhlásit se",
        bg: "Отписване"    },
    persons_not_found: {
        ru: "Персоны не найдены",
        en: "No persons found",
        uk: "Особи не знайдені",
        be: "Асобы не знойдзены",
        pt: "Nenhuma pessoa encontrada",
        zh: "未找到人物",
        he: "לא נמצאו אנשים",
        cs: "Nebyly nalezeny žádné osoby",
        bg: "Не са намерени хора"
    }
};

// ============================================
// ИКОНКА ДЛЯ МЕНЮ
// ============================================
var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';

// ============================================
// ЛОГИРОВАНИЕ
// ============================================
function log() {
    if (my_logging && console && console.log) {
        try {
            console.log.apply(console, arguments);
        } catch (e) {}
    }
}

function error() {
    if (my_logging && console && console.error) {
        try {
            console.error.apply(console, arguments);
        } catch (e) {}
    }
}

// ============================================
// ФУНКЦИИ РАБОТЫ С ХРАНИЛИЩЕМ (ИСПРАВЛЕНО)
// ============================================
function getCurrentLanguage() {
    var lang = localStorage.getItem('language');
    return lang || 'ru';
}

function initStorage() {
    try {
        var current = Lampa.Storage.get(PERSONS_KEY, []); // Добавлен параметр по умолчанию
        if (!current || current.length === 0) {            Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);
            log("[PERSON-PLUGIN] Storage initialized with default values");
        } else {
            log("[PERSON-PLUGIN] Storage loaded:", current.length, "persons");
        }
    } catch (e) {
        error("[PERSON-PLUGIN] Storage init error:", e);
        Lampa.Storage.set(PERSONS_KEY, []);
    }
}

function getPersonIds() {
    try {
        return Lampa.Storage.get(PERSONS_KEY, []); // Добавлен параметр по умолчанию
    } catch (e) {
        error("[PERSON-PLUGIN] Get person IDs error:", e);
        return [];
    }
}

function togglePersonSubscription(personId) {
    try {
        var personIds = getPersonIds();
        var index = personIds.indexOf(personId);
        
        if (index === -1) {
            personIds.push(personId);
            log("[PERSON-PLUGIN] Subscribed to person:", personId);
        } else {
            personIds.splice(index, 1);
            log("[PERSON-PLUGIN] Unsubscribed from person:", personId);
        }
        
        Lampa.Storage.set(PERSONS_KEY, personIds);
        return index === -1;
    } catch (e) {
        error("[PERSON-PLUGIN] Toggle subscription error:", e);
        return false;
    }
}

function isPersonSubscribed(personId) {
    try {
        var personIds = getPersonIds();
        return personIds.includes(personId);
    } catch (e) {
        error("[PERSON-PLUGIN] Check subscription error:", e);
        return false;
    }
}
// ============================================
// ПОИСК КОНТЕЙНЕРА (УНИВЕРСАЛЬНЫЙ)
// ============================================
function findBottomContainer() {
    var selectors = [
        '.person-start__bottom',
        '.person__bottom',
        '.full-start__bottom',
        '.person .bottom-block',
        '.person-view__bottom',
        '.person-details__bottom',
        '[data-component="person"] .bottom',
        '.actor-start__bottom',
        '.actor__bottom'
    ];
    
    for (var i = 0; i < selectors.length; i++) {
        var el = document.querySelector(selectors[i]);
        if (el) {
            log("[PERSON-PLUGIN] Found container with selector:", selectors[i]);
            return el;
        }
    }
    
    // Если не нашли по селекторам, ищем по структуре
    var personPage = document.querySelector('.person, .actor, [data-component="person"], [data-component="actor"]');
    if (personPage) {
        var bottom = personPage.querySelector('.bottom, .bottom-block, [class*="bottom"]');
        if (bottom) {
            log("[PERSON-PLUGIN] Found container by structure");
            return bottom;
        }
    }
    
    return null;
}

// ============================================
// ДОБАВЛЕНИЕ КНОПКИ
// ============================================
function addButtonToContainer(bottomBlock) {
    log("[PERSON-PLUGIN] Container found, adding button");
    
    // Удаление существующей кнопки
    var existingButton = bottomBlock.querySelector('.button--subscribe-plugin');
    if (existingButton && existingButton.parentNode) {
        existingButton.parentNode.removeChild(existingButton);
        log("[PERSON-PLUGIN] Removed existing button");
    }    
    var isSubscribed = isPersonSubscribed(currentPersonId);
    var buttonText = isSubscribed ? 
        Lampa.Lang.translate('persons_plugin_unsubscribe') : 
        Lampa.Lang.translate('persons_plugin_subscribe');
    
    // Создание кнопки
    var button = document.createElement('div');
    button.className = 'full-start__button selector button--subscribe-plugin';
    button.classList.add(isSubscribed ? 'button--unsubscribe' : 'button--subscribe');
    button.setAttribute('data-focusable', 'true');
    button.setAttribute('tabindex', '0');
    
    button.innerHTML = 
        '<svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>' +
            '<path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path>' +
        '</svg>' +
        '<span>' + buttonText + '</span>';
    
    // Обработчик нажатия
    button.addEventListener('hover:enter', function() {
        var wasAdded = togglePersonSubscription(currentPersonId);
        var newText = wasAdded ? 
            Lampa.Lang.translate('persons_plugin_unsubscribe') : 
            Lampa.Lang.translate('persons_plugin_subscribe');
        
        button.classList.remove('button--subscribe', 'button--unsubscribe');
        button.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');
        
        var span = button.querySelector('span');
        if (span) span.textContent = newText;
        
        // Показываем уведомление
        Lampa.Notice.show({
            title: wasAdded ? 'Подписка оформлена' : 'Подписка отменена',
            icon: 'check',
            time: 2000
        });
        
        updatePersonsList();
    });
    
    // Вставка кнопки
    var buttonsContainer = bottomBlock.querySelector('.full-start__buttons');
    if (buttonsContainer) {
        buttonsContainer.append(button);
    } else {
        bottomBlock.append(button);
    }    
    log("[PERSON-PLUGIN] Button added successfully");
    return button;
}

function addSubscribeButton() {
    if (!currentPersonId) {
        error("[PERSON-PLUGIN] Cannot add button: currentPersonId is null");
        return;
    }
    
    log("[PERSON-PLUGIN] Attempting to add button for person ID:", currentPersonId);
    
    var bottomBlock = findBottomContainer();
    
    if (bottomBlock) {
        addButtonToContainer(bottomBlock);
    } else {
        log("[PERSON-PLUGIN] Waiting for container to appear...");
        
        var attempts = 0;
        var maxAttempts = 25;
        
        function checkContainer() {
            attempts++;
            var container = findBottomContainer();
            
            if (container) {
                addButtonToContainer(container);
            } else if (attempts < maxAttempts) {
                setTimeout(checkContainer, 400);
            } else {
                error("[PERSON-PLUGIN] Container not found after max attempts");
                observeForContainer();
            }
        }
        
        setTimeout(checkContainer, 500);
    }
}

// ============================================
// MUTATION OBSERVER ДЛЯ ДИНАМИЧЕСКОГО КОНТЕНТА
// ============================================
function observeForContainer() {
    log("[PERSON-PLUGIN] Starting MutationObserver");
    
    if (observerTimeout) {
        clearTimeout(observerTimeout);
    }    
    var observer = new MutationObserver(function(mutations) {
        var container = findBottomContainer();
        if (container) {
            log("[PERSON-PLUGIN] Container found via MutationObserver");
            observer.disconnect();
            addButtonToContainer(container);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Останавливаем наблюдение через 15 секунд
    observerTimeout = setTimeout(function() {
        observer.disconnect();
        log("[PERSON-PLUGIN] MutationObserver stopped");
    }, 15000);
}

// ============================================
// ОБНОВЛЕНИЕ СПИСКА ПЕРСОН
// ============================================
function updatePersonsList() {
    var activity = Lampa.Activity.active();
    if (activity && activity.component === 'category_full' && activity.source === PLUGIN_NAME) {
        log("[PERSON-PLUGIN] Updating persons list");
        setTimeout(function() {
            Lampa.Activity.reload();
        }, 100);
    }
}

// ============================================
// СТИЛИ КНОПКИ
// ============================================
function addButtonStyles() {
    if (document.getElementById('subscribe-button-styles')) {
        log("[PERSON-PLUGIN] Styles already exist");
        return;
    }
    
    var css = [
        '.full-start__button.selector.button--subscribe-plugin.button--subscribe {',
        '    color: #4CAF50;',
        '}',
        '',
        '.full-start__button.selector.button--subscribe-plugin.button--unsubscribe {',        '    color: #F44336;',
        '}',
        '',
        '.full-start__button.selector.button--subscribe-plugin {',
        '    display: flex;',
        '    align-items: center;',
        '    gap: 8px;',
        '    cursor: pointer;',
        '}',
        '',
        '.full-start__button.selector.button--subscribe-plugin:hover {',
        '    opacity: 0.8;',
        '}'
    ].join('');
    
    var style = document.createElement('style');
    style.id = 'subscribe-button-styles';
    style.textContent = css;
    document.head.appendChild(style);
    
    log("[PERSON-PLUGIN] Styles added");
}

// ============================================
// СЕРВИС ПЕРСОН (ES5)
// ============================================
function PersonsService() {
    var self = this;
    var cache = {};
    
    this.list = function(params, onComplete, onError) {
        var page = parseInt(params.page, 10) || 1;
        var startIndex = (page - 1) * PAGE_SIZE;
        var endIndex = startIndex + PAGE_SIZE;
        
        var personIds = getPersonIds();
        var pageIds = personIds.slice(startIndex, endIndex);
        
        log("[PERSON-PLUGIN] Loading page:", page, "IDs:", pageIds.length);
        
        if (pageIds.length === 0) {
            onComplete({
                results: [],
                page: page,
                total_pages: 0,
                total_results: 0
            });
            return;
        }
                var loaded = 0;
        var results = [];
        var currentLang = getCurrentLanguage();
        
        for (var i = 0; i < pageIds.length; i++) {
            (function(i) {
                var personId = pageIds[i];
                
                if (cache[personId]) {
                    results.push(cache[personId]);
                    checkComplete();
                    return;
                }
                
                var path = 'person/' + personId + 
                           '?api_key=' + Lampa.TMDB.key() + 
                           '&language=' + currentLang;
                var url = Lampa.TMDB.api(path);
                
                log("[PERSON-PLUGIN] Fetching person:", personId);
                
                new Lampa.Reguest().silent(url, function(response) {
                    try {
                        var json = typeof response === 'string' ? JSON.parse(response) : response;
                        
                        if (json && json.id) {
                            var personCard = {
                                id: json.id,
                                title: json.name,
                                name: json.name,
                                poster_path: json.profile_path,
                                profile_path: json.profile_path,
                                type: "actor",
                                source: "tmdb",
                                original_type: "person",
                                media_type: "person",
                                known_for_department: json.known_for_department,
                                gender: json.gender || 0,
                                popularity: json.popularity || 0
                            };
                            
                            cache[personId] = personCard;
                            results.push(personCard);
                            log("[PERSON-PLUGIN] Loaded person:", json.name);
                        }
                    } catch (e) {
                        error("[PERSON-PLUGIN] Error parsing person data:", e);
                    }
                    checkComplete();
                }, function(errorMsg) {                    error("[PERSON-PLUGIN] Error loading person data:", errorMsg);
                    checkComplete();
                });
            })(i);
        }
        
        function checkComplete() {
            loaded++;
            if (loaded >= pageIds.length) {
                var validResults = results.filter(function(item) {
                    return !!item;
                });
                
                validResults.sort(function(a, b) {
                    return pageIds.indexOf(a.id) - pageIds.indexOf(b.id);
                });
                
                onComplete({
                    results: validResults,
                    page: page,
                    total_pages: Math.ceil(personIds.length / PAGE_SIZE),
                    total_results: personIds.length
                });
                
                log("[PERSON-PLUGIN] Page complete:", validResults.length, "results");
            }
        }
    };
}

// ============================================
// ЗАПУСК ПЛАГИНА
// ============================================
function startPlugin() {
    log("[PERSON-PLUGIN] Starting plugin...");
    
    // Проверка доступности Lampa API
    if (!Lampa || !Lampa.Lang || !Lampa.Storage || !Lampa.Activity) {
        error("[PERSON-PLUGIN] Lampa API not available");
        return;
    }
    
    // Добавляем переводы в Lampa
    Lampa.Lang.add({
        persons_plugin_title: pluginTranslations.persons_title,
        persons_plugin_subscribe: pluginTranslations.subscribe,
        persons_plugin_unsubscribe: pluginTranslations.unsubscribe,
        persons_plugin_not_found: pluginTranslations.persons_not_found,
        persons_title: pluginTranslations.persons_title
    });    
    log("[PERSON-PLUGIN] Translations added");
    
    initStorage();
    
    var personsService = new PersonsService();
    Lampa.Api.sources[PLUGIN_NAME] = personsService;
    
    log("[PERSON-PLUGIN] Service registered");
    
    // Создаем пункт меню
    var menuItem = $(
        '<li class="menu__item selector" data-action="' + PLUGIN_NAME + '">' +
            '<div class="menu__ico">' + ICON_SVG + '</div>' +
            '<div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div>' +
        '</li>'
    );
    
    menuItem.on("hover:enter", function() {
        log("[PERSON-PLUGIN] Menu item clicked");
        Lampa.Activity.push({
            component: "category_full",
            source: PLUGIN_NAME,
            title: Lampa.Lang.translate('persons_plugin_title'),
            page: 1,
            url: PLUGIN_NAME + '__main'
        });
    });
    
    $(".menu .menu__list").eq(0).append(menuItem);
    
    log("[PERSON-PLUGIN] Menu item added");
    
    // Проверка текущей активности при запуске
    function checkCurrentActivity() {
        log("[PERSON-PLUGIN] Checking current activity on startup");
        var activity = Lampa.Activity.active();
        
        if (activity && (activity.component === 'actor' || activity.component === 'person')) {
            log("[PERSON-PLUGIN] Current activity is person/actor page");
            
            if (activity.id) {
                currentPersonId = parseInt(activity.id, 10);
            } else if (activity.params && activity.params.id) {
                currentPersonId = parseInt(activity.params.id, 10);
            } else {
                var match = location.pathname.match(/\/view\/(actor|person)\/(\d+)/);
                if (match && match[2]) {
                    currentPersonId = parseInt(match[2], 10);
                    log("[PERSON-PLUGIN] Got ID from URL:", currentPersonId);                }
            }
            
            if (currentPersonId) {
                log("[PERSON-PLUGIN] Found person ID:", currentPersonId);
                setTimeout(function() {
                    addSubscribeButton();
                }, 800);
            } else {
                error("[PERSON-PLUGIN] No ID found in current activity");
            }
        }
    }
    
    // Слушаем события активности
    Lampa.Listener.follow('activity', function(e) {
        log("[PERSON-PLUGIN] Activity event:", e.type, "component:", e.component);
        
        // Для страницы персоны/актёра
        if (e.type === 'start' && (e.component === 'actor' || e.component === 'person')) {
            log("[PERSON-PLUGIN] Person/Actor page started");
            
            if (e.object && e.object.id) {
                currentPersonId = parseInt(e.object.id, 10);
                log("[PERSON-PLUGIN] Found person ID:", currentPersonId);
                
                // Небольшая задержка для загрузки DOM
                setTimeout(function() {
                    addSubscribeButton();
                }, 800);
            }
        }
        // При активации страницы плагина
        else if (e.type === 'resume' && e.component === 'category_full' && e.object && e.object.source === PLUGIN_NAME) {
            log("[PERSON-PLUGIN] Persons list resumed");
            setTimeout(function() {
                Lampa.Activity.reload();
            }, 100);
        }
        // При возврате на страницу персоны
        else if (e.type === 'resume' && (e.component === 'actor' || e.component === 'person')) {
            log("[PERSON-PLUGIN] Person page resumed");
            setTimeout(function() {
                addSubscribeButton();
            }, 500);
        }
    });
    
    // Запускаем проверку текущей активности
    setTimeout(checkCurrentActivity, 1500);    
    // Добавляем стили
    addButtonStyles();
    
    log("[PERSON-PLUGIN] Plugin started successfully");
}

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================
if (window.appready) {
    log("[PERSON-PLUGIN] App already ready, starting immediately");
    startPlugin();
} else {
    log("[PERSON-PLUGIN] Waiting for app ready event");
    Lampa.Listener.follow('app', function(e) {
        if (e.type === 'ready') {
            log("[PERSON-PLUGIN] App ready event received");
            startPlugin();
        }
    });
}

}();
