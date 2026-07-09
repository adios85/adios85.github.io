!function() {
"use strict";

// Конфигурация плагина  
var PLUGIN_NAME = "persons_plugin";  
var PERSONS_KEY = "saved_persons";  
var PAGE_SIZE = 20;  
var DEFAULT_PERSON_IDS = [];  
var currentPersonId = null;  
var my_logging = true; // Включить/выключить логирование  
  
// Переводы для плагина  
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
        he: "הירшם",  
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
        he: "בטל מנוи",  
        cs: "Odhlásit se",  
        bg: "Отписване"  
    },  
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
  
// Иконка для меню  
var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';  
  
// Логирование с проверкой флага  
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
  
// Функции работы с хранилищем  
function getCurrentLanguage() {  
    var lang = localStorage.getItem('language');  
    return lang || 'en';  
}  
  
function initStorage() {  
    var current = Lampa.Storage.get(PERSONS_KEY);  
    if (!current || current.length === 0) {  
        Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);  
    }  
}  
  
function getPersonIds() {  
    return Lampa.Storage.get(PERSONS_KEY, []);  
}  
  
function togglePersonSubscription(personId) {  
    var personIds = getPersonIds();  
    var index = personIds.indexOf(personId);  
      
    if (index === -1) {  
        personIds.push(personId);  
    } else {  
        personIds.splice(index, 1);  
    }  
      
    Lampa.Storage.set(PERSONS_KEY, personIds);  
    return index === -1;  
}  
  
function isPersonSubscribed(personId) {  
    var personIds = getPersonIds();  
    return personIds.includes(personId);  
}  
  
function addButtonToContainer(bottomBlock) {  
    log("[PERSON-PLUGIN] Container found, adding button");  
      
    var existingButton = bottomBlock.querySelector('.button--subscribe-plugin');  
    if (existingButton && existingButton.parentNode) {  
        existingButton.parentNode.removeChild(existingButton);  
    }  
      
    var isSubscribed = isPersonSubscribed(currentPersonId);  
    var buttonText = isSubscribed ?   
        Lampa.Lang.translate('persons_plugin_unsubscribe') :   
        Lampa.Lang.translate('persons_plugin_subscribe');  
      
    var button = document.createElement('div');  
    button.className = 'full-start__button selector button--subscribe-plugin';  
    button.classList.add(isSubscribed ? 'button--unsubscribe' : 'button--subscribe');  
    button.setAttribute('data-focusable', 'true');  
      
    button.innerHTML =   
        '<svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">' +  
            '<path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>' +  
            '<path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path>' +  
        '</svg>' +  
        '<span>' + buttonText + '</span>';  
      
    button.addEventListener('hover:enter', function() {  
        var wasAdded = togglePersonSubscription(currentPersonId);  
        var newText = wasAdded ?   
            Lampa.Lang.translate('persons_plugin_unsubscribe') :   
            Lampa.Lang.translate('persons_plugin_subscribe');  
          
        button.classList.remove('button--subscribe', 'button--unsubscribe');  
        button.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');  
          
        var span = button.querySelector('span');  
        if (span) span.textContent = newText;  
        updatePersonsList();  
    });  
      
    var buttonsContainer = bottomBlock.querySelector('.full-start__buttons');  
    if (buttonsContainer) {  
        buttonsContainer.append(button);  
    } else {  
        bottomBlock.append(button);  
    }  
      
    // Переинициализация фокуса Lampa, чтобы кнопка стала кликабельной на ТВ
    if (window.Lampa && Lampa.Controller) {
        Lampa.Controller.toggle('content');
    }
    
    log("[PERSON-PLUGIN] Button added successfully");  
    return button;  
}  
  
function addSubscribeButton() {  
    if (!currentPersonId) {  
        error("[PERSON-PLUGIN] Cannot add button: currentPersonId is null");  
        return;  
    }  
      
    var bottomBlock = document.querySelector('.person-start__bottom') || document.querySelector('.actor-start__bottom');  
      
    if (bottomBlock) {  
        addButtonToContainer(bottomBlock);  
    } else {  
        log("[PERSON-PLUGIN] Waiting for container to appear...");  
          
        var attempts = 0;  
        var maxAttempts = 15;  
          
        function checkContainer() {  
            attempts++;  
            var container = document.querySelector('.person-start__bottom') || document.querySelector('.actor-start__bottom');  
              
            if (container) {  
                addButtonToContainer(container);  
            } else if (attempts < maxAttempts) {  
                setTimeout(checkContainer, 200);  
            } else {  
                error("[PERSON-PLUGIN] Container not found after max attempts");  
            }  
        }  
          
        setTimeout(checkContainer, 200);  
    }  
}  
  
function updatePersonsList() {  
    var activity = Lampa.Activity.active();  
    if (activity && activity.component === 'category_full' && activity.source === PLUGIN_NAME) {  
        log("[PERSON-PLUGIN] Updating persons list");  
        Lampa.Activity.reload();  
    }  
}  

function addButtonStyles() {  
    if (document.getElementById('subscribe-button-styles')) return;  
      
    var css = [  
        '.full-start__button.selector.button--subscribe-plugin.button--subscribe {',  
        '    color: #4CAF50;',  
        '}',  
        '',  
        '.full-start__button.selector.button--subscribe-plugin.button--unsubscribe {',  
        '    color: #F44336;',  
        '}'  
    ].join('');  
      
    var style = document.createElement('style');  
    style.id = 'subscribe-button-styles';  
    style.textContent = css;  
    document.head.appendChild(style);  
}  

// Класс сервиса
function PersonsService() {  
    var cache = {};  
      
    this.list = function(params, onComplete, onError) {  
        var page = parseInt(params.page, 10) || 1;  
        var startIndex = (page - 1) * PAGE_SIZE;  
        var endIndex = startIndex + PAGE_SIZE;  
          
        var personIds = getPersonIds();  
        var pageIds = personIds.slice(startIndex, endIndex);  
          
        if (pageIds.length === 0) {  
            onComplete({  
                results: [],  
                page: page,  
                total_pages: Math.ceil(personIds.length / PAGE_SIZE),  
                total_results: personIds.length  
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
                                type: "person",  
                                source: "tmdb",  
                                original_type: "person",  
                                media_type: "person",  
                                known_for_department: json.known_for_department,  
                                gender: json.gender || 0,  
                                popularity: json.popularity || 0  
                            };  
                              
                            cache[personId] = personCard;  
                            results.push(personCard);  
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
            }  
        }  
    };  
}  

function startPlugin() {  
    Lampa.Lang.add({  
        persons_plugin_title: pluginTranslations.persons_title,  
        persons_plugin_subscribe: pluginTranslations.subscribe,  
        persons_plugin_unsubscribe: pluginTranslations.unsubscribe,  
        persons_plugin_not_found: pluginTranslations.persons_not_found,  
        persons_title: pluginTranslations.persons_title  
    });  
      
    initStorage();  
      
    var personsService = new PersonsService();  
    Lampa.Api.sources[PLUGIN_NAME] = personsService;  
      
    // Меню  
    var menuItem = $(  
        '<li class="menu__item selector" data-action="' + PLUGIN_NAME + '">' +  
            '<div class="menu__ico">' + ICON_SVG + '</div>' +  
            '<div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div>' +  
        '</li>'  
    );  
      
    menuItem.on("hover:enter", function() {  
        Lampa.Activity.push({  
            component: "category_full",  
            source: PLUGIN_NAME,  
            title: Lampa.Lang.translate('persons_plugin_title'),  
            page: 1,  
            url: PLUGIN_NAME + '__main'  
        });  
    });  
      
    $(".menu .menu__list").eq(0).append(menuItem);  
      
    // Универсальный парсер ID  
    function extractPersonId(activity) {
        if (!activity) return null;
        if (activity.id) return parseInt(activity.id, 10);
        if (activity.params && activity.params.id) return parseInt(activity.params.id, 10);
        if (activity.object && activity.object.id) return parseInt(activity.object.id, 10);
        return null;
    }

    function checkAndAttach(activity) {
        if (!activity) return;
        var comp = activity.component;
        if (comp === 'person' || comp === 'actor') {
            var id = extractPersonId(activity);
            if (id) {
                currentPersonId = id;
                log("[PERSON-PLUGIN] Target component active, ID:", currentPersonId);
                addSubscribeButton();
            }
        }
    }
      
    // Следим за изменениями активности
    Lampa.Listener.follow('activity', function(e) {  
        log("[PERSON-PLUGIN] Activity event:", e.type, "component:", e.component);  
          
        if (e.type === 'start' || e.type === 'render') {  
            checkAndAttach(e);
        }  
        else if (e.type === 'resume') {
            if (e.component === 'category_full' && e.object && e.object.source === PLUGIN_NAME) {  
                log("[PERSON-PLUGIN] Persons list resumed");  
                setTimeout(function() { Lampa.Activity.reload(); }, 100);  
            } else {
                checkAndAttach(e);
            }
        }  
    });  
  
    // Быстрая проверка на старте  
    setTimeout(function() {
        checkAndAttach(Lampa.Activity.active());
    }, 1000);  
      
    addButtonStyles();  
}  

if (window.appready) {  
    startPlugin();  
} else {  
    Lampa.Listener.follow('app', function(e) {  
        if (e.type === 'ready') {  
            startPlugin();  
        }  
    });  
}
}();
