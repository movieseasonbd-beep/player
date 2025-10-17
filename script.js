:root {
    --theme-color: #2ecc71;
    --progress-bar-height: 4px;
}
body { margin: 0; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; color: white; overflow: hidden; }
.player-container { width: 100vw; height: 100vh; position: relative; background-color: #000; display: flex; justify-content: center; align-items: center; }
.player-container.playing .central-play-btn { opacity: 0; visibility: hidden; }
.player-container:not(.playing) .central-play-btn { opacity: 1; visibility: visible; }
.player-container:hover .controls-container, .player-container.paused .controls-container { opacity: 1; transform: translateY(0); }
.video { width: 100%; height: auto; max-height: 100vh; display: block; }

.central-play-btn {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%); z-index: 2;
    cursor: pointer; font-size: 60px; color: var(--theme-color);
    opacity: 0; visibility: hidden; transition: opacity 0.2s ease, transform 0.2s ease;
    text-shadow: 0 0 15px rgba(0,0,0,0.5);
}
.central-play-btn:hover { transform: translate(-50%, -50%) scale(1.1); }

.controls-container { position: absolute; bottom: 0; left: 0; width: 100%; box-sizing: border-box; padding: 5px 25px 15px 25px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); z-index: 4; opacity: 0; transform: translateY(100%); transition: opacity 0.25s ease, transform 0.25s ease; }

/* থাম্ব ছাড়া নতুন প্রোগ্রেস বার */
.progress-range { width: 100%; padding: 10px 0; cursor: pointer; position: relative; }
.progress-background, .buffer-bar, .progress-filled { position: absolute; left: 0; top: 50%; transform: translateY(-50%); height: var(--progress-bar-height); border-radius: 5px; pointer-events: none; }
.progress-background { width: 100%; background: rgba(255, 255, 255, 0.3); }
.buffer-bar { background: rgba(255, 255, 255, 0.5); width: 0; transition: width 0.1s linear; }
.progress-filled { background: var(--theme-color); width: 0; }

.control-group { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; }
.controls-left, .controls-right { display: flex; align-items: center; gap: 25px; }

/* সলিড কন্ট্রোল আইকন */
.control-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0; transition: transform 0.1s ease; position: relative; }
.control-btn i { font-weight: 900; } /* আইকন বোল্ড করার জন্য */
.control-btn:hover { transform: scale(1.1); }

/* রিওয়াইন্ড/ফরোয়ার্ড বাটনের সঠিক ডিজাইন */
.seek-btn {
    width: 32px; height: 32px; border: 2px solid white;
    border-radius: 50%; display: flex;
    justify-content: center; align-items: center;
    position: relative;
}
.seek-btn span { font-size: 12px; font-weight: 600; }
.seek-btn::before {
    font-family: "Font Awesome 6 Free"; font-weight: 900;
    position: absolute; font-size: 16px; top: -3px; color: white;
}
#rewind-btn::before { content: "\e2ea"; left: 1px; }
#forward-btn::before { content: "\e2e8"; right: 1px; }

.time-display { font-size: 14px; user-select: none; }
#fullscreen-btn.active i::before { content: '\f066'; }

.settings-menu { position: absolute; bottom: 85px; right: 20px; background-color: rgba(40, 40, 40, 0.9); border-radius: 8px; z-index: 5; width: 200px; padding: 10px; opacity: 0; visibility: hidden; transition: opacity 0.2s ease, transform 0.2s ease; transform: translateY(10px); }
.settings-menu.active { opacity: 1; visibility: visible; transform: translateY(0); }
.menu-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 16px; font-weight: bold; }
.menu-header i { margin-right: 8px; }
.close-btn { background: none; border: none; color: white; font-size: 18px; cursor: pointer; }
.settings-menu ul { list-style: none; margin: 0; padding: 0; }
.settings-menu li { padding: 8px 12px; cursor: pointer; border-radius: 4px; transition: background-color 0.2s ease; }
.settings-menu li:hover { background-color: rgba(255, 255, 255, 0.1); }
.settings-menu li.active { color: var(--theme-color); font-weight: bold; }
