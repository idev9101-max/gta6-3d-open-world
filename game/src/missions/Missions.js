// SOLMAR NIGHTS - mission definitions (3-mission arc) as data.

var Missions = function (game) {
    this.game = game;
    this.list = [
        {
            id: 0,
            name: 'The Drop-Off',
            briefing: 'Pick up the package from the docks and bring it to the garage. Do not attract attention.',
            type: 'drive',
            target: { x: -140, z: -140 },
            payout: 500,
            timeLimit: null
        },
        {
            id: 1,
            name: 'Checkpoint Run',
            briefing: 'Race through all checkpoints before the timer runs out. Watch for traffic.',
            type: 'checkpoints',
            checkpoints: [
                { x: 120, z: -40 },
                { x: 120, z: 120 },
                { x: -120, z: 120 },
                { x: -120, z: -120 }
            ],
            payout: 800,
            timeLimit: 90
        },
        {
            id: 2,
            name: 'Heat Wave',
            briefing: 'Survive 60 seconds at 3 wanted stars. The police are coming for everything.',
            type: 'survive',
            wantedLevel: 3,
            duration: 60,
            payout: 1500
        }
    ];
    this.get = function (id) { return this.list[id]; };
    this.count = function () { return this.list.length; };
};
