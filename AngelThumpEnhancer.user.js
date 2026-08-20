// ==UserScript==
// @name         AngelThump Enhancer
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  AngelThump sitesinde reklamları gizler, Twitch chati ekler ve boyutlandırılabilir çubuk içerir
// @author       Emre
// @match        *://angelthump.com/*
// @match        *://player.angelthump.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // 1. Reklam ve Header Gizleme İşlemleri
    if (window.location.hostname === 'angelthump.com') {
        GM_addStyle('header.MuiAppBar-root, header { display: none !important; }');

        GM_addStyle(`
            ins.adsbygoogle,
            iframe[title="Advertisement"],
            iframe[id^="aswift_"],
            iframe#google_esf,
            .MuiBox-root:has(> ins.adsbygoogle) {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
            }

            /* Pointer events iframe kaynaklı takılmaları engellemek için */
            .is-dragging iframe {
                pointer-events: none !important;
            }
        `);
    }

    if (window.location.hostname === 'player.angelthump.com' || window.location.hostname === 'angelthump.com') {
        GM_addStyle(`
            a[href*="patreon.com/join/angelthump"],
            [class*="patreon"],
            [id*="patreon"] {
                display: none !important;
            }
        `);
    }

    // 2. Yayin Gecikmesini (Delay) Hesaplama ve Senkronizasyon (Iframe Ici)
    if (window.location.hostname === 'player.angelthump.com') {
        setInterval(() => {
            const video = document.querySelector('video');
            if (video && video.buffered.length > 0) {
                const delay = video.buffered.end(video.buffered.length - 1) - video.currentTime;
                window.parent.postMessage({ type: 'AT_STREAM_DELAY', delay: Math.max(0, delay) }, '*');
            }
        }, 1000);

        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'AT_SYNC_LIVE') {
                const video = document.querySelector('video');
                if (video && video.buffered.length > 0) {
                    // Takilmalari onlemek icin canli uctan 0.5 saniye geriye sariyoruz
                    video.currentTime = video.buffered.end(video.buffered.length - 1) - 0.5;
                }
            }
        });
    }

    // 3. Twitch Chati, Boyutlandirma ve Gecikme Sayaci Ekleme (Ana Sayfa)
    if (window.location.hostname === 'angelthump.com') {

        // --- YAYIN GECIKMESI SAYACI (DELAY) ---
        let currentDelay = 0;
        let delayCounter = null;

        const updateDelayCounter = () => {
            const icon = document.querySelector('.css-1pg5pd8');
            if (icon && !delayCounter) {
                delayCounter = document.createElement('div');
                delayCounter.id = 'at-delay-counter';
                delayCounter.style.cssText = `
                    font-weight: bold;
                    margin-right: 8px;
                    cursor: pointer;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    background: rgba(0,0,0,0.3);
                    padding: 3px 6px;
                    border-radius: 4px;
                    transition: color 0.3s;
                `;
                delayCounter.title = "Yayini guncele cekmek icin tiklayin";
                delayCounter.onclick = () => {
                    const playerIframe = document.querySelector('iframe[title="Player"]');
                    if (playerIframe && playerIframe.contentWindow) {
                        playerIframe.contentWindow.postMessage({ type: 'AT_SYNC_LIVE' }, '*');
                        delayCounter.innerText = "Esitleniyor...";
                        delayCounter.style.color = "#ffb300"; // Turuncu
                    }
                };
                icon.insertAdjacentElement('beforebegin', delayCounter);
            }

            if (delayCounter) {
                // Eger buton "Esitleniyor..." modundaysa ve gecikme 1.5'in altina dustuyse normal moda gec
                if (delayCounter.innerText === "Esitleniyor..." && currentDelay < 1.5) {
                    delayCounter.innerText = "";
                }

                if (delayCounter.innerText !== "Esitleniyor...") {
                    if (currentDelay > 3) {
                        delayCounter.innerText = "-" + currentDelay.toFixed(1) + "s";
                        delayCounter.style.color = '#ff5252'; // Kirmizi
                    } else {
                        delayCounter.innerText = "Canli";
                        delayCounter.style.color = '#00e676'; // Yesil
                    }
                }
            }
        };

        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'AT_STREAM_DELAY') {
                currentDelay = event.data.delay;
                updateDelayCounter();
            }
        });
        // --------------------------------------

        const interval = setInterval(() => {
            const playerIframe = document.querySelector('iframe[title="Player"]');

            if (playerIframe) {
                const playerWrapper = playerIframe.parentElement;
                const mainContainer = playerWrapper.parentElement;

                if (mainContainer && !document.getElementById('twitch-chat-container')) {
                    clearInterval(interval);

                    // CSS Sınıflarını Ekleyelim
                    mainContainer.id = 'at-main-container';
                    playerWrapper.id = 'at-player-wrapper';

                    GM_addStyle(`
                        #at-main-container {
                            display: flex !important;
                            flex-direction: row !important;
                            width: 100vw !important;
                            height: 100vh !important;
                            overflow: hidden !important;
                        }
                        #at-player-wrapper {
                            flex: 1 1 auto !important;
                            height: 100% !important;
                            background: black !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            position: relative !important;
                        }
                        #twitch-chat-container {
                            flex: 0 0 auto !important;
                            width: var(--chat-width, 350px) !important;
                            height: 100% !important;
                            background-color: #18181b !important;
                            display: flex !important;
                            flex-direction: column !important;
                        }
                        #chat-resizer {
                            width: 10px !important;
                            background-color: #9146ff !important;
                            cursor: col-resize !important;
                            flex: 0 0 auto !important;
                            z-index: 9999 !important;
                            opacity: 0;
                            transition: opacity 0.3s ease !important;
                            position: relative !important;
                        }

                        /* Tam Ekran Butonu CSS */
                        #at-fullscreen-btn {
                            background: rgba(0, 0, 0, 0.6);
                            color: white;
                            border: none;
                            border-radius: 4px;
                            padding: 4px 8px;
                            cursor: pointer;
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            transition: background 0.3s ease !important;
                            opacity: 0.8 !important;
                            margin-left: auto !important;
                        }
                        #at-fullscreen-btn svg {
                            width: 24px;
                            height: 24px;
                            fill: currentColor;
                        }
                        #at-fullscreen-btn:hover {
                            background: rgba(0, 0, 0, 0.8);
                        }

                        /* Dikey Mod (Portrait) veya Mobil Ekranlar İçin */
                        @media (orientation: portrait), (max-width: 768px) {
                            #at-main-container {
                                flex-direction: column !important;
                            }
                            #at-player-wrapper {
                                width: 100vw !important;
                                height: auto !important;
                                aspect-ratio: 16 / 9 !important;
                                flex: 0 0 auto !important;
                            }
                            #chat-resizer {
                                display: none !important;
                            }
                            #twitch-chat-container {
                                width: 100vw !important;
                                height: auto !important;
                                flex: 1 1 auto !important;
                            }
                        }
                    `);

                    // Yeniden Boyutlandırma Çubuğu (Resizer)
                    const resizer = document.createElement('div');
                    resizer.id = 'chat-resizer';

                    // Görünmez ama tıklaması kolay ekstra bir hit-box eklentisi (opsiyonel)
                    resizer.innerHTML = '<div style="position: absolute; left: -5px; right: -5px; top: 0; bottom: 0;"></div>';

                    // Chat Container
                    const chatContainer = document.createElement('div');
                    chatContainer.id = 'twitch-chat-container';

                    const chatIframe = document.createElement('iframe');
                    chatIframe.src = 'https://www.twitch.tv/embed/nobk/chat?parent=angelthump.com&darkpopout';
                    chatIframe.style.flex = '1';
                    chatIframe.style.width = '100%';
                    chatIframe.style.border = 'none';

                    chatContainer.appendChild(chatIframe);

                    // Tam Ekran Butonu
                    const fsBtn = document.createElement('button');
                    fsBtn.id = 'at-fullscreen-btn';
                    fsBtn.innerHTML = `
                        <svg viewBox="0 0 24 24">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    `;
                    fsBtn.onclick = () => {
                        if (!document.fullscreenElement) {
                            mainContainer.requestFullscreen().catch(err => {
                                console.log(`Tam ekran hatasi: ${err.message}`);
                            });
                        } else {
                            document.exitFullscreen();
                        }
                    };

                    // DOM'a ekleme
                    mainContainer.appendChild(resizer);
                    mainContainer.appendChild(chatContainer);

                    // Hedef elementi bekleyip butonu ekleyen interval
                    const fsInterval = setInterval(() => {
                        const targetBox = document.querySelector('.MuiBox-root.css-1n2mv2k');

                        if (targetBox) {
                            if (!document.getElementById('at-fullscreen-btn')) {
                                targetBox.appendChild(fsBtn);
                            }
                            clearInterval(fsInterval);
                        }
                    }, 1000);

                    // --- MOUSE HAREKETİ İLE ÇUBUĞU GÖSTERME/GİZLEME ---
                    let mouseTimer;
                    let isDragging = false;

                    const showResizer = () => {
                        resizer.style.opacity = '1';
                        clearTimeout(mouseTimer);
                        mouseTimer = setTimeout(() => {
                            if (!isDragging) {
                                resizer.style.opacity = '0';
                            }
                        }, 1500); // 1.5 saniye fare hareketsiz kalinca gizle
                    };

                    document.addEventListener('mousemove', showResizer);
                    document.addEventListener('touchstart', showResizer, { passive: true });

                    // --- SÜRÜKLE BIRAK BOYUTLANDIRMA MANTIĞI ---
                    const startDrag = (e) => {
                        isDragging = true;
                        document.body.classList.add('is-dragging'); // iframe pointer-events kapatmak için
                        document.body.style.cursor = 'col-resize';
                        resizer.style.opacity = '1';
                        if (e.cancelable) e.preventDefault();
                    };

                    resizer.addEventListener('mousedown', startDrag);
                    resizer.addEventListener('touchstart', startDrag, { passive: false });

                    const onDrag = (e) => {
                        if (!isDragging) return;

                        let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

                        // Sağdan itibaren fare pozisyonunu hesapla
                        let newWidth = window.innerWidth - clientX;

                        // Minimum ve maksimum genişlik sinirlari
                        if (newWidth < 200) newWidth = 200;
                        if (newWidth > window.innerWidth * 0.7) newWidth = window.innerWidth * 0.7; // En fazla %70

                        chatContainer.style.setProperty('--chat-width', newWidth + 'px');
                    };

                    document.addEventListener('mousemove', onDrag);
                    document.addEventListener('touchmove', onDrag, { passive: false });

                    const stopDrag = () => {
                        if (isDragging) {
                            isDragging = false;
                            document.body.classList.remove('is-dragging');
                            document.body.style.cursor = 'default';

                            // Gizleme timer'ini tekrar başlat
                            showResizer();
                        }
                    };

                    document.addEventListener('mouseup', stopDrag);
                    document.addEventListener('touchend', stopDrag);
                }
            }
        }, 1000);
    }
})();
