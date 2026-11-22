// SOLMAR NIGHTS: game bootstrap — URL params (probe/autotest/scene), DOM-ready Game start.
// Main entry point - bootstrap the game
// Initializes global error handling and starts the Game instance
(function() {
    'use strict';
    
    // Check for required globals
    const REQUIRED_GLOBALS = [
        'THREE', 'MathUtils', 'ObjectPool', 'PoolManager', 'SaveLoad',
        'InputManager', 'AudioManager', 'CameraController', 'Game',
        'RoadNetwork', 'BuildingGenerator', 'Ocean', 'CityGenerator', 'World',
        'Player', 'Car', 'TrafficCar', 'Pedestrian', 'PoliceCar', 'PolicePed',
        'Weapons', 'WeaponManager', 'EffectsManager',
        'Missions', 'MissionMarker', 'MissionManager',
        'SkySystem', 'LightingSystem', 'Minimap',
        'HUD', 'TitleScreen', 'PauseMenu', 'HowToPlay', 'MissionUI'
    ];
    
    const missing = REQUIRED_GLOBALS.filter(g => !(g in window));
    if (missing.length > 0) {
        console.error('Missing globals:', missing);
        document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace">Missing modules: ' + missing.join(', ') + '</div>';
        return;
    }
    
    console.log('All modules loaded. Starting SOLMAR NIGHTS...');
    
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const autoTest = params.has('autotest');
    const sceneParam = params.get('scene');
    
    if (autoTest) {
        console.log('AUTO-TEST MODE ENABLED');
        document.body.setAttribute('data-autotest', 'true');
    }
    if (sceneParam) {
        console.log('SCENE JUMP:', sceneParam);
        document.body.setAttribute('data-scene', sceneParam);
    }
    
    // Initialize game when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGame);
    } else {
        initGame();
    }
    
    function initGame() {
        try {
            // Create game instance
            window.game = new Game();
            
            // Expose for debugging
            window.gameInstance = window.game;
            
            console.log('SOLMAR NIGHTS initialized successfully');
            
            // Error handling
            window.addEventListener('error', (e) => {
                console.error('Runtime error:', e.error);
            });
            
            window.addEventListener('unhandledrejection', (e) => {
                const reason = e.reason;
                const stack = reason && reason.stack ? reason.stack : String(reason);
                console.error('REJ:', stack);
            });
            
        } catch (e) {
            console.error('Failed to initialize game:', e);
            document.body.innerHTML = '<div style="color:red;padding:20px;font-family:monospace">Initialization failed: ' + e.message + '<br><pre>' + e.stack + '</pre></div>';
        }
    }
    
    // Expose init for manual testing
    window.initGame = initGame;
})();