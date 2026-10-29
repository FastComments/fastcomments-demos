// Mounts the FastComments widget where goal.com loads OpenWeb. A random reader is signed in through
// simple SSO on each page load (the way Goal's logged-in users would be); the header avatar switches reader,
// and the demo strip can drop to the anonymous flow or change the widget language.
(function () {
    var TENANT_ID = 'L8OQzSO6-R'; // "Footballco Demo" tenant, managed under WinrickLabs
    var URL_ID = 'goal-en-news-bltbbe227a9825de47e';
    var PAGE_URL = 'https://fastcomments.com/tmp_demos/footballco-goal/';
    var AVATAR_BASE = PAGE_URL + 'assets/avatars/';
    var RTL = { ar: true, he: true };

    // Readers Goal's own login would hand us: id/email/username/avatar come from the publisher's session.
    var PERSONAS = [
        { username: 'priya_mufc', email: 'priya.shah@example.com', avatar: 'priya.svg' },
        { username: 'TomW_1999', email: 'tom.whitaker@example.com', avatar: 'tom.svg' },
        { username: 'ahmed_kooora', email: 'ahmed.alfarsi@example.com', avatar: 'ahmed.svg' },
        { username: 'LukasB_Spox', email: 'lukas.brandt@example.com', avatar: 'lukas.svg' },
        { username: 'sophie.m', email: 'sophie.martin@example.com', avatar: 'sophie.svg' },
        { username: 'daan_vz', email: 'daan.devries@example.com', avatar: 'daan.svg' },
        { username: 'marco_calcio', email: 'marco.rossi@example.com', avatar: 'marco.svg' },
        { username: 'chloe_cfc', email: 'chloe.bennett@example.com', avatar: 'chloe.svg' }
    ];

    window.FastCommentsBulkCountConfig = { tenantId: TENANT_ID };

    var target = document.getElementById('fastcomments-widget');
    var localeSelect = document.getElementById('fc-locale');
    var readerSelect = document.getElementById('fc-reader');
    var login = document.getElementById('goal-login');
    var loginAvatar = login.querySelector('img');
    var loginLabel = login.querySelector('span');
    var instance = null;
    var personaIndex = Math.floor(Math.random() * PERSONAS.length);

    function currentPersona() {
        return readerSelect.value === 'sso' ? PERSONAS[personaIndex] : null;
    }

    function renderHeader() {
        var persona = currentPersona();
        if (persona) {
            loginAvatar.src = AVATAR_BASE + persona.avatar;
            loginAvatar.hidden = false;
            loginLabel.textContent = persona.username;
            login.title = 'Switch to another reader';
        } else {
            loginAvatar.hidden = true;
            loginAvatar.removeAttribute('src');
            loginLabel.textContent = 'Log in';
            login.title = 'Sign in as a reader';
        }
    }

    function mount() {
        if (instance) {
            instance.destroy();
            instance = null;
            target.innerHTML = '';
        }
        var locale = localeSelect.value;
        var persona = currentPersona();
        var config = {
            tenantId: TENANT_ID,
            urlId: URL_ID,
            url: PAGE_URL,
            locale: locale
        };
        if (persona) {
            config.simpleSSO = {
                username: persona.username,
                email: persona.email,
                avatarSrc: AVATAR_BASE + persona.avatar
            };
        }
        target.setAttribute('dir', RTL[locale] ? 'rtl' : 'ltr');
        renderHeader();
        instance = window.FastCommentsUI(target, config);
    }

    function boot() {
        if (window.FastCommentsUI) {
            mount();
        } else {
            setTimeout(boot, 50);
        }
    }
    boot();

    localeSelect.addEventListener('change', mount);
    readerSelect.addEventListener('change', mount);

    login.addEventListener('click', function (e) {
        e.preventDefault();
        if (readerSelect.value === 'sso') {
            personaIndex = (personaIndex + 1) % PERSONAS.length;
        } else {
            readerSelect.value = 'sso';
        }
        mount();
    });

    document.getElementById('goal-comments-link').addEventListener('click', function (e) {
        e.preventDefault();
        document.getElementById('comments').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
})();
