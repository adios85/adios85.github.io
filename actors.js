!function() {
    "use strict";

    // Конфигурация
    var PLUGIN_NAME = "persons_plugin";
    var PERSONS_KEY = "saved_persons";
    var PAGE_SIZE = 20;
    var DEFAULT_PERSON_IDS = [];
    var currentPersonId = null;
    var my_logging = true;

    // Переводы
    var pluginTranslations = {
        persons_title: {
            ru: "Персоны",
            en: "Persons",
            uk: "Персони",
            be: "Асобы",
            pt: "Pessoas",
            zh: "人物",
            he: "אנשים",
            cs: "Osobnosti",
            bg: "Личности"
        },
        subscribe: {
            ru: "Подписаться",
            en: "Subscribe",
            uk: "Підписатися",
            be: "Падпісацца",
            pt: "Inscrever",
            zh: "订阅",
            he: "הירשם",
            cs: "Přihlásit se",
            bg: "Абонирай се"
        },
        unsubscribe: {
            ru: "Отписаться",
            en: "Unsubscribe",
            uk: "Відписатися",
            be: "Адпісацца",
            pt: "Cancelar inscrição",
            zh: "退订",
            he: "בטל מנוי",
            cs: "Odhlásit se",
            bg: "Отписване"
        },
        persons_not_found: {
            ru: "Персоны не найдены",
            en: "No persons found",
            uk: "Особи не знайдені",
            be: "Асобы не знойдзены",
            pt: "Nenhuma pessoa encontrada",
            zh: "未找到人物",
            he: "לא נמצאו אנשים",
            cs: "Nebyly nalezeny žádné osoby",
            bg: "Не са намерени хора"
        }
    };

    // Иконка для меню
    var ICON_SVG = '<svg height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 11C17.66 11 18.99 9.66 18.99 8C18.99 6.34 17.66 5 16 5C14.34 5 13 6.34 13 8C13 9.66 14.34 11 16 11ZM8 11C9.66 11 10.99 9.66 10.99 8C10.99 6.34 9.66 5 8 5C6.34 5 5 6.34 5 8C5 9.66 6.34 11 8 11ZM8 13C5.67 13 1 14.17 1 16.5V19H15V16.5C15 14.17 10.33 13 8 13ZM16 13C15.71 13 15.38 13.02 15.03 13.05C16.19 13.89 17 15.02 17 16.5V19H23V16.5C23 14.17 18.33 13 16 13Z" fill="currentColor"/></svg>';

    // Логирование
    function log() { if (my_logging && console && console.log) { try { console.log.apply(console, arguments); } catch (e) {} } }
    function error() { if (my_logging && console && console.error) { try { console.error.apply(console, arguments); } catch (e) {} } }

    // Работа с хранилищем
    function getCurrentLanguage() { return localStorage.getItem('language') || 'en'; }
    function initStorage() { var current = Lampa.Storage.get(PERSONS_KEY); if (!current || current.length === 0) { Lampa.Storage.set(PERSONS_KEY, DEFAULT_PERSON_IDS); } }
    function getPersonIds() { return Lampa.Storage.get(PERSONS_KEY, []); }
    function togglePersonSubscription(personId) { var personIds = getPersonIds(); var index = personIds.indexOf(personId); if (index === -1) { personIds.push(personId); } else { personIds.splice(index, 1); } Lampa.Storage.set(PERSONS_KEY, personIds); return index === -1; }
    function isPersonSubscribed(personId) { return getPersonIds().includes(personId); }

    // --- Кнопка подписки на странице актёра (без изменений) ---
    function addButtonToContainer(bottomBlock) {
        log("[PERSON-PLUGIN] Container found, adding button");
        var existingButton = bottomBlock.querySelector('.button--subscribe-plugin');
        if (existingButton && existingButton.parentNode) existingButton.parentNode.removeChild(existingButton);
        var isSubscribed = isPersonSubscribed(currentPersonId);
        var buttonText = isSubscribed ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe');
        var button = document.createElement('div');
        button.className = 'full-start__button selector button--subscribe-plugin';
        button.classList.add(isSubscribed ? 'button--unsubscribe' : 'button--subscribe');
        button.setAttribute('data-focusable', 'true');
        button.innerHTML = '<svg width="25" height="30" viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path><path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.5" fill="transparent"></path></svg><span>' + buttonText + '</span>';
        button.addEventListener('hover:enter', function() {
            var wasAdded = togglePersonSubscription(currentPersonId);
            var newText = wasAdded ? Lampa.Lang.translate('persons_plugin_unsubscribe') : Lampa.Lang.translate('persons_plugin_subscribe');
            button.classList.remove('button--subscribe', 'button--unsubscribe');
            button.classList.add(wasAdded ? 'button--unsubscribe' : 'button--subscribe');
            var span = button.querySelector('span'); if (span) span.textContent = newText;
            updatePersonsList();
        });
        var buttonsContainer = bottomBlock.querySelector('.full-start__buttons');
        if (buttonsContainer) { buttonsContainer.append(button); } else { bottomBlock.append(button); }
        log("[PERSON-PLUGIN] Button added successfully");
        return button;
    }
    function addSubscribeButton() {
        if (!currentPersonId) { error("[PERSON-PLUGIN] Cannot add button: currentPersonId is null"); return; }
        var bottomBlock = document.querySelector('.person-start__bottom');
        if (bottomBlock) { addButtonToContainer(bottomBlock); } else {
            log("[PERSON-PLUGIN] Waiting for container to appear...");
            var attempts = 0, maxAttempts = 10;
            function checkContainer() { attempts++; var container = document.querySelector('.person-start__bottom'); if (container) { addButtonToContainer(container); } else if (attempts < maxAttempts) { setTimeout(checkContainer, 300); } else { error("[PERSON-PLUGIN] Container not found after max attempts"); } }
            setTimeout(checkContainer, 300);
        }
    }
    function updatePersonsList() {
        // При обновлении подписки перезагружаем наш компонент, если он активен
        var activity = Lampa.Activity.active();
        if (activity && activity.component === 'persons_list') {
            Lampa.Activity.reload();
        }
    }
    function addButtonStyles() {
        if (document.getElementById('subscribe-button-styles')) return;
        var css = '.full-start__button.selector.button--subscribe-plugin.button--subscribe { color: #4CAF50; } .full-start__button.selector.button--subscribe-plugin.button--unsubscribe { color: #F44336; }';
        var style = document.createElement('style'); style.id = 'subscribe-button-styles'; style.textContent = css; document.head.appendChild(style);
    }

    // --- Собственный компонент для списка персон ---
    function PersonsListComponent() {
        // Этот компонент будет зарегистрирован в Lampa.Component
    }

    PersonsListComponent.prototype = {
        constructor: PersonsListComponent,
        name: 'persons_list',
        render: function(data) {
            var page = data.page || 1;
            var personIds = getPersonIds();
            var start = (page - 1) * PAGE_SIZE;
            var end = start + PAGE_SIZE;
            var pageIds = personIds.slice(start, end);
            var totalPages = Math.ceil(personIds.length / PAGE_SIZE);

            // Создаём корневой элемент
            var container = document.createElement('div');
            container.className = 'category full-start persons-list';

            // Заголовок
            var title = document.createElement('div');
            title.className = 'full-start__header';
            title.innerHTML = '<div class="full-start__title">' + Lampa.Lang.translate('persons_plugin_title') + '</div>';
            container.appendChild(title);

            if (pageIds.length === 0) {
                var empty = document.createElement('div');
                empty.className = 'category__empty';
                empty.textContent = Lampa.Lang.translate('persons_plugin_not_found');
                container.appendChild(empty);
                return container;
            }

            // Сетка карточек
            var items = document.createElement('div');
            items.className = 'category__items';

            // Загружаем данные каждой персоны
            var loaded = 0;
            var currentLang = getCurrentLanguage();

            for (var i = 0; i < pageIds.length; i++) {
                (function(index) {
                    var personId = pageIds[index];
                    var path = 'person/' + personId + '?api_key=' + Lampa.TMDB.key() + '&language=' + currentLang;
                    var url = Lampa.TMDB.api(path);

                    new Lampa.Reguest().silent(url, function(response) {
                        try {
                            var json = typeof response === 'string' ? JSON.parse(response) : response;
                            if (json && json.id) {
                                var card = createPersonCard(json);
                                items.appendChild(card);
                            }
                        } catch (e) {
                            error("[PERSON-PLUGIN] Error loading person", personId, e);
                        }
                        loaded++;
                        if (loaded === pageIds.length) {
                            // Все карточки добавлены, можно вставлять в контейнер
                            container.appendChild(items);
                            // Добавляем пагинацию, если нужно
                            if (totalPages > 1) {
                                var pagination = createPagination(page, totalPages);
                                container.appendChild(pagination);
                            }
                        }
                    }, function() {
                        loaded++;
                        if (loaded === pageIds.length) {
                            container.appendChild(items);
                            if (totalPages > 1) {
                                var pagination = createPagination(page, totalPages);
                                container.appendChild(pagination);
                            }
                        }
                    });
                })(i);
            }

            // Если страница пустая (все запросы ещё не завершились), показываем прелоадер
            if (pageIds.length > 0) {
                var loader = document.createElement('div');
                loader.className = 'category__preloader';
                container.appendChild(loader);
            }

            return container;
        }
    };

    // Функция создания карточки персоны
    function createPersonCard(json) {
        var card = document.createElement('div');
        card.className = 'category__card persons-list__card selector';
        card.setAttribute('data-id', json.id);
        card.setAttribute('data-focusable', 'true');
        card.setAttribute('data-title', json.name);

        var poster = json.profile_path ? 'https://image.tmdb.org/t/p/w185' + json.profile_path : '';
        var posterHtml = poster ? '<img src="' + poster + '" loading="lazy">' : '<div class="category__card--noimage">?</div>';

        card.innerHTML = '<div class="category__card-poster">' + posterHtml + '</div>' +
                        '<div class="category__card-title">' + json.name + '</div>' +
                        (json.known_for_department ? '<div class="category__card-subtitle">' + json.known_for_department + '</div>' : '');

        // Обработчик клика
        card.addEventListener('hover:enter', function(e) {
            e.stopPropagation();
            e.preventDefault();
            log("[PERSON-PLUGIN] Custom component click: open actor", json.id);
            Lampa.Activity.push({
                component: "actor",
                id: json.id,
                title: json.name,
                params: { id: json.id, name: json.name }
            });
            return false;
        });

        card.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            Lampa.Activity.push({
                component: "actor",
                id: json.id,
                title: json.name,
                params: { id: json.id, name: json.name }
            });
            return false;
        });

        return card;
    }

    // Функция создания пагинации
    function createPagination(currentPage, totalPages) {
        var pagination = document.createElement('div');
        pagination.className = 'full-start__pagination';

        var prev = document.createElement('div');
        prev.className = 'full-start__page selector' + (currentPage > 1 ? '' : ' disabled');
        prev.textContent = '◀';
        if (currentPage > 1) {
            prev.addEventListener('hover:enter', function() {
                Lampa.Activity.push({
                    component: 'persons_list',
                    page: currentPage - 1
                }, true); // replace=true
            });
        }
        pagination.appendChild(prev);

        var pageSpan = document.createElement('span');
        pageSpan.className = 'full-start__page-current';
        pageSpan.textContent = currentPage + ' / ' + totalPages;
        pagination.appendChild(pageSpan);

        var next = document.createElement('div');
        next.className = 'full-start__page selector' + (currentPage < totalPages ? '' : ' disabled');
        next.textContent = '▶';
        if (currentPage < totalPages) {
            next.addEventListener('hover:enter', function() {
                Lampa.Activity.push({
                    component: 'persons_list',
                    page: currentPage + 1
                }, true);
            });
        }
        pagination.appendChild(next);

        return pagination;
    }

    // --- Запуск плагина ---
    function startPlugin() {
        // Добавляем переводы
        Lampa.Lang.add({
            persons_plugin_title: pluginTranslations.persons_title,
            persons_plugin_subscribe: pluginTranslations.subscribe,
            persons_plugin_unsubscribe: pluginTranslations.unsubscribe,
            persons_plugin_not_found: pluginTranslations.persons_not_found,
            persons_title: pluginTranslations.persons_title
        });

        initStorage();

        // Регистрируем наш собственный компонент
        Lampa.Component.add('persons_list', new PersonsListComponent());

        // Создаём пункт меню
        var menuItem = $(
            '<li class="menu__item selector" data-action="persons_list">' +
                '<div class="menu__ico">' + ICON_SVG + '</div>' +
                '<div class="menu__text">' + Lampa.Lang.translate('persons_plugin_title') + '</div>' +
            '</li>'
        );

        menuItem.on("hover:enter", function() {
            Lampa.Activity.push({
                component: "persons_list",
                page: 1
            });
        });

        $(".menu .menu__list").eq(0).append(menuItem);

        // Обработчики для страницы актёра (кнопка подписки)
        function waitForContainer(callback) {
            log("[PERSON-PLUGIN] Waiting for container...");
            var attempts = 0, maxAttempts = 15, containerSelector = '.person-start__bottom';
            function check() {
                attempts++;
                var container = document.querySelector(containerSelector);
                if (container) {
                    log("[PERSON-PLUGIN] Container found after", attempts, "attempts");
                    callback();
                } else if (attempts < maxAttempts) {
                    setTimeout(check, 200);
                } else {
                    error("[PERSON-PLUGIN] Container not found after max attempts");
                }
            }
            if (document.querySelector(containerSelector)) {
                callback();
            } else {
                setTimeout(check, 300);
            }
        }

        function checkCurrentActivity() {
            log("[PERSON-PLUGIN] Checking current activity");
            var activity = Lampa.Activity.active();
            if (activity && activity.component === 'actor') {
                log("[PERSON-PLUGIN] Current activity is actor page");
                if (activity.id) {
                    currentPersonId = parseInt(activity.id, 10);
                } else if (activity.params && activity.params.id) {
                    currentPersonId = parseInt(activity.params.id, 10);
                } else {
                    var match = location.pathname.match(/\/view\/actor\/(\d+)/);
                    if (match && match[1]) {
                        currentPersonId = parseInt(match[1], 10);
                    }
                }
                if (currentPersonId) {
                    log("[PERSON-PLUGIN] Found actor ID:", currentPersonId);
                    waitForContainer(function() {
                        addSubscribeButton();
                    });
                } else {
                    error("[PERSON-PLUGIN] No ID found");
                }
            }
        }

        Lampa.Listener.follow('activity', function(e) {
            log("[PERSON-PLUGIN] Activity event:", e.type, e.component);
            if (e.type === 'start' && e.component === 'actor') {
                if (e.object && e.object.id) {
                    currentPersonId = parseInt(e.object.id, 10);
                    log("[PERSON-PLUGIN] Actor ID:", currentPersonId);
                    waitForContainer(function() {
                        addSubscribeButton();
                    });
                }
            }
        });

        setTimeout(checkCurrentActivity, 1500);
        addButtonStyles();
    }

    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') {
                startPlugin();
            }
        });
    }
}();
