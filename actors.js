(function () {
    'use strict';

    var PLUGIN_NAME = 'persons_plugin';
    var STORAGE_KEY = 'persons_favorites';
    var PAGE_SIZE = 20;

    var currentCard = null;

    function log() {
        console.log.apply(console, arguments);
    }

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

        if (index === -1) {
            list.push({
                id: card.id,
                type: 'person',                 // 🔥 КРИТИЧЕСКИЙ ФИКС
                title: card.name,
                name: card.name,
                poster_path: card.profile_path,
                profile_path: card.profile_path
            });
        } else {
            list.splice(index, 1);
        }

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

        if (!id) {
            var match = location.pathname.match(/(person|actor)\/(\d+)/);
            if (match) id = match[2];
        }

        if (!id) return null;

        var name =
            obj.name ||
            obj.title ||
            document.querySelector('.full-start__title')?.innerText ||
            'Actor';

        var poster =
            obj.profile_path ||
            document.querySelector('.full-start__poster img')?.getAttribute('src') ||
            '';

        return {
            id: parseInt(id, 10),
            name: name,
            profile_path: poster
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
            toggle(currentCard);
            render();
        });

        container.appendChild(btn);

        log('BUTTON OK:', currentCard);
    }

    // ================= SOURCE =================

    function PersonsSource() {
        var cache = {};

        this.list = function (params, done) {
            var page = parseInt(params.page || 1, 10);
            var list = getList();

            var slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            if (!slice.length) {
                done({ results: [] });
                return;
            }

            var loaded = 0;
            var results = [];

            slice.forEach(function (item) {

                if (cache[item.id]) {
                    results.push(cache[item.id]);
                    return check();
                }

                var url = Lampa.TMDB.api(
                    'person/' + item.id +
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

                        component: 'person',   // ✅ фикс
                        method: 'person',

                        source: 'tmdb',
                        media_type: 'person',

                        url: 'person/' + j.id  // ✅ фикс
                    };

                    cache[item.id] = card;
                    results.push(card);

                    log('CARD OK:', card);

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
                        total_pages: Math.ceil(list.length / PAGE_SIZE)
                    });
                }
            }
        };

        // фикс ошибки full()
        this.full = function (params, onComplete, onError) {
            if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.full) {
                Lampa.Api.sources.tmdb.full(params, onComplete, onError);
            } else {
                onError && onError();
            }
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

                log('OPEN:', currentCard);

                if (currentCard) {
                    waitContainer(addButton);
                }
            }
        });

        // если уже открыт
        setTimeout(function () {
            var act = Lampa.Activity.active();

            if (act && (act.component === 'person' || act.component === 'actor')) {
                currentCard = detectCard(act);

                if (currentCard) {
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
