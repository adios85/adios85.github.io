(function () {
    'use strict';

    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;

    // Инициализация хранилища
    if (!Lampa.Storage.get(PERSONS_KEY)) {
        Lampa.Storage.set(PERSONS_KEY,);
    }

    // Сервис получения данных (нормализация по стандартам Lampa Activity)
    function PersonsService() {
        var cache = {};
        this.list = function (params, onComplete) {
            var page = parseInt(params.page, 10) |

| 1;
            var personIds = Lampa.Storage.get(PERSONS_KEY,);
            var pageIds = personIds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            if (pageIds.length === 0) return onComplete({ results:, page: page, total_pages: 0 });

            var loaded = 0, results =;
            pageIds.forEach(function (id) {
                if (cache[id]) { results.push(cache[id]); check(); }
                else {
                    var url = Lampa.TMDB.api('person/' + id + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language', 'ru'));
                    new Lampa.Reguest().silent(url, function (json) {
                        if (json && json.id) {
                            // Формирование объекта согласно архитектурным требованиям профиля актера 
                            var card = {
                                id: json.id,
                                title: json.name,
                                name: json.name,
                                img: json.profile_path? Lampa.TMDB.image(json.profile_path) : '',
                                poster_path: json.profile_path,
                                type: "actor",     // Базовый тип
                                method: "actor",   // Метод для API Lampac [1]
                                component: "actor", // Прямое указание UI-компонента (критично для навигации) [1]
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
        // Добавление переводов
        Lampa.Lang.add({
            persons_title: { ru: 'Персоны', en: 'Persons', uk: 'Персони' },
            persons_subscribe: { ru: 'Подписаться', en: 'Subscribe', uk: 'Підписатися' },
            persons_unsubscribe: { ru: 'Отписаться', en: 'Unsubscribe', uk: 'Відписатися' }
        });

        // Регистрация источника
        Lampa.Api.sources[PLUGIN_NAME] = new PersonsService();

        // Создание пункта меню
        var menu_item = $('<li class="menu__item selector" data-action="' + PLUGIN_NAME + '">' +
            '<div class="menu__ico"><svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg></div>' +
            '<div class="menu__text">' + Lampa.Lang.translate('persons_title') + '</div>' +
            '</li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                component: "category_full",
                source: PLUGIN_NAME,
                title: Lampa.Lang.translate('persons_title'),
                page: 1,
                url: PLUGIN_NAME
            });
        });

        $('.menu.menu__list').eq(0).append(menu_item);

        // Принудительный перехват кликов для защиты навигации [1]
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'click' && e.item && (e.item.type == 'actor' |

| e.item.method == 'actor')) {
                e.item.component = 'actor'; // Гарантируем открытие профиля вместо фильма
            }
        });

        // Кнопка подписки на странице актера
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' && e.component === 'actor') {
                var actor_id = e.object.id;
                var wait_render = setInterval(function () {
                    var container = $('.person-start__bottom');
                    if (container.length) {
                        clearInterval(wait_render);
                        renderSubscribeButton(container, actor_id);
                    }
                }, 200);
                setTimeout(function () { clearInterval(wait_render); }, 5000);
            }
        });
    }

    function renderSubscribeButton(container, id) {
        $('.btn-person-subscribe').remove();
        var ids = Lampa.Storage.get(PERSONS_KEY,);
        var is_sub = ids.indexOf(id)!== -1;
        
        var btn = $('<div class="full-start__button selector btn-person-subscribe" data-focusable="true" style="color:' + (is_sub? '#F44336' : '#4CAF50') + '">' +
            '<span>' + Lampa.Lang.translate(is_sub? 'persons_unsubscribe' : 'persons_subscribe') + '</span>' +
            '</div>');

        btn.on('hover:enter', function () {
            var current = Lampa.Storage.get(PERSONS_KEY,);
            var idx = current.indexOf(id);
            if (idx === -1) current.push(id);
            else current.splice(idx, 1);
            Lampa.Storage.set(PERSONS_KEY, current);
            renderSubscribeButton(container, id); // Перерисовать
        });

        var target = container.find('.full-start__buttons');
        if (target.length) target.append(btn); else container.append(btn);
    }

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
})();
