!function() {
"use strict";

var PLUGIN_NAME = "persons_plugin";  
var PERSONS_KEY = "saved_persons";  
var PAGE_SIZE = 20;  
var DEFAULT_PERSON_IDS = [];  
var currentPersonId = null;  
var my_logging = true; 

var pluginTranslations = {  
    persons_title: { ru: "Персоны", en: "Persons", uk: "Персони" },  
    subscribe: { ru: "Подписаться", en: "Subscribe", uk: "Підписатися" },  
    unsubscribe: { ru: "Отписаться", en: "Unsubscribe", uk: "Відписатися" },  
    persons_not_found: { ru: "Персоны не найдены", en: "No persons found", uk: "Особи не знайдені" }  
};  
  
var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';  
  
function log() { if (my_logging && console.log) console.log.apply(console, arguments); }  
function error() { if (my_logging && console.error) console.error.apply(console, arguments); }  
  
function getCurrentLanguage() { return Lampa.Storage.get('language', 'ru'); }  
  
function initStorage() {  
    if (!Lampa.Storage.get(PERSONS_KEY)) Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);  
}  
  
function getPersonIds() { return Lampa.Storage.get(PERSONS_KEY, []); }  
  
function togglePersonSubscription(personId) {  
    var personIds = getPersonIds();  
    var index = personIds.indexOf(personId);  
    if (index === -1) personIds.push(personId);  
    else personIds.splice(index, 1);  
    Lampa.Storage.set(PERSONS_KEY, personIds);  
    return index === -1;  
}  
  
function isPersonSubscribed(personId) { return getPersonIds().indexOf(personId) !== -1; }  

function addButtonStyles() {  
    if (document.getElementById('subscribe-button-styles')) return;  
    $('<style id="subscribe-button-styles">.button--subscribe-plugin.button--subscribe { color: #4CAF50; } .button--subscribe-plugin.button--unsubscribe { color: #F44336; }</style>').appendTo('head');  
}

function addButtonToContainer(bottomBlock) {  
    $('.button--subscribe-plugin', bottomBlock).remove();  
      
    var isSubscribed = isPersonSubscribed(currentPersonId);  
    var buttonText = isSubscribed ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe');  
      
    var button = $('<div class="full-start__button selector button--subscribe-plugin ' + (isSubscribed ? 'button--unsubscribe' : 'button--subscribe') + '" data-focusable="true">' +  
        '<svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path><path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path></svg>' +  
        '<span>' + buttonText + '</span></div>');  
      
    button.on('hover:enter', function() {  
        var wasAdded = togglePersonSubscription(currentPersonId);  
        button.toggleClass('button--subscribe button--unsubscribe')  
              .find('span').text(wasAdded ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe'));  
    });  

    var container = $('.full-start__buttons', bottomBlock);
    if (container.length) container.append(button); else $(bottomBlock).append(button);
}  

function PersonsService() {  
    var cache = {};  
    this.list = function(params, onComplete, onError) {  
        var page = parseInt(params.page, 10) || 1;  
        var personIds = getPersonIds();  
        var pageIds = personIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);  
          
        if (pageIds.length === 0) return onComplete({ results: [], page: page, total_pages: 0 });  
          
        var loaded = 0, results = [];  
        pageIds.forEach(function(id) {  
            if (cache[id]) { results.push(cache[id]); check(); }  
            else {  
                var url = Lampa.TMDB.api('person/' + id + '?api_key=' + Lampa.TMDB.key() + '&language=' + getCurrentLanguage());  
                new Lampa.Reguest().silent(url, function(json) {  
                    if (json && json.id) {  
                        var card = {  
                            id: json.id,  
                            title: json.name,  
                            name: json.name,  
                            img: json.profile_path ? Lampa.TMDB.image(json.profile_path) : '', 
                            poster_path: json.profile_path,  
                            method: "actor", // ИСПРАВЛЕНИЕ: Это заставляет Lampa открывать страницу актера
                            type: "actor",  
                            source: "tmdb"  
                        };  
                        cache[id] = card;  
                        results.push(card);  
                    }  
                    check();  
                }, check);  
            }  
        });  
          
        function check() {  
            loaded++;  
            if (loaded >= pageIds.length) {  
                onComplete({ results: results, page: page, total_pages: Math.ceil(personIds.length / PAGE_SIZE) });  
            }  
        }  
    };  
}  

function startPlugin() {  
    Lampa.Lang.add({  
        persons_plugin_title: pluginTranslations.persons_title,  
        persons_plugin_subscribe: pluginTranslations.subscribe,  
        persons_plugin_unsubscribe: pluginTranslations.unsubscribe,  
        persons_plugin_not_found: pluginTranslations.persons_not_found  
    });  
      
    initStorage();  
    addButtonStyles();
    Lampa.Api.sources[PLUGIN_NAME] = new PersonsService();  
      
    var menuItem = $('<li class="menu__item selector" data-action="' + PLUGIN_NAME + '"><div class="menu__ico">' + ICON_SVG + '</div><div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div></li>');  
    menuItem.on("hover:enter", function() {  
        Lampa.Activity.push({ component: "category_full", source: PLUGIN_NAME, title: Lampa.Lang.translate('persons_plugin_title'), page: 1, url: PLUGIN_NAME });  
    });  
    $(".menu .menu__list").eq(0).append(menuItem);  
      
    Lampa.Listener.follow('activity', function(e) {  
        if (e.type === 'start' && e.component === 'actor') {  
            currentPersonId = e.object.id;  
            var wait = setInterval(function() {  
                var container = $('.person-start__bottom');  
                if (container.length) { clearInterval(wait); addButtonToContainer(container[0]); }  
            }, 200);  
            setTimeout(function() { clearInterval(wait); }, 5000);  
        }  
    });  
}  

if (window.appready) startPlugin();  
else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') startPlugin(); });  

}();
