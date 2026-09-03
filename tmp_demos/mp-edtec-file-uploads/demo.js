// Static demo behaviour: attach files from the real file picker or by drag and drop,
// simulate the upload, and post a fake comment carrying the attachments. No network.
(function () {
    'use strict';

    const IMAGE_TYPES = /^image\//;

    function formatSize(bytes) {
        if (bytes >= 1048576) {
            return (bytes / 1048576).toFixed(1) + ' MB';
        }
        if (bytes >= 1024) {
            return Math.round(bytes / 1024) + ' KB';
        }
        return bytes + ' B';
    }

    function typeLabel(file) {
        const dot = file.name.lastIndexOf('.');
        const ext = dot === -1 ? '' : file.name.slice(dot + 1);
        return (ext || 'file').toUpperCase().slice(0, 4);
    }

    function escapeHTML(text) {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // One compose area per widget. `renderAttachments` decides how posted files look (list vs tiles).
    function initCompose(form, opts) {
        const pendingEl = form.querySelector('.fc-att-pending');
        const inputs = form.querySelectorAll('input[type=file]');
        const textarea = form.querySelector('textarea');
        const pending = [];

        function addFiles(fileList) {
            for (const file of fileList) {
                const entry = { file: file, previewUrl: IMAGE_TYPES.test(file.type) ? URL.createObjectURL(file) : null, done: false };
                pending.push(entry);
                renderChip(entry);
            }
        }

        function renderChip(entry) {
            const isImage = !!entry.previewUrl;
            const chip = document.createElement('span');
            chip.className = 'fc-att-chip fc-att-chip--uploading';
            chip.innerHTML =
                '<span class="fc-att__type' + (isImage ? ' fc-att__type--img' : '') + '">' + escapeHTML(typeLabel(entry.file)) + '</span>'
                + '<span class="fc-att-chip__name" title="' + escapeHTML(entry.file.name) + '">' + escapeHTML(entry.file.name) + '</span>'
                + '<span class="fc-att__meta fc-att-chip__meta-progress">Uploading 0%</span>'
                + '<span class="fc-att__meta fc-att-chip__meta-size">' + formatSize(entry.file.size) + '</span>'
                + '<button type="button" class="fc-att-chip__remove" title="Remove">Remove</button>'
                + '<span class="fc-att-chip__progress"></span>';
            pendingEl.appendChild(chip);
            entry.chip = chip;

            chip.querySelector('.fc-att-chip__remove').addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                pending.splice(pending.indexOf(entry), 1);
                chip.remove();
            });

            // Simulated upload so the prospect sees the in-flight state the widget would show.
            const progressEl = chip.querySelector('.fc-att-chip__progress');
            const progressText = chip.querySelector('.fc-att-chip__meta-progress');
            const duration = 700 + Math.min(entry.file.size / 4000, 1500);
            const start = performance.now();
            function tick(now) {
                const pct = Math.min(100, Math.round(((now - start) / duration) * 100));
                progressEl.style.width = pct + '%';
                progressText.textContent = 'Uploading ' + pct + '%';
                if (pct < 100) {
                    requestAnimationFrame(tick);
                } else {
                    entry.done = true;
                    chip.classList.remove('fc-att-chip--uploading');
                    chip.classList.add('fc-att-chip--done');
                }
            }
            requestAnimationFrame(tick);
        }

        inputs.forEach(function (input) {
            input.addEventListener('change', function () {
                addFiles(input.files);
                input.value = '';
            });
        });

        // The paperclip toolbar button wraps a hidden file input, like the widget's image button.
        form.querySelectorAll('[data-action="attach"]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                const input = btn.querySelector('input[type=file]');
                if (input && e.target !== input) {
                    input.click();
                }
            });
        });

        const drop = form.querySelector('.fc-att-drop');
        if (drop) {
            const input = drop.querySelector('input[type=file]');
            drop.addEventListener('click', function (e) {
                if (e.target instanceof HTMLElement && e.target.closest('.fc-att-chip')) {
                    return;
                }
                input.click();
            });
            drop.addEventListener('dragover', function (e) {
                e.preventDefault();
                drop.classList.add('fc-att-drop--over');
            });
            drop.addEventListener('dragleave', function () {
                drop.classList.remove('fc-att-drop--over');
            });
            drop.addEventListener('drop', function (e) {
                e.preventDefault();
                drop.classList.remove('fc-att-drop--over');
                if (e.dataTransfer && e.dataTransfer.files.length) {
                    addFiles(e.dataTransfer.files);
                }
            });
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const text = textarea.value.trim();
            if (!text && !pending.length) {
                textarea.focus();
                return;
            }
            if (pending.some(function (p) { return !p.done; })) {
                return;
            }
            opts.postComment(text, pending.slice());
            pending.length = 0;
            pendingEl.innerHTML = '';
            textarea.value = '';
        });
    }

    function attachmentListHTML(entries) {
        if (!entries.length) {
            return '';
        }
        let html = '<div class="fc-att-list">';
        for (const entry of entries) {
            html += '<a class="fc-att-list__row" href="#" title="' + escapeHTML(entry.file.name) + '">'
                + '<span class="fc-att__type' + (entry.previewUrl ? ' fc-att__type--img' : '') + '">' + escapeHTML(typeLabel(entry.file)) + '</span>'
                + '<span class="fc-att-list__name">' + escapeHTML(entry.file.name) + '</span>'
                + '<span class="fc-att__meta">' + formatSize(entry.file.size) + '</span>'
                + '<span class="fc-att-list__download" title="Download"></span>'
                + '</a>';
        }
        return html + '</div>';
    }

    function attachmentTilesHTML(entries) {
        if (!entries.length) {
            return '';
        }
        let html = '<div class="fc-att-tiles">';
        for (const entry of entries) {
            const preview = entry.previewUrl
                ? '<span class="fc-att-tile__preview" style="background-image: url(' + entry.previewUrl + ')"></span>'
                : '<span class="fc-att-tile__preview"><span class="fc-att__type">' + escapeHTML(typeLabel(entry.file)) + '</span></span>';
            html += '<a class="fc-att-tile" href="#" title="' + escapeHTML(entry.file.name) + '">' + preview
                + '<span class="fc-att-tile__body"><span class="fc-att-tile__name">' + escapeHTML(entry.file.name) + '</span>'
                + '<span class="fc-att__meta">' + formatSize(entry.file.size) + '</span></span></a>';
        }
        return html + '</div>';
    }

    // Builds a comment with the same markup as the hardcoded ones and prepends it, like the live widget does for a new root comment.
    function makePoster(root, renderAttachments) {
        const comments = root.querySelector('.comments');
        const countEl = root.querySelector('.comment-count');
        const avatar = root.querySelector('.comment-reply-top-bar .avatar img').getAttribute('src');
        const name = root.querySelector('.comment-reply-top-bar .username').textContent;
        let seq = 0;
        return function postComment(text, entries) {
            seq += 1;
            const id = root.id + '-new-' + seq;
            const el = document.createElement('div');
            el.className = 'comment 24hr is-own is-live';
            el.id = id;
            el.innerHTML =
                '<div class="inner">'
                + '<div class="top-right"><a href="#fast-comments-jt=' + id + '" class="jump-link" data-comment-id="' + id + '" title="' + new Date().toLocaleString() + '">Just now</a>'
                + '<div class="menu"><div class="menu-btn icon edit-small"></div></div></div>'
                + '<d class="avatar-wrapper"><img loading="lazy" width="40" height="40" src="' + avatar + '" alt="Avatar" class="avatar comment-image open-profile" data-comment-id="' + id + '"/><d class="activity-icon online"></d></d>'
                + '<div class="comment-content" data-comment-id="' + id + '">'
                + '<div class="commenter-name"><b class="username">' + escapeHTML(name) + '</b></div>'
                + '<div class="comment-text">' + escapeHTML(text) + '</div>'
                + renderAttachments(entries)
                + '</div>'
                + '<div class="comment-bottom"><div class="comment-bottom-toolbar">'
                + '<div class="comment-toolbar-vote"><div class="comment-vote-options"><span class="upvote icon up" data-comment-id="' + id + '" title="Click For Thumbs Up"></span><i class="divider"></i><span class="downvote icon down" data-comment-id="' + id + '" title="Click For Thumbs Down"></span></div></div>'
                + '<div class="comment-toolbar-reply"><button class="comment-reply-start" data-comment-id="' + id + '"><i class="icon reply-arrow-inactive"></i>Reply</button></div>'
                + '</div><div class="reply-form-wrapper"></div></div>'
                + '</div>';
            comments.insertBefore(el, comments.firstChild);
            const count = Number(countEl.textContent.replace(/[^0-9]/g, '')) + 1;
            countEl.textContent = count + (count === 1 ? ' comment' : ' comments');
            el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        };
    }

    // Mirrors positionBordersAroundButtons() in the widget.
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
            if (target.closest('a[href="#"]')) {
                e.preventDefault();
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

    document.querySelectorAll('.v2').forEach(function (host) {
        const root = host.querySelector('.fast-comments');
        const style = host.getAttribute('data-attachment-style');
        const render = style === 'tiles' ? attachmentTilesHTML : attachmentListHTML;
        initCompose(root.querySelector('form.comment-reply.root'), { postComment: makePoster(host, render) });
        initVotes(root);
        initSortMenus(root);
    });
    positionBordersAroundButtons();
    window.addEventListener('resize', positionBordersAroundButtons);
})();
