// persons_plugin_with_folders.js
// Версия с поддержкой папок (категорий)

(function() {
    "use strict";

    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;
    var DEFAULT_FOLDERS = { "Без категории": [] };
    var currentPersonId = null;
    var currentFolder = "Без категории";
    var my_logging = true;

    var pluginTranslations = {
        persons_title: {
            ru: "Персоны", en: "Persons", uk: "Персони", be: "Асобы", pt: "Pessoas", zh: "人物", he: "אנשים", cs: "Osobnosti", bg: "Личности"
        },
        create_folder: {
            ru: "Создать папку", en: "Create folder"
        },
        subscribe: {
            ru: "Подписаться", en: "Subscribe"
        },
        unsubscribe: {
            ru: "Отписаться", en: "Unsubscribe"
        },
        persons_not_found: {
            ru: "Персоны не найдены", en: "No persons found"
        }
    };

    function log() {
        if (my_logging && console && console.log) {
            try { console.log.apply(console, arguments); } catch (e) {}
        }
    }

    function error() {
        if (my_logging && console && console.error) {
            try { console.error.apply(console, arguments); } catch (e) {}
        }
    }

    function getFolders() {
        return Lampa.Storage.get(PERSONS_KEY, DEFAULT_FOLDERS);
    }

    function saveFolders(folders) {
        Lampa.Storage.set(PERSONS_KEY, folders);
    }

    function getPersonIds(folder) {
        var all = getFolders();
        return all[folder] || [];
    }

    function togglePersonSubscription(personId, folder) {
        var folders = getFolders();
        if (!folders[folder]) folders[folder] = [];

        var index = folders[folder].indexOf(personId);
        if (index === -1) {
            folders[folder].push(personId);
        } else {
            folders[folder].splice(index, 1);
        }

        saveFolders(folders);
        return index === -1;
    }

    function isPersonSubscribed(personId, folder) {
        var ids = getPersonIds(folder);
        return ids.includes(personId);
    }

    function startPlugin() {
        Lampa.Lang.add({
            persons_plugin_title: pluginTranslations.persons_title,
            persons_plugin_subscribe: pluginTranslations.subscribe,
            persons_plugin_unsubscribe: pluginTranslations.unsubscribe,
            persons_plugin_not_found: pluginTranslations.persons_not_found,
            persons_plugin_create_folder: pluginTranslations.create_folder,
            persons_title: pluginTranslations.persons_title
        });

        var folders = getFolders();

        var menuItem = $('<li class="menu__item selector" data-action="' + PLUGIN_NAME + '">' +
            '<div class="menu__ico"><svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg></div>' +
            '<div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div>' +
        '</li>');

        menuItem.on("hover:enter", function() {
            var items = [];

            for (var name in folders) {
                items.push({
                    title: name,
                    folder: name,
                    component: 'category_full',
                    source: PLUGIN_NAME,
                    page: 1,
                    url: PLUGIN_NAME + '__' + encodeURIComponent(name)
                });
            }

            items.push({
                title: Lampa.Lang.translate('persons_plugin_create_folder'),
                component: 'create_folder'
            });

            Lampa.Activity.push({
                component: 'items',
                title: Lampa.Lang.translate('persons_plugin_title'),
                items: items,
                onSelect: function(item) {
                    if (item.component === 'create_folder') {
                        Lampa.Input.text(Lampa.Lang.translate('persons_plugin_create_folder'), '', function(value) {
                            if (!folders[value]) {
                                folders[value] = [];
                                saveFolders(folders);
                                Lampa.Noty.show('Папка создана');
                            }
                        });
                    } else {
                        Lampa.Activity.push({
                            component: 'category_full',
                            source: PLUGIN_NAME,
                            title: item.title,
                            page: 1,
                            folder: item.folder,
                            url: item.url
                        });
                    }
                }
            });
        });

        $('.menu .menu__list').eq(0).append(menuItem);

        Lampa.Api.sources[PLUGIN_NAME] = {
            list: function(params, onComplete, onError) {
                var folder = params.folder || currentFolder;
                var ids = getPersonIds(folder);
                var page = params.page || 1;
                var start = (page - 1) * PAGE_SIZE;
                var end = start + PAGE_SIZE;
                var pageIds = ids.slice(start, end);

                var results = [];
                var loaded = 0;

                if (pageIds.length === 0) {
                    onComplete({ results: [], page: 1, total_pages: 1, total_results: 0 });
                    return;
                }

                var lang = localStorage.getItem('language') || 'en';

                pageIds.forEach(function(id) {
                    var url = Lampa.TMDB.api('person/' + id + '?api_key=' + Lampa.TMDB.key() + '&language=' + lang);

                    new Lampa.Reguest().silent(url, function(data) {
                        results.push({
                            id: data.id,
                            title: data.name,
                            name: data.name,
                            poster_path: data.profile_path,
                            type: 'actor',
                            source: 'tmdb'
                        });
                        check();
                    }, function() {
                        check();
                    });
                });

                function check() {
                    loaded++;
                    if (loaded >= pageIds.length) {
                        onComplete({
                            results: results,
                            page: page,
                            total_pages: Math.ceil(ids.length / PAGE_SIZE),
                            total_results: ids.length
                        });
                    }
                }
            }
        };
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function(e) { if (e.type === 'ready') startPlugin(); });

})();
