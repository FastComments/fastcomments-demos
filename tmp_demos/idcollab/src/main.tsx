import * as React from 'react';
import { AppRegistry } from 'react-native';
import {
    FastCommentsLiveCommenting,
    FastCommentsImageAsset,
    getDefaultImageAssets,
} from 'fastcomments-react-native-sdk';
import type { FastCommentsRNConfig } from 'fastcomments-react-native-sdk';
import { VoteStyle } from 'fastcomments-typescript';

// Temporary parity demo for the idcolab profile. Mirrors their iframe-based
// react wrapper config:
//
//   tenantId / url / urlId / sso        -> same fields
//   useShowCommentsToggle               -> same field
//   customCSS="button { background.. }" -> theme/styles props instead (RN has no CSS)
//   onRender                            -> onCommentsRendered callback
//   onReplySuccess / commentCountUpdated-> same callbacks
//   mentionGroupIds                     -> same field (forwarded to user search)
//   pageReactConfig (heart svg)         -> same field
//   like-only voting with a star        -> voteStyle: Heart + assets override
//   arrow submit inside the text box    -> useInlineSubmitButton
function AppIdcolab() {
    const STAR = 'https://cdn.fastcomments.com/images/star-64-empty.png';
    const STAR_FILLED = 'https://cdn.fastcomments.com/images/star-64-filled.png';

    const config: FastCommentsRNConfig = {
        tenantId: 'demo',
        urlId: 'idcolab-parity-demo',
        url: 'https://example.com/idcolab-parity-demo',
        // Dev goes through the vite proxy; prod serves from fastcomments.com
        // itself, where the default same-origin apiHost is correct.
        ...(import.meta.env.DEV ? { apiHost: '/_fc' } : {}),
        // Their wrapper passes a secure ssoConfig; the demo uses simple SSO so
        // it runs against the demo tenant without a server-side secret.
        simpleSSO: {
            username: 'IdcolabTester',
            email: 'idcolab-tester@fctest.com',
            avatar: '',
        },
        useShowCommentsToggle: true,
        countAboveToggle: 1,
        voteStyle: VoteStyle.Heart,
        useInlineSubmitButton: true,
        mentionGroupIds: ['idcolab-demo-project'],
        pageReactConfig: {
            showUsers: true,
            reacts: [
                {
                    id: 'love',
                    src: STAR,
                    selectedSrc: STAR_FILLED,
                },
            ],
        },
    };

    // Like-only star instead of the heart (their customization).
    const assets = getDefaultImageAssets();
    assets[FastCommentsImageAsset.ICON_HEART] = { uri: STAR };
    assets[FastCommentsImageAsset.ICON_HEART_ACTIVE] = { uri: STAR_FILLED };

    return (
        <FastCommentsLiveCommenting
            config={config}
            assets={assets}
            callbacks={{
                onCommentsRendered: (comments) => console.log('[idcolab demo] onRender', comments.length),
                onReplySuccess: (comment) => console.log('[idcolab demo] onReplySuccess', comment._id),
                commentCountUpdated: (count) => console.log('[idcolab demo] commentCountUpdated', count),
            }}
        />
    );
}

const appName = 'FastcommentsIdcolabParityDemo';
AppRegistry.registerComponent(appName, () => AppIdcolab);
AppRegistry.runApplication(appName, {
    rootTag: document.getElementById('root'),
});
