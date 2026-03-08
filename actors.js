!function() {
    "use strict";

    // Конфигурация плагина  
    var PLUGIN_NAME = "persons_plugin";  
    var PERSONS_KEY = "saved_persons";  
    var PAGE_SIZE = 20;  
    var DEFAULT_PERSON_IDS = [];  
    var currentPersonId = null;  
    var my_logging = true; // Включено для отладки

    // Переводы
    var pluginTranslations = {  
        persons_title: { ru: "Персоны", en: "Persons", uk: "Персони", be: "Асобы", pt: "Pessoas", zh: "人物", he: "אנשים", cs: "Osobnosti", bg: "Личности" },  
        subscribe: { ru: "Подписаться", en: "Subscribe", uk: "Підписатися", be: "Падпісацца", pt: "Inscrever", zh: "订阅", he: "הירשם", cs: "Přihlásit se", bg: "Абонирай се" },  
        unsubscribe: { ru: "Отписаться", en: "Unsubscribe", uk: "Відписатися", be: "Адпісацца", pt: "Cancelar inscrição", zh: "退订", he: "בטל מנוי", cs: "Odhlásit se", bg: "Отписване" },  
        persons_not_found: { ru: "Персоны не найдены", en: "No persons found", uk: "Особи не знайдені", be: "Асобы не знойдзены", pt: "Nenhuma pessoa encontrada", zh: "未找到人物", he: "לא נמצאו אנשים", cs: "Nebyly nalezeny žádné osoby", bg: "Не са намерени хора" }  
    };  

    var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';  

    // Логирование  
    function log() { if (my_logging && console && console.log) { try { console.log.apply(console, arguments); } catch (e) {} } }  
    function error() { if (my_logging && console && console.error) { try { console.error.apply(console, arguments); } catch (e) {} } }  

    // Работа с хранилищем  
    function getCurrentLanguage() { return localStorage.getItem('language') || 'en'; }  
    function initStorage() { var current = Lampa.Storage.get(PERSONS_KEY); if (!current || current.length === 0) { Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS); } }  
    function getPersonIds() { return Lampa.Storage.get(PERSONS_KEY, []); }  
    function togglePersonSubscription(personId) { var personIds = getPersonIds(); var index = personIds.indexOf(personId); if (index === -1) { personIds.push(personId); } else { personIds.splice(index, 1); } Lampa.Storage.set(PERSONS_KEY, personIds); return index === -1; }  
    function isPersonSubscribed(personId) { return getPersonIds().includes(personId); }  

    // Кнопка подписки (без изменений)  
    function addButtonToContainer(bottomBlock) { /* ... код кнопки без изменений ... */ 
        log("[PERSON-PLUGIN] Container found, adding button");  
        var existingButton = bottomBlock.querySelector('.button--subscribe-plugin');  
        if (existingButton && existingButton.parentNode) existingButton.parentNode.removeChild(existingButton);  
        var isSubscribed = isPersonSubscribed(currentPersonId);  
        var buttonText = isSubscribed ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe');  
        var button = document.createElement('div');  
        button.className = 'full-start__button selector button--subscribe-plugin';  
        button.classList.add(isSubscribed ? 'button--unsubscribe' : 'button--subscribe');  
        button.setAttribute('data-focusable', 'true');  
        button.innerHTML = '<svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path><path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path></svg><span>' + buttonText + '</span>';  
        button.addEventListener('hover:enter', function() {  
            var wasAdded = togglePersonSubscription(currentPersonId);  
            var newText = wasAdded ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe');  
            button.classList.remove('button--subscribe', 'button--unsubscribe');  
            button.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');  
            var span = button.querySelector('span'); if (span) span.textContent = newText;  
            updatePersonsList();  
        });  
        var buttonsContainer = bottomBlock.querySelector('.full-start__buttons');  
        if (buttonsContainer) { buttonsContainer.append(button); } else { bottomBlock.append(button); }  
        log("[PERSON-PLUGIN] Button added successfully");  
        return button;  
    }  
    function addSubscribeButton() { /* ... без изменений ... */ 
        if (!currentPersonId) { error("[PERSON-PLUGIN] Cannot add button: currentPersonId is null"); return; }  
        var bottomBlock = document.querySelector('.person-start__bottom');  
        if (bottomBlock) { addButtonToContainer(bottomBlock); } else {  
            log("[PERSON-PLUGIN] Waiting for container to appear...");  
            var attempts = 0, maxAttempts = 10;  
            function checkContainer() { attempts++; var container = document.querySelector('.person-start__bottom'); if (container) { addButtonToContainer(container); } else if (attempts < maxAttempts) { setTimeout(checkContainer, 300); } else { error("[PERSON-PLUGIN] Container not found after max attempts"); } }  
            setTimeout(checkContainer, 300);  
        }  
    }  
    function updatePersonsList() { var activity = Lampa.Activity.active(); if (activity && activity.component === 'category_full' && activity.source === PLUGIN_NAME) { log("[PERSON-PLUGIN] Updating persons list"); Lampa.Activity.reload(); } }  
    function addButtonStyles() { if (document.getElementById('subscribe-button-styles')) return; var css = '.full-start__button.selector.button--subscribe-plugin.button--subscribe { color: #4CAF50; } .full-start__button.selector.button--subscribe-plugin.button--unsubscribe { color: #F44336; }'; var style = document.createElement('style'); style.id = 'subscribe-button-styles'; style.textContent = css; document.head.appendChild(style); }  

    // Сервис персон (ИСПРАВЛЕННАЯ ВЕРСИЯ)  
    function PersonsService() {  
        var self = this;  
        var cache = {};  

        // Метод list (возвращает список подписок)  
        this.list = function(params, onComplete, onError) {  
            var page = parseInt(params.page, 10) || 1;  
            var startIndex = (page - 1) * PAGE_SIZE;  
            var endIndex = startIndex + PAGE_SIZE;  

            var personIds = getPersonIds();  
            var pageIds = personIds.slice(startIndex, endIndex);  

            if (pageIds.length === 0) {  
                onComplete({ results: [], page: page, total_pages: Math.ceil(personIds.length / PAGE_SIZE), total_results: personIds.length });  
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

                    var path = 'person/' + personId + '?api_key=' + Lampa.TMDB.key() + '&language=' + currentLang;  
                    var url = Lampa.TMDB.api(path);  

                    log("[PERSON-PLUGIN] Loading person data from:", url);  

                    new Lampa.Reguest().silent(url, function(response) {  
                        try {  
                            var json = typeof response === 'string' ? JSON.parse(response) : response;  

                            if (json && json.id) {  
                                // *** ОСНОВНОЕ ИЗМЕНЕНИЕ ***
                                // Создаём базовый объект, но без автоматической навигации
                                var personCard = {  
                                    id: json.id,  
                                    title: json.name,  
                                    name: json.name,  
                                    poster_path: json.profile_path,  
                                    profile_path: json.profile_path,  
                                    type: "person", // Важно! Не "movie"
                                    media_type: "person", // Важно!
                                    source: "tmdb",
                                    // Убираем component и любые другие поля, которые могут быть неверно истолкованы
                                    known_for_department: json.known_for_department,  
                                    gender: json.gender || 0,  
                                    popularity: json.popularity || 0
                                };  

                                // **КРИТИЧЕСКИ ВАЖНО: ПЕРЕОПРЕДЕЛЯЕМ onclick**
                                // Удаляем любой существующий onclick, который мог бы добавить Lampac
                                if (personCard.onclick) {
                                    delete personCard.onclick;
                                }
                                
                                // Устанавливаем ТОЛЬКО наш обработчик
                                personCard.onclick = function() {  
                                    log("[PERSON-PLUGIN] --- MANUAL CLICK --- Person:", json.id, json.name);  
                                    Lampa.Activity.push({  
                                        component: "actor", // Или "person", если "actor" не работает
                                        id: json.id,  
                                        title: json.name,  
                                        params: {  
                                            id: json.id,  
                                            name: json.name
                                        }  
                                    });  
                                    // Возвращаем false, чтобы предотвратить дальнейшее всплытие события
                                    return false;  
                                };  

                                cache[personId] = personCard;  
                                results.push(personCard);  
                            } else {  
                                error("[PERSON-PLUGIN] Invalid person data for ID", personId);  
                            }  
                        } catch (e) {  
                            error("[PERSON-PLUGIN] Error parsing person data", e);  
                        }  
                        checkComplete();  
                    }, function(errorMsg) {  
                        error("[PERSON-PLUGIN] Error loading person data", errorMsg);  
                        checkComplete();  
                    });  
                })(i);  
            }  

            function checkComplete() {  
                loaded++;  
                if (loaded >= pageIds.length) {  
                    var validResults = results.filter(function(item) { return !!item; });  
                    validResults.sort(function(a, b) { return pageIds.indexOf(a.id) - pageIds.indexOf(b.id); });  
                    onComplete({ results: validResults, page: page, total_pages: Math.ceil(personIds.length / PAGE_SIZE), total_results: personIds.length });  
                }  
            }  
        };  

        // Метод get (без изменений, но может и не понадобиться)  
        this.get = function(params, onComplete, onError) {  
            var id = params.id;  
            var currentLang = getCurrentLanguage();  
            var path = 'person/' + id + '?api_key=' + Lampa.TMDB.key() + '&language=' + currentLang;  
            var url = Lampa.TMDB.api(path);  
            log("[PERSON-PLUGIN] Getting details for person ID:", id);  
            new Lampa.Reguest().silent(url, function(response) {  
                try {  
                    var json = typeof response === 'string' ? JSON.parse(response) : response;  
                    if (json && json.id) {  
                        onComplete({  
                            id: json.id, title: json.name, name: json.name, poster_path: json.profile_path, profile_path: json.profile_path,  
                            type: "person", media_type: "person", source: "tmdb", component: "actor",  
                            known_for_department: json.known_for_department, gender: json.gender || 0, popularity: json.popularity || 0,  
                            biography: json.biography || '', birthday: json.birthday || '', deathday: json.deathday || '', place_of_birth: json.place_of_birth || ''  
                        });  
                    } else { onError && onError('Invalid response'); }  
                } catch (e) { onError && onError(e); }  
            }, onError);  
        };  
    }  

    // Запуск плагина  
    function startPlugin() {  
        Lampa.Lang.add({ persons_plugin_title: pluginTranslations.persons_title, persons_plugin_subscribe: pluginTranslations.subscribe, persons_plugin_unsubscribe: pluginTranslations.unsubscribe, persons_plugin_not_found: pluginTranslations.persons_not_found, persons_title: pluginTranslations.persons_title });  
        initStorage();  
        var personsService = new PersonsService();  
        Lampa.Api.sources[PLUGIN_NAME] = personsService;  

        // Пункт меню  
        var menuItem = $('<li class="menu__item selector" data-action="' + PLUGIN_NAME + '"><div class="menu__ico">' + ICON_SVG + '</div><div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div></li>');  
        menuItem.on("hover:enter", function() { Lampa.Activity.push({ component: "category_full", source: PLUGIN_NAME, title: Lampa.Lang.translate('persons_plugin_title'), page: 1, url: PLUGIN_NAME + '__main' }); });  
        $(".menu .menu__list").eq(0).append(menuItem);  

        // Функции для страницы актёра (без изменений)  
        function waitForContainer(callback) { /* ... */ 
            log("[PERSON-PLUGIN] Waiting for container...");  
            var attempts = 0, maxAttempts = 15, containerSelector = '.person-start__bottom';  
            function check() { attempts++; var container = document.querySelector(containerSelector); if (container) { log("[PERSON-PLUGIN] Container found after", attempts, "attempts"); callback(); } else if (attempts < maxAttempts) { setTimeout(check, 200); } else { error("[PERSON-PLUGIN] Container not found after max attempts"); } }  
            if (document.querySelector(containerSelector)) { callback(); } else { setTimeout(check, 300); }  
        }  
        function checkCurrentActivity() { /* ... */ 
            log("[PERSON-PLUGIN] Checking current activity");  
            var activity = Lampa.Activity.active();  
            if (activity && activity.component === 'actor') {  
                log("[PERSON-PLUGIN] Current activity is actor page");  
                if (activity.id) { currentPersonId = parseInt(activity.id, 10); } else if (activity.params && activity.params.id) { currentPersonId = parseInt(activity.params.id, 10); } else { var match = location.pathname.match(/\/view\/actor\/(\d+)/); if (match && match[1]) { currentPersonId = parseInt(match[1], 10); } }  
                if (currentPersonId) { log("[PERSON-PLUGIN] Found actor ID:", currentPersonId); waitForContainer(function() { addSubscribeButton(); }); } else { error("[PERSON-PLUGIN] No ID found"); }  
            }  
        }  

        Lampa.Listener.follow('activity', function(e) {  
            log("[PERSON-PLUGIN] Activity event:", e.type, e.component);  
            if (e.type === 'start' && e.component === 'actor') {  
                if (e.object && e.object.id) { currentPersonId = parseInt(e.object.id, 10); log("[PERSON-PLUGIN] Actor ID:", currentPersonId); waitForContainer(function() { addSubscribeButton(); }); }  
            } else if (e.type === 'resume' && e.component === 'category_full' && e.object && e.object.source === PLUGIN_NAME) {  
                log("[PERSON-PLUGIN] Persons list resumed, reloading");  
                setTimeout(function() { Lampa.Activity.reload(); }, 100);  
            }  
        });  

        setTimeout(checkCurrentActivity, 1500);  
        addButtonStyles();  
    }  

    if (window.appready) { startPlugin(); } else { Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') { startPlugin(); } }); }  
}();
