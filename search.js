(function () {
    'use strict';

function listenMykeys(e) {
  if (e.keyCode === 184 || e.keyCode === 185) {
	Lampa.Search.open()
  }
}

$(document).ready(function startSmartHome() {
	document.addEventListener("keydown", listenMykeys);
})

})();
