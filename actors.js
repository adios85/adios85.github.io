function PersonsService() {
    var self = this;
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
                                card_type: "person",
                                component: "actor",       // <-- ключевой момент
                                source: PLUGIN_NAME,      // <-- должен совпадать с твоим плагином
                                media_type: "person",
                                known_for_department: json.known_for_department || '',
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
                // Фильтруем пустые
                var validResults = results.filter(function(item) { return !!item; });

                // Сортируем по исходному порядку
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
