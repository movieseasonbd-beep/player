document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================
    // === DOM Elements (সকল এইচটিএমএল এলিমেন্ট) ===
    // ==========================================================
    const playerContainer = document.querySelector('.player-container');
    const loadingOverlay = document.querySelector('.loading-overlay');
    const video = document.querySelector('.video');
    const controlsContainer = document.querySelector('.controls-container');
    const centralPlayBtn = document.querySelector('.central-play-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const volumeBtn = document.getElementById('volume-btn');
    const progressBar = document.querySelector('.progress-bar');
    const progressFilled = document.querySelector('.progress-filled');
    const bufferBar = document.querySelector('.buffer-bar');
    const timeDisplay = document.querySelector('.time-display');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.querySelector('.settings-menu');
    const menuContentWrapper = document.querySelector('.menu-content-wrapper');
    const mainSettingsPage = document.querySelector('.menu-main');
    const speedSettingsPage = document.querySelector('.menu-speed');
    const qualitySettingsPage = document.querySelector('.menu-quality');
    const speedMenuBtn = document.getElementById('speed-menu-btn');
    const playerSettingsGroup = document.getElementById('player-settings-group');
    const speedOptionsList = document.getElementById('speed-options-list');
    const qualityOptionsList = document.getElementById('quality-options-list');
    const backBtns = document.querySelectorAll('.back-btn');
    const speedCurrentValue = speedMenuBtn.querySelector('.current-value');

    // ==========================================================
    // === ভেরিয়েবলস (প্রয়োজনীয় চলক) ===
    // ==========================================================
    let hls;
    let controlsTimeout;
    let isScrubbing = false;
    let wasPlayingBeforeScrub = false;

    // ==========================================================
    // === HLS.js সেটাপ এবং ম্যানেজমেন্ট ===
    // ==========================================================
    function setupHls(url) {
        if (hls) {
            hls.destroy();
        }
        
        const hlsConfig = {
            // এই কনফিগারেশনগুলো নেটওয়ার্ক সমস্যা থেকে রিকভার করতে সাহায্য করে
            fragLoadRetry: 4,
            fragLoadRetryDelay: 1000,
        };

        hls = new Hls(hlsConfig);
        hls.loadSource(url);
        hls.attachMedia(video);

        // সকল HLS ইভেন্ট এখানে যুক্ত করা হলো
        hls.on(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
        hls.on(Hls.Events.LEVEL_SWITCHED, handleLevelSwitched);
        hls.on(Hls.Events.ERROR, handleHlsError);
    }
    
    function handleHlsError(event, data) {
        if (data.fatal) {
            console.error('Fatal HLS Error:', data);
            switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                    console.warn('Network error, trying to recover by starting load.');
                    hls.startLoad();
                    break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                     console.warn('Media error, trying to recover.');
                    hls.recoverMediaError();
                    break;
                default:
                    console.error('Unrecoverable HLS error, destroying instance.');
                    hls.destroy();
                    break;
            }
        }
    }

    // ==========================================================
    // === কোয়ালিটি মেনু এবং ম্যানেজমেন্ট ===
    // ==========================================================
    function handleManifestParsed(event, data) {
        // যদি একাধিক কোয়ালিটি লেভেল পাওয়া যায়
        if (data.levels.length > 1) {
            // যদি কোয়ালিটি বাটন আগে থেকে না থাকে, তাহলে তৈরি করুন
            if (!document.getElementById('quality-menu-btn')) {
                const qualityMenuBtn = document.createElement('li');
                qualityMenuBtn.id = 'quality-menu-btn';
                qualityMenuBtn.innerHTML = `
                    <div class="menu-item-label">
                        <svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 12c0-.23-.01-.45-.03-.68l1.86-1.41c.4-.3.51-.86.26-1.3l-1.87-3.23c-.25-.44-.79-.61-1.25-.42l-2.15.91c-.39-.31-.82-.58-1.28-.79l-.31-2.3c-.08-.5-.52-.88-1.03-.88H9.3c-.51 0-.95.38-1.03.88l-.31 2.3c-.46.21-.89.48-1.28.79l-2.15-.91c-.46-.19-1-.01-1.25.42L1.41 8.61c-.25.44-.14 1 .26 1.3l1.86 1.41c-.02.23-.03.45-.03.68s.01.45.03.68l-1.86 1.41c-.4.3-.51.86-.26 1.3l1.87 3.23c.25.44.79.61 1.25.42l2.15-.91c.39.31.82.58 1.28.79l.31 2.3c.08.5.52.88 1.03.88h3.4c.51 0 .95-.38 1.03-.88l.31-2.3c.46-.21.89-.48 1.28-.79l2.15.91c.46.19 1 .01 1.25-.42l1.87-3.23c.25-.44.14-1-.26-1.3l-1.86-1.41c.02-.23.03-.45.03-.68zm-7.5 3.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"></path></svg>
                        <span>Quality</span>
                    </div>
                    <div class="menu-item-value">
                        <span class="current-value">Auto</span>
                        <svg class="arrow-right" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"></path></svg>
                    </div>`;
                qualityMenuBtn.addEventListener('click', () => showMenuPage(qualitySettingsPage));
                playerSettingsGroup.prepend(qualityMenuBtn);
            }

            // কোয়ালিটি লিস্ট পরিষ্কার করে নতুন করে অপশন যোগ করুন
            qualityOptionsList.innerHTML = '';
            // Auto অপশন
            const autoOption = document.createElement('li');
            autoOption.textContent = 'Auto';
            autoOption.dataset.level = -1; // -1 মানে Auto
            autoOption.classList.add('active');
            autoOption.addEventListener('click', () => setQuality(-1));
            qualityOptionsList.appendChild(autoOption);
            // অন্যান্য কোয়ালিটি অপশন
            data.levels.forEach((level, index) => {
                const option = document.createElement('li');
                option.textContent = `${level.height}p`;
                option.dataset.level = index;
                option.addEventListener('click', () => setQuality(index));
                qualityOptionsList.appendChild(option);
            });
        }
    }
    
    function setQuality(level) {
        if (hls) {
            hls.currentLevel = parseInt(level, 10);
            
            // UI আপডেট করুন
            const allOptions = qualityOptionsList.querySelectorAll('li');
            allOptions.forEach(opt => opt.classList.remove('active'));
            const selectedOption = qualityOptionsList.querySelector(`li[data-level="${level}"]`);
            if (selectedOption) {
                selectedOption.classList.add('active');
            }
            showMenuPage(mainSettingsPage);
        }
    }
    
    function handleLevelSwitched(event, data) {
        if (!hls) return;
        const qualityMenuBtn = document.getElementById('quality-menu-btn');
        if (!qualityMenuBtn) return;
        const qualityCurrentValue = qualityMenuBtn.querySelector('.current-value');
        
        // যদি Auto মোডে থাকে, তাহলে বর্তমান কোয়ালিটি দেখান
        if (hls.autoLevelEnabled) {
            const currentLevel = hls.levels[data.level];
            if (currentLevel) {
                qualityCurrentValue.textContent = `${currentLevel.height}p (Auto)`;
            }
        } else {
            // যদি ম্যানুয়াল মোডে থাকে
            const selectedLevel = hls.levels[hls.currentLevel];
            if (selectedLevel) {
                 qualityCurrentValue.textContent = `${selectedLevel.height}p`;
            }
        }
    }
    
    // ==========================================================
    // === প্লেয়ার কন্ট্রোলস ফাংশন ===
    // ==========================================================
    const hideLoadingScreen = () => {
        if (!loadingOverlay.classList.contains('hidden')) {
            loadingOverlay.classList.add('hidden');
        }
    };

    function togglePlayPause() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    function updatePlayPauseIcon() {
        const isPaused = video.paused;
        playPauseBtn.querySelector('.play-icon').style.display = isPaused ? 'block' : 'none';
        playPauseBtn.querySelector('.pause-icon').style.display = isPaused ? 'none' : 'block';
        centralPlayBtn.style.display = isPaused ? 'flex' : 'none';
        playerContainer.classList.toggle('paused', isPaused);
    }

    function skip(duration) {
        video.currentTime += duration;
    }
    
    function toggleMute() {
        video.muted = !video.muted;
    }

    function updateVolumeIcon() {
        const isMuted = video.muted || video.volume === 0;
        volumeBtn.querySelector('.volume-on-icon').style.display = isMuted ? 'none' : 'block';
        volumeBtn.querySelector('.volume-off-icon').style.display = isMuted ? 'block' : 'none';
    }

    function formatTime(timeInSeconds) {
        if (isNaN(timeInSeconds)) return '00:00';
        const result = new Date(timeInSeconds * 1000).toISOString().substr(11, 8);
        return {
            "00:": "",
        }[result.substr(0, 3)] ?? result;
    }

    function updateProgress() {
        if (isScrubbing) return;
        const progressPercent = (video.currentTime / video.duration) * 100;
        progressFilled.style.width = `${progressPercent}%`;
        progressBar.value = progressPercent;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;

        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            bufferBar.style.width = `${(bufferedEnd / video.duration) * 100}%`;
        }
    }

    function toggleFullscreen() {
        if (document.fullscreenElement == null) {
            playerContainer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    function updateFullscreenIcon() {
        const isFullscreen = !!document.fullscreenElement;
        fullscreenBtn.querySelector('.fullscreen-on-icon').style.display = isFullscreen ? 'none' : 'block';
        fullscreenBtn.querySelector('.fullscreen-off-icon').style.display = isFullscreen ? 'block' : 'none';
    }

    function handleScrubbing(e) {
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
        const scrubTime = percent * video.duration;
        video.currentTime = scrubTime;
        progressFilled.style.width = `${percent * 100}%`;
    }

    function showControls() {
        playerContainer.classList.add('show-controls');
        resetControlsTimer();
    }

    function hideControls() {
        if (video.paused || isScrubbing || settingsMenu.classList.contains('active')) return;
        playerContainer.classList.remove('show-controls');
    }

    function resetControlsTimer() {
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(hideControls, 3000);
    }

    function showMenuPage(pageToShow) {
        const allPages = settingsMenu.querySelectorAll('.menu-page');
        allPages.forEach(p => p.classList.remove('active', 'slide-out-left', 'slide-out-right'));
        
        if (pageToShow === mainSettingsPage) {
            speedSettingsPage.classList.add('slide-out-right');
            qualitySettingsPage.classList.add('slide-out-right');
        } else {
            mainSettingsPage.classList.add('slide-out-left');
        }
        
        pageToShow.classList.add('active');
        menuContentWrapper.style.height = `${pageToShow.scrollHeight}px`;
    }

    // ==========================================================
    // === ইভেন্ট লিসেনারস ===
    // ==========================================================
    playPauseBtn.addEventListener('click', togglePlayPause);
    centralPlayBtn.addEventListener('click', togglePlayPause);
    video.addEventListener('click', () => {
        if (window.innerWidth < 768) { // শুধুমাত্র মোবাইল ডিভাইসে ট্যাপে প্লে/পজ
            togglePlayPause();
        }
    });

    video.addEventListener('play', updatePlayPauseIcon);
    video.addEventListener('pause', updatePlayPauseIcon);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', () => {
        timeDisplay.textContent = `00:00 / ${formatTime(video.duration)}`;
    });
    // ভিডিও লোড শুরু হলে বাফার আপডেট করুন
    video.addEventListener('progress', updateProgress);

    rewindBtn.addEventListener('click', () => skip(-10));
    forwardBtn.addEventListener('click', () => skip(10));
    
    volumeBtn.addEventListener('click', toggleMute);
    video.addEventListener('volumechange', updateVolumeIcon);
    
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    // প্রোগ্রেস বার স্ক্রাবিং
    progressBar.addEventListener('mousedown', (e) => {
        isScrubbing = true;
        wasPlayingBeforeScrub = !video.paused;
        if (wasPlayingBeforeScrub) video.pause();
        handleScrubbing(e);

        document.addEventListener('mousemove', handleScrubbing);
        document.addEventListener('mouseup', () => {
            document.removeEventListener('mousemove', handleScrubbing);
            isScrubbing = false;
            if (wasPlayingBeforeScrub) video.play();
        }, { once: true });
    });

    // কন্ট্রোলস দেখানো/লুকানো
    playerContainer.addEventListener('mousemove', showControls);
    playerContainer.addEventListener('mouseleave', hideControls);

    // সেটিংস মেনু
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsMenu.classList.toggle('active');
        settingsBtn.classList.toggle('active', settingsMenu.classList.contains('active'));
        if (settingsMenu.classList.contains('active')) {
            showMenuPage(mainSettingsPage);
        }
    });
    
    speedMenuBtn.addEventListener('click', () => showMenuPage(speedSettingsPage));
    backBtns.forEach(btn => btn.addEventListener('click', () => showMenuPage(mainSettingsPage)));

    speedOptionsList.querySelectorAll('li').forEach(option => {
        option.addEventListener('click', () => {
            const speed = parseFloat(option.dataset.speed);
            video.playbackRate = speed;
            speedCurrentValue.textContent = option.textContent;
            speedOptionsList.querySelector('.active').classList.remove('active');
            option.classList.add('active');
            showMenuPage(mainSettingsPage);
        });
    });

    // ==========================================================
    // === প্লেয়ার শুরু করার মূল ফাংশন ===
    // ==========================================================
    function initializePlayer() {
        const urlParams = new URLSearchParams(window.location.search);
        const videoUrl = urlParams.get('id');

        if (!videoUrl) {
            console.error("URL-এ কোনো ভিডিও আইডি (id) পাওয়া যায়নি।");
            loadingOverlay.querySelector('.loading-maintext').textContent = "Video Not Found";
            return;
        }

        if (Hls.isSupported() && videoUrl.includes('.m3u8')) {
            setupHls(videoUrl);
        } else {
            video.src = videoUrl;
        }
        
        // ভিডিও ডেটা লোড হওয়ার জন্য অপেক্ষা করুন
        video.addEventListener('loadeddata', hideLoadingScreen, { once: true });
        // যদি ৫ সেকেন্ডের মধ্যে লোড না হয়, তাও লোডিং স্ক্রিন সরিয়ে দিন
        setTimeout(hideLoadingScreen, 5000);

        // প্রাথমিক অবস্থা সেট করুন
        updatePlayPauseIcon();
        updateVolumeIcon();
        updateFullscreenIcon();
    }

    // প্লেয়ার শুরু করুন
    initializePlayer();
});```
