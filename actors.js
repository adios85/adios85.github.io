!function() {
    "use strict";

    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;
    var DEFAULT_PERSON_IDS = [];
    var currentPersonId = null;
    var my_logging = true;

    function log() {
        if (my_logging) console.log.apply(console, arguments);
    }

    function error() {
        if (my_logging) console.error.apply(console, arguments);
    }

    function getCurrentLanguage() {
        return localStorage.getItem('language') || 'en';
    }

    function initStorage() {
        if (!Lampa.Storage.get(PERSONS_KEY)) {
            Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS);
        }
    }

    function getPersonIds() {
        return Lampa.Storage.get(PERSONS_KEY, []);
    }

    function togglePersonSubscription(id) {
        var list = getPersonIds();
        var index = list.indexOf(id);

        if (index === -1) list.push(id);
        else list.splice(index, 1);

        Lampa.Storage.set(PERSONS_KEY, list);
        return index === -1;
    }

    function isPersonSubscribed(id) {
        return getPersonIds().includes(id);
    }

    function addSubscribeButton() {
        if (!currentPersonId) return;

        var container = document.querySelector('.person-start__bottom');
        if (!container) return;

        var old = container.querySelector('.button--subscribe-plugin');
        if (old) old.remove();

        var isSub = isPersonSubscribed(currentPersonId);

        var btn = document.createElement('div');
        btn.className = 'full-start__button selector button--subscribe-plugin';
        btn.innerHTML = '<span>' + (isSub ? 'Отписаться' : 'Подписаться') + '</span>';

        btn.addEventListener('hover:enter', function() {
            var added = togglePersonSubscription(currentPersonId);
            btn.querySelector('span').textContent = added ? 'Отписаться' : 'Подписаться';
        });

        container.appendChild(btn);
    }

    function waitForContainer(callback) {
        var i = 0;
        function check() {
            var el = document.querySelector('.person-start__bottom');
            if (el) callback();
            else if (i++ < 15) setTimeout(check, 200);
        }
        check();
    }

    function detectPersonId(activity) {
        if (!activity) return null;

        if (activity.id) return parseInt(activity.id, 10);
        if (activity.object && activity.object.id) return parseInt(activity.object.id, 10);
        if (activity.params && activity.params.id) return parseInt(activity.params.id, 10);

        var match = location.pathname.match(/(actor|person)\/(\d+)/);
        if (match) return parseInt(match[2], 10);

        return null;
    }

    function PersonsService() {
        var cache = {};

        this.list = function(params, onComplete) {
            var page = parseInt(params.page || 1, 10);
            var ids = getPersonIds();

            var slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

            if (!slice.length) {
                onComplete({ results: [] });
                return;
            }

            var loaded = 0;
            var results = [];

            slice.forEach(function(id) {

                if (cache[id]) {
                    results.push(cache[id]);
                    check();
                    return;
                }

                var url = Lampa.TMDB.api(
                    'person/' + id +
                    '?api_key=' + Lampa.TMDB.key() +
                    '&language=' + getCurrentLanguage()
                );

                new Lampa.Reguest().silent(url, function(r) {
                    var json = typeof r === 'string' ? JSON.parse(r) : r;

                    var card = {
                        id: parseInt(json.id, 10),
                        title: json.name,
                        name: json.name,
                        poster_path: json.profile_path,
                        profile_path: json.profile_path,

                        type: "person",
                        card_type: "person",
                        component: "actor",

                        source: PLUGIN_NAME,
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
                    onComplete({
                        results: results,
                        page: page,
                        total_pages: Math.ceil(ids.length / PAGE_SIZE)
                    });
                }
            }
        };
    }

    function startPlugin() {

        initStorage();

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

                currentPersonId = detectPersonId(e);

                log("DETECTED ID:", currentPersonId);

                if (currentPersonId) {
                    waitForContainer(addSubscribeButton);
                }
            }
        });

        // проверка при запуске
        setTimeout(function() {
            var act = Lampa.Activity.active();

            if (act && (act.component === 'actor' || act.component === 'person')) {
                currentPersonId = detectPersonId(act);

                if (currentPersonId) {
                    waitForContainer(addSubscribeButton);
                }
            }
        }, 1000);
    }

    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') startPlugin();
        });
    }

}();
