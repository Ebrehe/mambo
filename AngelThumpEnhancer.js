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

(function() {
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

    // 2. Twitch Chati ve Yeniden Boyutlandırma Çubuğu Ekleme
    if (window.location.hostname === 'angelthump.com') {
        const interval = setInterval(() => {
            const playerIframe = document.querySelector('iframe[title="Player"]');
            
            if (playerIframe) {
                const playerWrapper = playerIframe.parentElement;
                const mainContainer = playerWrapper.parentElement;

                if (mainContainer && !document.getElementById('twitch-chat-container')) {
                    clearInterval(interval); 

                    // Ana Container Flexbox
                    mainContainer.setAttribute('style', 'display: flex !important; flex-direction: row !important; width: 100vw !important; height: 100vh !important; overflow: hidden !important;');

                    // Video alanı esnek (kalan boşluğu dolduracak)
                    playerWrapper.setAttribute('style', 'flex: 1 1 auto !important; height: 100% !important; background: black; display: flex; align-items: center; justify-content: center;');

                    // Yeniden Boyutlandırma Çubuğu (Resizer)
                    const resizer = document.createElement('div');
                    resizer.id = 'chat-resizer';
                    resizer.setAttribute('style', `
                        width: 10px;
                        background-color: #9146ff; /* Twitch Moru */
                        cursor: col-resize;
                        flex: 0 0 auto;
                        z-index: 9999;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        position: relative;
                    `);
                    
                    // Görünmez ama tıklaması kolay ekstra bir hit-box eklentisi (opsiyonel)
                    resizer.innerHTML = '<div style="position: absolute; left: -5px; right: -5px; top: 0; bottom: 0;"></div>';

                    // Chat Container
                    const chatContainer = document.createElement('div');
                    chatContainer.id = 'twitch-chat-container';
                    // Başlangıç genişliği 350px
                    chatContainer.setAttribute('style', 'flex: 0 0 auto !important; width: 350px !important; height: 100% !important; background-color: #18181b !important; display: flex; flex-direction: column;');
                    
                    const chatIframe = document.createElement('iframe');
                    chatIframe.src = 'https://www.twitch.tv/embed/nobk/chat?parent=angelthump.com&darkpopout';
                    chatIframe.style.flex = '1';
                    chatIframe.style.width = '100%';
                    chatIframe.style.border = 'none';
                    
                    chatContainer.appendChild(chatIframe);
                    
                    // DOM'a ekleme
                    mainContainer.appendChild(resizer);
                    mainContainer.appendChild(chatContainer);

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
                        }, 1500); // 1.5 saniye fare hareketsiz kalınca gizle
                    };

                    document.addEventListener('mousemove', showResizer);

                    // --- SÜRÜKLE BIRAK BOYUTLANDIRMA MANTIĞI ---
                    resizer.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        document.body.classList.add('is-dragging'); // iframe pointer-events kapatmak için
                        document.body.style.cursor = 'col-resize';
                        resizer.style.opacity = '1';
                        e.preventDefault();
                    });

                    document.addEventListener('mousemove', (e) => {
                        if (!isDragging) return;
                        
                        // Sağdan itibaren fare pozisyonunu hesapla
                        let newWidth = window.innerWidth - e.clientX;
                        
                        // Minimum ve maksimum genişlik sınırları
                        if (newWidth < 200) newWidth = 200;
                        if (newWidth > window.innerWidth * 0.7) newWidth = window.innerWidth * 0.7; // En fazla %70
                        
                        chatContainer.style.width = newWidth + 'px';
                        chatContainer.style.setProperty('width', newWidth + 'px', 'important');
                    });

                    document.addEventListener('mouseup', () => {
                        if (isDragging) {
                            isDragging = false;
                            document.body.classList.remove('is-dragging');
                            document.body.style.cursor = 'default';
                            
                            // Gizleme timer'ını tekrar başlat
                            showResizer();
                        }
                    });
                }
            }
        }, 1000);
    }
})();
