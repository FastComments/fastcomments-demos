// Mounts the FastComments widget where thesun.co.uk loads OpenWeb. A random reader is signed in through
// simple SSO on each page load (the way a Sun account holder would be); the header avatar switches reader,
// and the demo strip can drop to the anonymous flow.
(function () {
    var TENANT_ID = 'L177BUDVvSe'; // WinrickLabs
    var URL_ID = 'thesun-40797989'; // data-post-id of OpenWeb's conversation module on the live article
    var PAGE_URL = 'https://fastcomments.com/tmp_demos/newsuk-thesun/';
    var AVATAR_BASE = PAGE_URL + 'assets/avatars/';

    // The widget renders in an iframe, so the masthead type and section green reach it through customCSS.
    var CUSTOM_CSS =
        "@font-face{font-family:TheSun;font-weight:400;src:url('" + PAGE_URL + "assets/thesun-regular.woff2') format('woff2')}" +
        "@font-face{font-family:TheSun;font-weight:700;src:url('" + PAGE_URL + "assets/thesun-bold.woff2') format('woff2')}" +
        "body,.fast-comments,textarea,input,button{font-family:TheSun,Arial,sans-serif}";

    // Readers The Sun's own login would hand us: email/username/avatar come from the publisher's session.
    var PERSONAS = [
        { username: 'KevTheBlue', email: 'kev.marsh@example.com', avatar: 'kev.svg' },
        { username: 'Shaz_COYS', email: 'sharon.okafor@example.com', avatar: 'shaz.svg' },
        { username: 'GoonerDave84', email: 'dave.pritchard@example.com', avatar: 'dave.svg' },
        { username: 'Priya_LUFC', email: 'priya.nair@example.com', avatar: 'priya.svg' },
        { username: 'ToonTom', email: 'tom.robson@example.com', avatar: 'tom.svg' },
        { username: 'Mandy_M', email: 'mandy.morris@example.com', avatar: 'mandy.svg' },
        { username: 'BigCol_Wolves', email: 'colin.hughes@example.com', avatar: 'colin.svg' },
        { username: 'Jas_AVFC', email: 'jaspreet.gill@example.com', avatar: 'jas.svg' }
    ];

    window.FastCommentsBulkCountConfig = { tenantId: TENANT_ID };

    var target = document.getElementById('fastcomments-widget');
    var readerSelect = document.getElementById('fc-reader');
    var signin = document.getElementById('sun-signin');
    var signinAvatar = signin.querySelector('img');
    var signinLabel = signin.querySelector('span');
    var instance = null;
    var personaIndex = Math.floor(Math.random() * PERSONAS.length);

    function currentPersona() {
        return readerSelect.value === 'sso' ? PERSONAS[personaIndex] : null;
    }

    function renderHeader() {
        var persona = currentPersona();
        if (persona) {
            signinAvatar.src = AVATAR_BASE + persona.avatar;
            signinAvatar.hidden = false;
            signinLabel.textContent = persona.username;
            signin.title = 'Switch to another reader';
        } else {
            signinAvatar.hidden = true;
            signinAvatar.removeAttribute('src');
            signinLabel.textContent = 'Sign in';
            signin.title = 'Sign in as a reader';
        }
    }

    function mount() {
        if (instance) {
            instance.destroy();
            instance = null;
            target.innerHTML = '';
        }
        var persona = currentPersona();
        var config = {
            tenantId: TENANT_ID,
            urlId: URL_ID,
            url: PAGE_URL,
            locale: 'en_us',
            customCSS: CUSTOM_CSS
        };
        if (persona) {
            config.simpleSSO = {
                username: persona.username,
                email: persona.email,
                avatarSrc: AVATAR_BASE + persona.avatar
            };
        }
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

    readerSelect.addEventListener('change', mount);

    signin.addEventListener('click', function (e) {
        e.preventDefault();
        if (readerSelect.value === 'sso') {
            personaIndex = (personaIndex + 1) % PERSONAS.length;
        } else {
            readerSelect.value = 'sso';
        }
        mount();
    });

    document.addEventListener('click', function (e) {
        var link = e.target.closest && e.target.closest('a');
        if (!link) return;
        if (link.classList.contains('js-comments-link')) {
            e.preventDefault();
            document.getElementById('comments').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (link.getAttribute('href') === '#') {
            // Copied nav and share links go nowhere; keep the page in place during a walkthrough.
            e.preventDefault();
        }
    });
})();
