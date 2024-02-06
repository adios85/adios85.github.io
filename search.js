(function () {
    'use strict';

function listenMykeys(e) {
  if (e.keyCode === 133 || e.keyCode === 184) {
	Lampa.Search.open()
  }
}

$(document).ready(function startSmartHome() {
	document.addEventListener("keydown", listenMykeys);
})

})();
