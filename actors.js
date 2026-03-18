!function() {
    "use strict";

    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;
    var currentPersonId = null;
    var LOG = true;

    function log() {
        if (LOG) console.log.apply(console, arguments);
    }

    function getIds() {
        return Lampa.Storage.get(PERSONS_KEY, []);
    }

    function toggle(id) {
        var list = getIds();
        var i = list.indexOf(id);

        if (i === -1) list.push(id);
        else list.splice(i, 1);

        Lampa.Storage.set(PERSONS_KEY, list);
        return i === -1;
    }

    function isSaved(id) {
        return getIds().includes(id);
    }

    function detectId(activity) {
        if (!activity) return null;

        if (activity.id) return parseInt(activity.id, 10);
        if (activity.object && activity.object.id) return parseInt(activity.object.id, 10);
        if (activity.params && activity.params.id) return parseInt(activity.params.id, 10);

        var m = location.pathname.match(/(actor|person)\/(\d+)/);
        if (m) return parseInt(m[2], 10);

        return null;
    }

    function waitContainer(cb) {
        var i = 0;
        (function check() {
            var el = document.querySelector('.person-start__bottom');
            if (el) cb(el);
            else if (i++ < 25) setTimeout(check, 200);
        })();
    }

    function addButton(container) {
        if (!currentPersonId) return;

        var old = container.querySelector('.button--subscribe-plugin');
        if (old) old.remove();

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector button--subscribe-plugin';

        function render() {
            btn.innerHTML = '<span>' + (isSaved(currentPersonId) ? 'Отписаться' : 'Подписаться') + '</span>';
        }

        render();

        btn.addEventListener('hover:enter', function() {
            toggle(currentPersonId);
            render();
        });

        container.appendChild(btn);

        log("BUTTON ADDED:", currentPersonId);
    }

    function PersonsService() {
        var cache = {};

        this.list = function(params, done) {
            var page = parseInt(params.page || 1, 10);
            var ids = getIds();

            var slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            if (!slice.length) {
                done({ results: [] });
                return;
            }

            var loaded = 0;
            var results = [];

            slice.forEach(function(id) {

                if (cache[id]) {
                    results.push(cache[id]);
                    return check();
                }

                var url = Lampa.TMDB.api(
                    'person/' + id +
                    '?api_key=' + Lampa.TMDB.key() +
                    '&language=ru'
                );

                new Lampa.Reguest().silent(url, function(r) {

                    var j = typeof r === 'string' ? JSON.parse(r) : r;

                    var card = {
                        id: parseInt(j.id, 10),
                        title: j.name,
                        name: j.name,
                        poster_path: j.profile_path,
                        profile_path: j.profile_path,
                        type: "person",
                        card_type: "person",
                        component: "person",  // ✅ Жёсткий фикс
                        method: "person",     // ✅ Жёсткий фикс
                        url: "person/" + j.id,// ✅ Жёсткий фикс
                        source: "tmdb",
                        media_type: "person"
                    };

                    log("CARD FIXED:", card);

                    cache[id] = card;
                    results.push(card);

                    check();
                }, function() {
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

        // 🔥 Фикс full
        this.full = function(params, onComplete, onError) {
            if (params && params.method === "person") {
                // Если метод person → ничего не делаем, Lampa откроет actor-page
                onComplete && onComplete(params);
            } else if (Lampa.Api.sources.tmdb && Lampa.Api.sources.tmdb.full) {
                Lampa.Api.sources.tmdb.full(params, onComplete, onError);
            } else {
                onError && onError();
            }
        };
    }

    function start() {
        if (!Lampa.Storage.get(PERSONS_KEY)) Lampa.Storage.set(PERSONS_KEY, []);

        Lampa.Api.sources[PLUGIN_NAME] = new PersonsService();

        var item = $('<li class="menu__item selector"><div class="menu__text">Персоны</div></li>');

        item.on('hover:enter', function() {
            Lampa.Activity.push({
                component: "category_full",
                source: PLUGIN_NAME,
                title: "Персоны"
            });
        });

        $('.menu .menu__list').eq(0).append(item);

        Lampa.Listener.follow('activity', function(e) {

            if (e.type === 'start' && (e.component === 'actor' || e.component === 'person')) {

                currentPersonId = detectId(e);

                log("OPEN ACTOR:", currentPersonId);

                if (currentPersonId) waitContainer(addButton);
            }
        });

        setTimeout(function() {
            var act = Lampa.Activity.active();

            if (act && (act.component === 'actor' || act.component === 'person')) {
                currentPersonId = detectId(act);
                if (currentPersonId) waitContainer(addButton);
            }
        }, 1000);
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') start();
        });
    }

}();
