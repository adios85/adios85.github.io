!function() {
    "use strict";

    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;
    var currentPersonId = null;
    var my_logging = true;

    function log() {
        if (my_logging) console.log.apply(console, arguments);
    }

    function getPersonIds() {
        return Lampa.Storage.get(PERSONS_KEY, []);
    }

    function togglePersonSubscription(id) {
        var list = getPersonIds();
        var i = list.indexOf(id);

        if (i === -1) list.push(id);
        else list.splice(i, 1);

        Lampa.Storage.set(PERSONS_KEY, list);
        return i === -1;
    }

    function isSubscribed(id) {
        return getPersonIds().includes(id);
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
            else if (i++ < 20) setTimeout(check, 200);
        })();
    }

    function addButton(container) {
        if (!currentPersonId) return;

        var old = container.querySelector('.button--subscribe-plugin');
        if (old) old.remove();

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector button--subscribe-plugin';

        function update() {
            btn.innerHTML = '<span>' + (isSubscribed(currentPersonId) ? 'Отписаться' : 'Подписаться') + '</span>';
        }

        update();

        btn.addEventListener('hover:enter', function() {
            togglePersonSubscription(currentPersonId);
            update();
        });

        container.appendChild(btn);

        log("BUTTON ADDED");
    }

    function PersonsService() {
        var cache = {};

        this.list = function(params, done) {
            var page = parseInt(params.page || 1, 10);
            var ids = getPersonIds();

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
                        component: "actor",

                        source: "tmdb", // ← КЛЮЧЕВОЕ
                        media_type: "person"
                    };

                    log("CARD:", card);

                    cache[id] = card;
                    results.push(card);

                    check();
                }, check);
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
    }

    function start() {

        if (!Lampa.Storage.get(PERSONS_KEY)) {
            Lampa.Storage.set(PERSONS_KEY, []);
        }

        Lampa.Api.sources[PLUGIN_NAME] = new PersonsService();

        // меню
        var item = $('<li class="menu__item selector"><div class="menu__text">Персоны</div></li>');

        item.on('hover:enter', function() {
            Lampa.Activity.push({
                component: "category_full",
                source: PLUGIN_NAME,
                title: "Персоны"
            });
        });

        $('.menu .menu__list').eq(0).append(item);

        // события
        Lampa.Listener.follow('activity', function(e) {

            if (e.type === 'start' && (e.component === 'actor' || e.component === 'person')) {

                currentPersonId = detectId(e);

                log("ID:", currentPersonId);

                if (currentPersonId) {
                    waitContainer(function(el) {
                        addButton(el);
                    });
                }
            }
        });

        // если уже на странице актера
        setTimeout(function() {
            var act = Lampa.Activity.active();

            if (act && (act.component === 'actor' || act.component === 'person')) {
                currentPersonId = detectId(act);

                if (currentPersonId) {
                    waitContainer(addButton);
                }
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
