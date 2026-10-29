// Mounts the FastComments widget where goal.com loads OpenWeb, and re-mounts it when the demo language changes.
(function () {
    var TENANT_ID = 'L8OQzSO6-R'; // "Footballco Demo" tenant, managed under WinrickLabs
    var URL_ID = 'goal-en-news-bltbbe227a9825de47e';
    var PAGE_URL = 'https://fastcomments.com/tmp_demos/footballco-goal/';
    var RTL = { ar: true, he: true };

    window.FastCommentsBulkCountConfig = { tenantId: TENANT_ID };

    var target = document.getElementById('fastcomments-widget');
    var select = document.getElementById('fc-locale');
    var instance = null;

    function mount(locale) {
        if (instance) {
            instance.destroy();
            instance = null;
            target.innerHTML = '';
        }
        target.setAttribute('dir', RTL[locale] ? 'rtl' : 'ltr');
        instance = window.FastCommentsUI(target, {
            tenantId: TENANT_ID,
            urlId: URL_ID,
            url: PAGE_URL,
            locale: locale
        });
    }

    function boot() {
        if (window.FastCommentsUI) {
            mount(select.value);
        } else {
            setTimeout(boot, 50);
        }
    }
    boot();

    select.addEventListener('change', function () {
        mount(select.value);
    });

    document.getElementById('goal-comments-link').addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('comments').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
})();
