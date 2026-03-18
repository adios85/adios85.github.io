(function () {
    'use strict';

    var PLUGIN_NAME = 'persons_plugin';
    var STORAGE_KEY = 'persons_favorites';
    var PAGE_SIZE = 20;
    var currentId = null;

    function log() {
        console.log.apply(console, arguments);
    }

    function getList() {
        return Lampa.Storage.get(STORAGE_KEY, []);
    }

    function toggle(id) {
        var list = getList();
        var index = list.indexOf(id);

        if (index === -1) list.push(id);
        else list.splice(index, 1);

        Lampa.Storage.set(STORAGE_KEY, list);
        return index === -1;
    }

    function isSaved(id) {
        return getList().includes(id);
    }

    function detectId(activity) {
        if (!activity) return null;

        if (activity.id) return parseInt(activity.id, 10);
        if (activity.object && activity.object.id) return parseInt(activity.object.id, 10);
        if (activity.params && activity.params.id) return parseInt(activity.params.id, 10);

        var match = location.pathname.match(/(person|actor)\/(\d+)/);
        if (match) return parseInt(match[2], 10);

        return null;
    }

    function waitContainer(cb) {
        var tries = 0;
        (function check() {
            var el = document.querySelector('.person-start__bottom');
            if (el) cb(el);
            else if (tries++ < 30) setTimeout(check, 200);
        })();
    }

    function addButton(container) {
        if (!currentId) return;

        var old = container.querySelector('.persons-btn');
        if (old) old.remove();

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector persons-btn';

        function render() {
            btn.innerHTML = '<span>' + (isSaved(currentId) ? 'Отписаться' : 'Подписаться') + '</span>';
        }

        render();

        btn.addEventListener('hover:enter', function () {
            toggle(currentId);
            render();
        });

        container.appendChild(btn);

        log('BUTTON:', currentId);
    }

    function PersonsSource() {
        var cache = {};

        this.list = function (params, done) {
            var page = parseInt(params.page || 1, 10);
            var ids = getList();

            var slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            if (!slice.length) {
                done({ results: [] });
                return;
            }

            var loaded = 0;
            var results = [];

            slice.forEach(function (id) {

                if (cache[id]) {
                    results.push(cache[id]);
                    return check();
                }

                var url = Lampa.TMDB.api(
                    'person/' + id +
                    '?api_key=' + Lampa.TMDB.key() +
                    '&language=ru'
                );

                new Lampa.Reguest().silent(url, function (r) {

                    var j = typeof r === 'string' ? JSON.parse(r) : r;

                    var card = {
                        id: parseInt(j.id, 10),

                        title: j.name,
                        name: j.name,

                        poster_path: j.profile_path,
                        profile_path: j.profile_path,

                        type: 'person',
                        card_type: 'person',

                        component: 'person',   // 🔥 ГЛАВНЫЙ ФИКС
                        method: 'person',

                        source: 'tmdb',
                        media_type: 'person',

                        url: 'person/' + j.id  // 🔥 ГЛАВНЫЙ ФИКС
                    };

                    log('CARD OK:', card);

                    cache[id] = card;
                    results.push(card);

                    check();

                }, function () {
                    check();
                });
            });

            function check() {
                loaded++;
                if (loaded >= slice.length) {
                    done({
                        results: results,
                        page: page,
                        total_pages: Math.ceil(ids.length / PAGE_SIZE)
                    });
                }
            }
        };

        // 🔥 фикс ошибки full()
        this.full = function (params, onComplete, onError) {
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.full) {
                Lampa.Api.sources.tmdb.full(params, onComplete, onError);
            } else {
                onError && onError();
            }
        };
    }

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

        // отслеживание страницы актёра
        Lampa.Listener.follow('activity', function (e) {

            if (e.type === 'start' && (e.component === 'person' || e.component === 'actor')) {

                currentId = detectId(e);

                log('OPEN:', currentId);

                if (currentId) {
                    waitContainer(addButton);
                }
            }
        });

        // если уже открыта
        setTimeout(function () {
            var act = Lampa.Activity.active();

            if (act && (act.component === 'person' || act.component === 'actor')) {
                currentId = detectId(act);

                if (currentId) {
                    waitContainer(addButton);
                }
            }
        }, 1000);
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }

})();
