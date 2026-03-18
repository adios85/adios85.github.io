(function () {
    'use strict';

    var PLUGIN_NAME = 'persons_plugin';
    var STORAGE_KEY = 'persons_favorites';
    var PAGE_SIZE = 20;

    var currentCard = null;

    // ================= STORAGE =================

    function getList() {
        return Lampa.Storage.get(STORAGE_KEY, []);
    }

    function saveList(list) {
        Lampa.Storage.set(STORAGE_KEY, list);
    }

    function isSaved(id) {
        return getList().some(i => i.id === id);
    }

    function toggle(card) {
        var list = getList();
        var index = list.findIndex(i => i.id === card.id);

        if (index === -1) list.push(card);
        else list.splice(index, 1);

        saveList(list);
        return index === -1;
    }

    // ================= DETECT =================

    function detectCard(activity) {
        if (!activity) return null;

        var obj = activity.object || {};

        var id =
            obj.id ||
            activity.id ||
            (activity.params && activity.params.id);

        if (!id) return null;

        return {
            id: parseInt(id, 10),
            name: obj.name || obj.title || 'Actor',
            profile_path: obj.profile_path || ''
        };
    }

    function waitContainer(cb) {
        var tries = 0;

        (function check() {
            var el = document.querySelector('.person-start__bottom');

            if (el) cb(el);
            else if (tries++ < 30) setTimeout(check, 200);
        })();
    }

    // ================= BUTTON =================

    function addButton(container) {
        if (!currentCard) return;

        var old = container.querySelector('.persons-btn');
        if (old) old.remove();

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector persons-btn';

        function render() {
            btn.innerHTML = '<span>' + (isSaved(currentCard.id) ? 'Отписаться' : 'Подписаться') + '</span>';
        }

        render();

        btn.addEventListener('hover:enter', function () {
            toggle({
                id: currentCard.id,
                type: 'person',            // 🔥 важно
                name: currentCard.name,
                profile_path: currentCard.profile_path
            });

            render();
        });

        container.appendChild(btn);
    }

    // ================= SOURCE =================

    function PersonsSource() {

        this.list = function (params, done) {
            var page = parseInt(params.page || 1, 10);
            var list = getList();

            var slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            var results = slice.map(function (item) {

                return {
                    id: item.id,

                    title: item.name,
                    name: item.name,

                    poster_path: item.profile_path,
                    profile_path: item.profile_path,

                    type: 'person',
                    card_type: 'person',

                    component: 'person',
                    method: 'person',

                    source: PLUGIN_NAME,     // 🔥 НЕ tmdb
                    media_type: 'person'
                };
            });

            done({
                results: results,
                page: page,
                total_pages: Math.ceil(list.length / PAGE_SIZE)
            });
        };

        // 🔥 САМОЕ ГЛАВНОЕ — ручное открытие
        this.full = function (params, onComplete, onError) {

            var id = params.card.id;

            // напрямую открываем TMDB person
            Lampa.Activity.push({
                component: 'person',
                source: 'tmdb',
                method: 'person',
                id: id
            });

            onError && onError();
        };
    }

    // ================= INIT =================

    function start() {

        if (!Lampa.Storage.get(STORAGE_KEY)) {
            Lampa.Storage.set(STORAGE_KEY, []);
        }

        Lampa.Api.sources[PLUGIN_NAME] = new PersonsSource();

        // меню
        var item = $('<li class="menu__item selector"><div class="menu__text">Персоны</div></li>');

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                component: 'category_full',
                source: PLUGIN_NAME,
                title: 'Персоны'
            });
        });

        $('.menu .menu__list').eq(0).append(item);

        // отслеживание открытия актёра
        Lampa.Listener.follow('activity', function (e) {

            if (e.type === 'start' && (e.component === 'person' || e.component === 'actor')) {

                currentCard = detectCard(e);

                if (currentCard) {
                    waitContainer(addButton);
                }
            }
        });
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
