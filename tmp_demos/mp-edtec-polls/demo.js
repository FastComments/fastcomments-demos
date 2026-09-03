// Static demo behaviour: poll voting, faux input border sizing, and a few widget
// affordances (votes, sort menu) so the hardcoded widgets feel real. No network.
(function () {
    'use strict';

    function initPoll(card) {
        const options = Array.from(card.querySelectorAll('.fc-q-poll__option'));
        const counts = options.map(function (option) { return Number(option.getAttribute('data-count')); });
        const totalEl = card.querySelector('.fc-q-breakdown__total');
        const toggleEl = card.querySelector('.fc-q-poll__toggle');
        const savedEl = card.querySelector('.fc-q-poll__saved');
        const changeEl = card.querySelector('.fc-q-poll__change');
        let selected = -1;
        let showingResults = false;

        function render() {
            const total = counts.reduce(function (sum, n) { return sum + n; }, 0);
            card.classList.toggle('fc-q-poll--results', showingResults);
            options.forEach(function (option, i) {
                const pct = total ? Math.round((counts[i] / total) * 100) : 0;
                option.classList.toggle('fc-q-poll__option--selected', i === selected);
                option.querySelector('.fc-q-poll__option-pct').textContent = pct + '%';
                option.querySelector('.fc-q-poll__option-bar').style.width = showingResults ? pct + '%' : '0';
                option.querySelector('input').checked = i === selected;
            });
            totalEl.textContent = total.toLocaleString() + (total === 1 ? ' response' : ' responses');
            toggleEl.textContent = showingResults ? 'Hide results' : 'Show results';
            toggleEl.classList.toggle('hidden', selected !== -1);
            savedEl.classList.toggle('hidden', selected === -1);
            changeEl.classList.toggle('hidden', selected === -1 || !showingResults);
        }

        options.forEach(function (option, i) {
            option.addEventListener('click', function (e) {
                e.preventDefault();
                if (selected === i) {
                    showingResults = true;
                } else {
                    if (selected !== -1) {
                        counts[selected] -= 1;
                    }
                    counts[i] += 1;
                    selected = i;
                    showingResults = true;
                }
                render();
            });
        });

        toggleEl.addEventListener('click', function () {
            showingResults = !showingResults;
            render();
        });

        changeEl.addEventListener('click', function () {
            showingResults = false;
            render();
        });

        render();
    }

    // Mirrors positionBordersAroundButtons() in the widget: the input's bottom border is
    // drawn by absolutely positioned divs and the left piece is sized to stop at the button.
    function positionBordersAroundButtons() {
        const areas = document.querySelectorAll('.comment-input');
        for (const area of areas) {
            const borderLeft = area.querySelector('.horizontal-border-left');
            if (!borderLeft) {
                continue;
            }
            const width = area.clientWidth;
            const padding = parseInt(getComputedStyle(area).paddingLeft.replace('px', ''), 10) * 2;
            const replyButton = area.querySelector('.reply-button-wrapper');
            if (replyButton) {
                borderLeft.style.width = (width - replyButton.clientWidth - padding - 34) + 'px';
            } else {
                borderLeft.style.width = (width - padding - 20) + 'px';
            }
        }
    }

    function initVotes(root) {
        root.addEventListener('click', function (e) {
            const target = e.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            const isUp = target.classList.contains('upvote');
            const isDown = target.classList.contains('downvote');
            if (!isUp && !isDown) {
                return;
            }
            const options = target.parentElement;
            const sibling = isUp ? options.querySelector('.downvote') : options.querySelector('.upvote');
            const wasActive = target.classList.contains('active');
            adjustVoteCount(options, isUp ? 'votes-up' : 'votes-down', wasActive ? -1 : 1, target, isUp);
            target.classList.toggle('active', !wasActive);
            if (!wasActive && sibling.classList.contains('active')) {
                sibling.classList.remove('active');
                adjustVoteCount(options, isUp ? 'votes-down' : 'votes-up', -1, sibling, !isUp);
            }
        });
    }

    // The widget only renders a count span when the count is non-zero, so add and remove it the same way.
    function adjustVoteCount(options, className, delta, icon, isUp) {
        let span = options.querySelector('.' + className);
        let count = span ? Number(span.textContent.replace(/,/g, '')) : 0;
        count += delta;
        if (count <= 0) {
            if (span) {
                span.remove();
            }
            return;
        }
        if (!span) {
            span = document.createElement('span');
            span.className = className;
            span.title = isUp ? 'thumbs up' : 'thumbs down';
            if (isUp) {
                options.insertBefore(span, icon);
            } else {
                icon.insertAdjacentElement('afterend', span);
            }
        }
        span.textContent = count.toLocaleString();
    }

    function initSortMenus(root) {
        root.querySelectorAll('.select-dir .dropdown').forEach(function (dropdown) {
            const label = dropdown.querySelector('.drop-label');
            dropdown.querySelectorAll('.dir-drop-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    label.innerHTML = btn.textContent + ' <i>▼</i>';
                });
            });
        });
    }

    function initReplyForms(root) {
        root.querySelectorAll('form.comment-reply').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
            });
        });
    }

    document.querySelectorAll('.fc-q-card--poll').forEach(initPoll);
    document.querySelectorAll('.fast-comments').forEach(function (root) {
        initVotes(root);
        initSortMenus(root);
        initReplyForms(root);
    });
    positionBordersAroundButtons();
    window.addEventListener('resize', positionBordersAroundButtons);
})();
