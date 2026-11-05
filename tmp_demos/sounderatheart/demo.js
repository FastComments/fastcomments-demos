// Mounts FastComments where sounderatheart.com loads Coral. A random Ghost member is signed in through simple SSO on
// each page load, the way the Ghost theme snippet passes @member, with the member's tier as the label next to their
// name. The header name switches member, and the demo strip drops to signed out or flips to the live chat view.
(function () {
    var TENANT_ID = 'L177BUDVvSe'; // WinrickLabs
    var URL_ID = 'sah-whitecaps-vs-sounders-gamethread-3';
    var PAGE_URL = 'https://fastcomments.com/tmp_demos/sounderatheart/';
    var AVATAR_BASE = PAGE_URL + 'assets/avatars/';

    // The widget renders in an iframe, so the site's type reaches it through customCSS.
    var CUSTOM_CSS =
        "@font-face{font-family:Inter;font-weight:100 900;src:url('" + PAGE_URL + "assets/inter.woff2') format('woff2')}" +
        "body,.fast-comments,textarea,input,button{font-family:Inter,system-ui,sans-serif}";

    // Made-up members; on the real site these come from Ghost's @member (uuid, email, name, avatar, tier).
    var PERSONAS = [
        { id: 'sah-demo-ed', username: 'EmeraldCityEd', email: 'ed.larsen@example.com', avatar: 'ed.svg', tier: 'Paid subscriber' },
        { id: 'sah-demo-rosa', username: 'RaveGreenRosa', email: 'rosa.delgado@example.com', avatar: 'rosa.svg', tier: 'Free member' },
        { id: 'sah-demo-marcus', username: 'NorthEndMarcus', email: 'marcus.webb@example.com', avatar: 'marcus.svg', tier: 'Paid subscriber' },
        { id: 'sah-demo-hannah', username: 'KitsapKeeper', email: 'hannah.ito@example.com', avatar: 'hannah.svg', tier: 'Free member' },
        { id: 'sah-demo-tim', username: 'TacomaTim', email: 'tim.nguyen@example.com', avatar: 'tim.svg', tier: 'Paid subscriber' },
        { id: 'sah-demo-paula', username: 'PugetPaula', email: 'paula.brandt@example.com', avatar: 'paula.svg', tier: 'Free member' }
    ];

    window.FastCommentsBulkCountConfig = { tenantId: TENANT_ID };

    var root = document.documentElement;
    var target = document.getElementById('fastcomments-widget');
    var container = target.parentElement;
    var readerSelect = document.getElementById('fc-reader');
    var viewSelect = document.getElementById('fc-view');
    var member = document.getElementById('sah-member');
    var memberAvatar = member.querySelector('img');
    var memberLabel = member.querySelector('span');
    var modeButton = document.getElementById('sah-mode');
    var instance = null;
    var personaIndex = Math.floor(Math.random() * PERSONAS.length);

    function currentPersona() {
        return readerSelect.value === 'sso' ? PERSONAS[personaIndex] : null;
    }

    function isDark() {
        var chosen = root.getAttribute('data-user-color-scheme');
        if (chosen) {
            return chosen === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function renderHeader() {
        var persona = currentPersona();
        if (persona) {
            memberAvatar.src = AVATAR_BASE + persona.avatar;
            memberAvatar.hidden = false;
            memberLabel.textContent = persona.username;
            member.title = 'Switch to another member';
        } else {
            memberAvatar.hidden = true;
            memberAvatar.removeAttribute('src');
            memberLabel.textContent = 'Sign In';
            member.title = 'Sign in as a member';
        }
        var dark = isDark();
        modeButton.setAttribute('data-colormode', dark ? 'light' : 'dark');
        modeButton.querySelector('span').textContent = dark ? 'Light' : 'Dark';
    }

    function mount() {
        if (instance) {
            instance.destroy();
            instance = null;
            target.innerHTML = '';
        }
        var persona = currentPersona();
        var chat = viewSelect.value === 'chat';
        var config = {
            tenantId: TENANT_ID,
            urlId: URL_ID,
            url: PAGE_URL,
            pageTitle: 'Whitecaps vs. Sounders: Gamethread',
            locale: 'en_us',
            customCSS: CUSTOM_CSS,
            hasDarkBackground: isDark()
        };
        if (persona) {
            config.simpleSSO = {
                id: persona.id,
                username: persona.username,
                email: persona.email,
                avatar: AVATAR_BASE + persona.avatar,
                displayLabel: persona.tier
            };
        }
        container.classList.toggle('sah-comments--chat', chat);
        renderHeader();
        instance = chat ? window.FastCommentsLiveChat(target, config) : window.FastCommentsUI(target, config);
    }

    function boot() {
        if (window.FastCommentsUI && window.FastCommentsLiveChat) {
            mount();
        } else {
            setTimeout(boot, 50);
        }
    }
    boot();

    readerSelect.addEventListener('change', mount);
    viewSelect.addEventListener('change', mount);

    member.addEventListener('click', function (e) {
        e.preventDefault();
        if (readerSelect.value === 'sso') {
            personaIndex = (personaIndex + 1) % PERSONAS.length;
        } else {
            readerSelect.value = 'sso';
        }
        mount();
    });

    // Same switch as the theme's Dark/Light button: an explicit choice overrides the OS setting.
    modeButton.addEventListener('click', function () {
        root.setAttribute('data-user-color-scheme', isDark() ? 'light' : 'dark');
        mount();
    });

    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a');
        if (!link) return;
        if (link.classList.contains('js-comments-link')) {
            e.preventDefault();
            document.getElementById('comments').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (link.getAttribute('href') === '#') {
            // Copied nav links go nowhere; keep the page in place during a walkthrough.
            e.preventDefault();
        }
    });
})();
